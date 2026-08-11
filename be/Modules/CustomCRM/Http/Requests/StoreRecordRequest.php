<?php

namespace Modules\CustomCRM\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *     schema="StoreRecordRequest",
 *     required={"table_name", "attributes"},
 *     type="object",
 *     description="Request body for creating a new dynamic table with custom attributes",
 *
 *     @OA\Property(
 *         property="table_name",
 *         type="string",
 *         example="leads_tables1",
 *         description="The base name of the table to be created"
 *     ),
 *     @OA\Property(
 *         property="attributes",
 *         type="array",
 *         description="List of attributes (columns) to be created in the table",
 *
 *         @OA\Items(
 *             type="object",
 *             required={"name", "type"},
 *
 *             @OA\Property(
 *                 property="name",
 *                 type="string",
 *                 example="lead_id",
 *                 description="The column name"
 *             ),
 *             @OA\Property(
 *                 property="type",
 *                 type="string",
 *                 enum={"string", "integer", "float", "date", "datetime", "boolean", "text"},
 *                 example="integer",
 *                 description="The column data type"
 *             ),
 *             @OA\Property(
 *                 property="is_nullable",
 *                 type="boolean",
 *                 example=true,
 *                 description="Whether the column can be null"
 *             ),
 *             @OA\Property(
 *                 property="is_foreign",
 *                 type="boolean",
 *                 example=true,
 *                 description="Whether the column is a foreign key"
 *             ),
 *             @OA\Property(
 *                 property="foreign_table_name",
 *                 type="string",
 *                 nullable=true,
 *                 example="leads_tables1",
 *                 description="The related table name if is_foreign is true"
 *             )
 *         )
 *     ),
 *     example={
 *         "table_name": "leads_tables1",
 *         "attributes": {
 *             {
 *                 "name": "lead_id",
 *                 "type": "integer",
 *                 "is_nullable": true,
 *                 "is_foreign": true,
 *                 "foreign_table_name": "leads_tables1"
 *             },
 *             {
 *                 "name": "name",
 *                 "type": "string",
 *                 "is_nullable": true,
 *                 "is_foreign": false,
 *                 "foreign_table_name": null
 *             }
 *         }
 *     }
 * )
 */
class StoreRecordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

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

    public function rules(): array
    {
        $hostId = $this->resolveActiveHostId();

        return [
            'table_name' => [
                'required',
                'string',
                Rule::unique('custom_tables', 'name')
                    ->where(function ($query) use ($hostId) {
                        return $query->where('host_id', $hostId);
                    }),
            ],
            'attributes' => 'required|array|min:1',
            'attributes.*.name' => 'required|string',
            'attributes.*.type' => 'required|string|in:string,integer,float,date,datetime,boolean,text',
            'attributes.*.is_nullable' => 'nullable|boolean',
            'attributes.*.is_foreign' => 'nullable|boolean',
            'attributes.*.foreign_table_name' => 'nullable|string|required_if:attributes.*.is_foreign,true',
        ];
    }

    /**
     * Handle failed validation with JSON response.
     */
    protected function failedValidation(Validator $validator)
    {
        Log::warning('StoreRecordRequest failed', [
            'errors' => $validator->errors()->toArray(),
            'input' => $this->all(),
        ]);

        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => 'Validation error',
            'errors' => $validator->errors(),
        ], 422));
    }
}
