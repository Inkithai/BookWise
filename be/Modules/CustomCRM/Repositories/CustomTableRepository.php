<?php

namespace Modules\CustomCRM\Repositories;

use App\Models\LeadStatus;
use Exception;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Modules\CustomCRM\Models\CustomAttribute;
use Modules\CustomCRM\Models\CustomTable;
use Modules\User\Models\User;

class CustomTableRepository implements CustomTableInterface
{
    private function resolveActiveHostId(): int
    {
        $user = auth()->user();
        if (
            (string) ($user->active_context_type ?? 'personal') === 'company'
            && !empty($user->active_company_id)
        ) {
            $company = \App\Models\Company::where('id', (int) $user->active_company_id)
                ->where('owner_user_id', $user->id)
                ->first();
            if ($company && $company->host_id) {
                return (int) $company->host_id;
            }
        }
        return (int) ($user->host_id ?? 0);
    }
    public function getTablesByHost($hostId)
    {
        return CustomTable::with('attributes')
            ->where('host_id', $hostId)
            ->get();
    }

    private function sanitizeTableName($name)
    {
        return strtolower(preg_replace('/[^a-zA-Z0-9_]/', '_', $name));
    }

    private function guessForeignTableName($columnName)
    {
        return \Str::plural(str_replace('_id', '', $columnName));
    }

    public function createTableWithAttributes(string $tableName, array $attributes, $hostId)
    {
        $systemFields = [
            ['name' => 'assigned_to', 'type' => 'unsignedBigInteger', 'is_nullable' => true],
            ['name' => 'status', 'type' => 'integer', 'is_nullable' => false],
            ['name' => 'lead_generated_at', 'type' => 'date', 'is_nullable' => false],
            ['name' => 'additional_information', 'type' => 'text', 'is_nullable' => true],
        ];

        $tableName = $this->sanitizeTableName($tableName);

        // Append host_id to table name
        $dbTableName = $tableName."_{$hostId}";

        if (Schema::hasTable($dbTableName)) {
            throw new \Exception("Table '{$dbTableName}' already exists.");
        }

        // Create CustomTable record with original table name
        $customTable = CustomTable::create([
            'name' => $tableName,
            'host_id' => $hostId,
        ]);

        Schema::create($dbTableName, function (Blueprint $table) use ($attributes, $customTable, $systemFields) {
            $table->id();

            foreach ($attributes as $attr) {
                $columnName = $attr['name'];
                if ($columnName === 'id') {
                    continue;
                }

                $columnType = $attr['type'] ?? 'string';
                $isNullable = $attr['is_nullable'] ?? false;
                $isForeign = $attr['is_foreign'] ?? false;
                $foreignTableName = null;

                if ($isForeign) {
                    $foreignTableName = $attr['foreign_table_name'] ?? $this->guessForeignTableName($columnName);

                    // ✅ 1. Append host suffix if it exists in DB
                    $hostedTable = "{$foreignTableName}_{$customTable->host_id}";
                    if (Schema::hasTable($hostedTable)) {
                        $foreignTableName = $hostedTable;
                    } elseif (! Schema::hasTable($foreignTableName)) {
                        // ✅ 2. Fail early if table doesn't exist at all
                        throw new \Exception("Referenced table '{$foreignTableName}' does not exist for foreign key '{$columnName}'.");
                    }

                    // ✅ 3. Create foreign key safely
                    $column = $table->unsignedBigInteger($columnName);
                    if ($isNullable) {
                        $column->nullable();
                    }

                    $table->foreign($columnName)
                        ->references('id')
                        ->on($foreignTableName)
                        ->onDelete('cascade');
                } else {
                    $column = $table->{$columnType}($columnName);
                    if ($isNullable) {
                        $column->nullable();
                    }
                }

                CustomAttribute::create([
                    'custom_table_id' => $customTable->id,
                    'name' => $columnName,
                    'type' => $columnType,
                    'is_nullable' => (bool) $isNullable,
                    'is_foreign' => (bool) $isForeign,
                    'foreign_table_name' => $foreignTableName,
                ]);
            }

            foreach ($systemFields as $field) {
                $column = $table->{$field['type']}($field['name']);
                if ($field['is_nullable']) {
                    $column->nullable();
                }

                CustomAttribute::create([
                    'custom_table_id' => $customTable->id,
                    'name' => $field['name'],
                    'type' => $field['type'],
                    'is_nullable' => $field['is_nullable'],
                    'is_foreign' => false,
                    'foreign_table_name' => false,
                ]);
            }

            $table->timestamps();
        });

        return collect([
            CustomTable::with('attributes')->find($customTable->id),
        ]);
    }

    public function uploadCsvAndCreate($request, $hostId)
    {
        $file = $request->file('csv_file');
        $tableName = $this->sanitizeTableName($request->input('table_name'));

        // ✅ Append hostId to make the table unique
        $dbTableName = "{$tableName}_{$hostId}";

        if (Schema::hasTable($tableName)) {
            throw new Exception("Table '{$tableName}' already exists.");
        }

        $data = array_map('str_getcsv', file($file));
        $headers = array_map('trim', $data[0]);
        $rows = array_slice($data, 1);

        $customTable = CustomTable::create([
            'name' => $tableName,
            'host_id' => $hostId,
        ]);

        $columnDefinitions = [];
        foreach ($headers as $index => $header) {
            $columnName = $this->sanitizeTableName($header);
            $sampleValues = array_column($rows, $index);
            $columnType = $this->inferColumnType($sampleValues);
            $isNullable = $this->hasNullValues($sampleValues);

            $columnDefinitions[] = compact('columnName', 'columnType', 'isNullable');

            CustomAttribute::create([
                'custom_table_id' => $customTable->id,
                'name' => $columnName,
                'type' => $columnType,
                'is_nullable' => $isNullable,
            ]);
        }

        $systemFields = [
            ['name' => 'assigned_to', 'type' => 'integer', 'is_nullable' => true],
            ['name' => 'status', 'type' => 'integer', 'is_nullable' => false],
            ['name' => 'lead_generated_at', 'type' => 'date', 'is_nullable' => true],
            ['name' => 'additional_information', 'type' => 'text', 'is_nullable' => true],
        ];

        foreach ($systemFields as $field) {
            CustomAttribute::create(array_merge(['custom_table_id' => $customTable->id], $field));
        }

        Schema::create($dbTableName, function (Blueprint $table) use ($columnDefinitions) {
            $table->id();

            foreach ($columnDefinitions as $col) {
                $field = match ($col['columnType']) {
                    'integer' => $table->integer($col['columnName']),
                    'float' => $table->float($col['columnName']),
                    'datetime' => $table->dateTime($col['columnName']),
                    'date' => $table->date($col['columnName']),
                    'boolean' => $table->boolean($col['columnName']),
                    'char' => $table->char($col['columnName'], 1),
                    'array', 'tuple', 'set', 'dictionary' => $table->json($col['columnName']),
                    default => $table->string($col['columnName']),
                };

                if ($col['isNullable']) {
                    $field->nullable();
                }
            }

            $table->unsignedBigInteger('assigned_to')->nullable();
            $table->integer('status')->default(1);
            $table->timestamp('lead_generated_at')->useCurrent();
            $table->text('additional_information')->nullable();

            $table->timestamps();
        });

        foreach ($rows as $row) {
            $rowAssoc = array_combine($headers, array_map('trim', $row));
            $rowAssoc += [
                'assigned_to' => null,
                'status' => 1,
                'lead_generated_at' => now()->toDateString(),
                'additional_information' => null,
            ];

            DB::table($dbTableName)->insert($rowAssoc);
        }

        // ✅ Return table WITH attributes
        return $customTable->load('attributes');
    }

  public function inferColumnType($values)
{
    $values = array_filter($values); // remove blanks

    foreach ($values as $value) {
        $value = trim($value);

        // 🔹 Convert empty/null-ish
        if ($value === '' || $value === '?' || strtolower($value) === 'null') {
            continue;
        }

        // 🔹 If contains both letters and numbers → string (e.g., S1, A23)
        if (preg_match('/[A-Za-z]/', $value) && preg_match('/\d/', $value)) {
            return 'string';
        }

        // 🔹 If contains letters → string
        if (preg_match('/[A-Za-z]/', $value)) {
            return 'string';
        }

        // 🔹 Numeric detection
        if (is_numeric($value)) {
            return str_contains($value, '.') ? 'float' : 'integer';
        }

        // 🔹 Strict date detection (YYYY-MM-DD or DD-MM-YYYY)
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return 'date';
        }

        if (preg_match('/^\d{2}-\d{2}-\d{4}$/', $value)) {
            return 'date';
        }

        // 🔹 Datetime detection (YYYY-MM-DD HH:MM:SS)
        if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $value)) {
            return 'datetime';
        }
    }

    return 'string';
}


    private function hasNullValues(array $values): bool
    {
        return in_array(null, $values) || in_array('', $values, true);
    }

    public function uploadExtraCsv($request, int $hostId)
    {
        $file = $request->file('extra_csv');
        $tableName = $this->sanitizeTableName($request->input('reference_table'));

        if (Schema::hasTable($tableName)) {
            throw new Exception("Table '{$tableName}' already exists.");
        }

        $data = array_map('str_getcsv', file($file));
        $headers = array_map('trim', $data[0]);
        $rows = array_slice($data, 1);

        Schema::create($tableName, function ($table) use ($headers) {
            $table->id();
            foreach ($headers as $header) {
                $table->string($this->sanitizeTableName($header))->nullable();
            }
            $table->timestamps();
        });

        foreach ($rows as $row) {
            DB::table($tableName)->insert(array_combine($headers, array_map('trim', $row)));
        }

        return true;
    }

    public function getTableAttributes($tableId)
    {
        // Eager load attributes in one query
        return CustomTable::with('attributes')->findOrFail($tableId);
    }

    public function getTableRecords($tableId, $search = null, $hostId = null)
    {
        $table = CustomTable::where('host_id', $hostId)
            ->findOrFail($tableId);

        // Append host_id to get actual DB table name
        $dbTableName = $table->name."_{$hostId}";

        if (! Schema::hasTable($dbTableName)) {
            throw new \Exception("Table '{$dbTableName}' does not exist.");
        }

        $attributes = CustomAttribute::where('custom_table_id', $tableId)->get();
        $statusList = LeadStatus::all();

        // Get users by host
        $users = User::where('host_id', $hostId)
            ->whereHas('roles', function ($query) {
                $query->where('name', 'LIKE', '%lead%')
                    ->orWhere('name', 'LIKE', '%admin%');
            })
            ->select('id', 'first_name', 'last_name')
            ->get();

        // Add super admin if needed
        if ($hostId == 1 && ! $users->contains('id', 1)) {
            $superAdmin = User::select('id', 'first_name', 'last_name')->find(1);
            if ($superAdmin) {
                $users->push($superAdmin);
            }
        }

        $query = DB::table($dbTableName)->orderByDesc('id');

        $records = $query->get();

        // Format records
        $formatted = $records->map(function ($row) use ($attributes, $users, $statusList) {
            $record = (array) $row;

            // assigned_to
            $user = $users->firstWhere('id', $row->assigned_to);
            $record['assigned_to'] = $user ? $user->first_name.' '.$user->last_name : '';

            // status
            $status = $statusList->find($row->status);
            $record['status'] = $status ? $status->name : '';

            // attribute formatting
            foreach ($attributes as $attr) {
                $value = $row->{$attr->name} ?? null;
                switch ($attr->type) {
                    case 'boolean':
                        $record[$attr->name] = in_array(strtolower(trim((string) $value)), ['true', '1', 'yes']) ? 'Yes' : 'No';
                        break;
                    case 'array':
                    case 'tuple':
                    case 'set':
                    case 'dictionary':
                        $decoded = json_decode($value, true);
                        $record[$attr->name] = $decoded !== null ? $decoded : $value;
                        break;
                    case 'date':
                    case 'datetime':
                        if ($value && strtotime($value) !== false) {
                            $format = $attr->type === 'datetime' ? 'Y-m-d H:i:s' : 'Y-m-d';
                            $record[$attr->name] = date($format, strtotime($value));
                        }
                        break;
                }
            }

            return $record;
        });

        return [
            'table' => [
                'id' => $table->id,
                'name' => $table->name,
            ],
            'attributes' => $attributes,
            'data' => $formatted,
        ];
    }

    public function updateTableWithAttributes($customTable, array $attributes, string $tableName, $hostId)
    {
        // Append hostId to table name
        $dbTableName = $tableName."_{$hostId}";

        // Rename table if needed
        if ($customTable->name."_{$customTable->host_id}" !== $dbTableName) {
            if (Schema::hasTable($customTable->name."_{$customTable->host_id}")) {
                Schema::rename($customTable->name."_{$customTable->host_id}", $dbTableName);
            }
            $customTable->name = $tableName;
            $customTable->host_id = $hostId;
            $customTable->save();
        }

        foreach ($attributes as $attr) {
            $existingAttr = CustomAttribute::where('custom_table_id', $customTable->id)
                ->where('name', $attr['name'])
                ->first();

            $foreignTableName = $attr['is_foreign'] ?? false ? $attr['foreign_table_name'] : null;

            if ($existingAttr) {
                $existingAttr->update([
                    'type' => $attr['type'],
                    'is_nullable' => $attr['is_nullable'] ?? false,
                    'is_foreign' => $attr['is_foreign'] ?? false,
                    'foreign_table_name' => $foreignTableName,
                ]);
            } else {
                CustomAttribute::create([
                    'custom_table_id' => $customTable->id,
                    'name' => $attr['name'],
                    'type' => $attr['type'],
                    'is_nullable' => $attr['is_nullable'] ?? false,
                    'is_foreign' => $attr['is_foreign'] ?? false,
                    'foreign_table_name' => $foreignTableName,
                ]);

                Schema::table($dbTableName, function (Blueprint $table) use ($attr, $foreignTableName) {
                    $column = $attr['is_foreign']
                        ? $table->unsignedBigInteger($attr['name'])
                        : $table->{$attr['type']}($attr['name']);

                    if ($attr['is_nullable'] ?? false) {
                        $column->nullable();
                    }

                    if ($attr['is_foreign']) {
                        $table->foreign($attr['name'])
                            ->references('id')
                            ->on($foreignTableName)
                            ->onDelete('cascade');
                    }
                });
            }
        }

        return $customTable->load('attributes');
    }

    public function deleteTable($customTable, $hostId)
    {
        // Tenant-aware table name
        $dbTableName = $customTable->name."_{$hostId}";

        // Drop the actual tenant table if exists
        if (Schema::hasTable($dbTableName)) {
            Schema::dropIfExists($dbTableName);
        }

        // Delete related attributes
        $customTable->attributes()->delete();

        // Delete the custom table record itself
        $customTable->delete();

        return true;
    }

    public function insertTableRecord($tableId, array $attributes)
    {
        $hostId = $this->resolveActiveHostId();

        // Ensure the table belongs to the current host
        $table = CustomTable::where('host_id', $hostId)
            ->findOrFail($tableId);

        $tableAttributes = CustomAttribute::where('custom_table_id', $tableId)->get();

        $data = [];

        foreach ($tableAttributes as $attr) {
            $fieldName = $attr->name;
            $value = $attributes[$fieldName] ?? null;

            // Required check
            if ($value === null && ! $attr->is_nullable) {
                throw new \Exception("Missing required field: {$fieldName}");
            }

            // Type handling
            switch ($attr->type) {
                case 'boolean':
                    $data[$fieldName] = in_array(strtolower(trim((string) $value)), ['true', '1', 'yes']) ? 1 : 0;
                    break;

                case 'array':
                case 'tuple':
                case 'set':
                case 'dictionary':
                    $data[$fieldName] = is_array($value) ? json_encode($value) : $value;
                    break;

                case 'date':
                case 'datetime':
                    if ($value && strtotime($value) !== false) {
                        $data[$fieldName] = date(
                            $attr->type === 'datetime' ? 'Y-m-d H:i:s' : 'Y-m-d',
                            strtotime($value)
                        );
                    }
                    break;

                default:
                    $data[$fieldName] = $value;
            }
        }

        // Insert into correct tenant table
        $dbTableName = $table->name."_{$hostId}";

        // If "id" is passed → update, else insert
        if (isset($attributes['id'])) {
            $id = $attributes['id'];
            DB::table($dbTableName)
                ->where('id', $id)
                ->update($data);
        } else {
            $id = DB::table($dbTableName)->insertGetId($data);
        }

        // Return updated records
        return DB::table($dbTableName)->orderBy('id', 'desc')->get();
    }
}
