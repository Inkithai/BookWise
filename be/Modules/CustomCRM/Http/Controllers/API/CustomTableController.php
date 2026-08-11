<?php

namespace Modules\CustomCRM\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\LeadStatus;
use App\Traits\LogsActivity;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Modules\CustomCRM\Http\Requests\StoreRecordRequest;
use Modules\CustomCRM\Http\Requests\UpdateCustomTableRequest;
use Modules\CustomCRM\Http\Requests\UploadCsvRequest;
use Modules\CustomCRM\Http\Resources\CustomTableRecordsResource;
use Modules\CustomCRM\Http\Resources\CustomTableResource;
use Modules\CustomCRM\Models\CustomTable;
use Modules\CustomCRM\Repositories\CustomTableInterface;
use Modules\User\Models\User;
use OpenApi\Annotations as OA;
use Throwable;

/**
 * @OA\Tag(
 *     name="CustomCRM",
 *     description="API Endpoints for Managing Custom CRM"
 * )
 */
class CustomTableController extends Controller
{
    use AuthorizesRequests;
    use LogsActivity;

    protected $customTableInterface;

    public function __construct(CustomTableInterface $customTableInterface)
    {
        $this->customTableInterface = $customTableInterface;

        // Ensure API auth
        $this->middleware('auth:api');
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

    /**
     * @OA\Get(
     *     path="/api/v1/admin/custom-crm",
     *     operationId="getCustomTables",
     *     tags={"CustomCRM"},
     *     summary="Get list of custom tables with attributes",
     *     description="Returns a paginated list of custom tables. Supports search, pagination, and draw sync.",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(
     *         name="search",
     *         in="query",
     *         description="Search term for table names",
     *         required=false,
     *
     *         @OA\Schema(type="string", example="leads")
     *     ),
     *
     *     @OA\Parameter(
     *         name="start",
     *         in="query",
     *         description="Paging offset",
     *         required=false,
     *
     *         @OA\Schema(type="integer", example=0)
     *     ),
     *
     *     @OA\Parameter(
     *         name="length",
     *         in="query",
     *         description="Number of records per page",
     *         required=false,
     *
     *         @OA\Schema(type="integer", example=10)
     *     ),
     *
     *     @OA\Parameter(
     *         name="draw",
     *         in="query",
     *         description="Draw counter for DataTables",
     *         required=false,
     *
     *         @OA\Schema(type="integer", example=1)
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Paginated list of custom tables",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="draw", type="integer", example=1),
     *             @OA\Property(property="recordsTotal", type="integer", example=100),
     *             @OA\Property(property="recordsFiltered", type="integer", example=50),
     *             @OA\Property(
     *                 property="data",
     *                 type="array",
     *
     *                 @OA\Items(ref="#/components/schemas/CustomTableResource")
     *             )
     *         )
     *     ),
     *
     *     @OA\Response(response=404, description="Resource not found", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function index(Request $request)
    {
        try {
            $this->authorize('custom.view', CustomTable::class);

            $hostId = $this->resolveActiveHostId();

            $search = $request->get('search');
            $length = $request->get('length', 10);
            $start = $request->get('start', 0);
            $draw = $request->get('draw', 1);

            $tables = $this->customTableInterface->getTablesByHost($hostId, $search);
            $total = $tables->count();
            $paginated = $tables->slice($start, $length)->values();

            return response()->json([
                'draw' => (int) $draw,
                'recordsTotal' => $total,
                'recordsFiltered' => $total,
                'data' => CustomTableResource::collection($paginated),
            ]);
        } catch (Throwable $e) {
            return $this->handleException($e, 'CustomTableController@index');
        }
    }

    /**
     * @OA\Post(
     *     path="/api/v1/admin/custom-crm/store",
     *     operationId="createCustomTables",
     *     tags={"CustomCRM"},
     *     summary="Create one or more custom tables with attributes",
     *     description="Creates one or more dynamic tables with columns based on user input.",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(ref="#/components/schemas/StoreRecordRequest")
     *     ),
     *
     *     @OA\Response(
     *         response=201,
     *         description="Tables created successfully",
     *
     *         @OA\JsonContent(
     *             type="object",
     *
     *             @OA\Property(property="message", type="string", example="Tables created successfully!"),
     *             @OA\Property(
     *                 property="data",
     *                 type="array",
     *
     *                 @OA\Items(ref="#/components/schemas/CustomTableResource")
     *             )
     *         )
     *     ),
     *
     *     @OA\Response(response=404, description="Resource not found", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function store(StoreRecordRequest $request): JsonResponse
    {
        try {
            $this->authorize('custom.create', CustomTable::class);

            $hostId = $this->resolveActiveHostId();

            $createdTables = $this->customTableInterface->createTableWithAttributes(
                $request->input('table_name'),
                $request->input('attributes'),
                $hostId
            );

            // 🧾 Log activity
            $this->logActivity(
                type: 'CustomCRM',
                action: 'CustomCRM Tables created',
                relatedId: $createdTables[0]->id ?? null,
                details: [
                    'status' => 'success',
                    'message' => 'CustomCRM Tables created successfully',
                    'data' => $createdTables->toArray(),
                ]
            );

            return response()->json([
                'message' => 'Tables created successfully!',
                'data' => CustomTableResource::collection($createdTables),
            ], 201);
        } catch (Throwable $e) {
            // ❌ Log unexpected failure
            $this->logActivity(
                'CustomCRM',
                'CustomCRM Tables Create Failed (Exception)',
                null,
                [
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ]
            );

            return $this->handleException($e, 'CustomTableController@store');
        }
    }

    /**
     * @OA\Put(
     *     path="/api/v1/admin/custom-crm/update/{tableId}/attributes",
     *     operationId="updateCustomTable",
     *     tags={"CustomCRM"},
     *     summary="Update a custom table and its attributes",
     *     description="Updates a table name and attributes, including foreign keys",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(
     *         name="tableId",
     *         in="path",
     *         required=true,
     *         description="Custom table ID"
     *     ),
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(ref="#/components/schemas/UpdateCustomTableRequest")
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Table updated successfully",
     *
     *         @OA\JsonContent(
     *             type="object",
     *
     *             @OA\Property(property="message", type="string", example="Table updated successfully!"),
     *             @OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/CustomTableResource"))
     *         )
     *     ),
     *
     *     @OA\Response(response=404, description="Resource not found", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function updateCustomTableRecords(UpdateCustomTableRequest $request, $tableId)
    {
        try {
            $hostId = $this->resolveActiveHostId();

            $customTable = CustomTable::where('host_id', $hostId)->findOrFail($tableId);

            $this->authorize('custom.edit', $customTable);

            $updatedTable = $this->customTableInterface->updateTableWithAttributes(
                $customTable,
                $request->input('attributes'),
                $request->input('table_name'),
                $hostId
            );

            // 🧾 Log activity
            $this->logActivity(
                type: 'CustomCRM',
                action: 'CustomCRM Table updated',
                relatedId: $tableId ?? null,
                details: [
                    'status' => 'success',
                    'message' => 'CustomCRM Table updated successfully',
                    'data' => $updatedTable->toArray(),
                ]
            );

            return response()->json([
                'message' => 'Table updated successfully!',
                'data' => [new CustomTableResource($updatedTable)],
            ], 200);
        } catch (Throwable $e) {
            // ❌ Log unexpected failure
            $this->logActivity(
                'CustomCRM',
                'CustomCRM Table updated Failed (Exception)',
                null,
                [
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ]
            );

            return $this->handleException($e, 'CustomTableController@updateCustomTableRecords');
        }
    }

    /**
     * @OA\Post(
     *     path="/api/v1/admin/custom-crm/upload-csv",
     *     operationId="uploadCustomTables",
     *     tags={"CustomCRM"},
     *     summary="Upload CSV file and create a custom table",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\RequestBody(
     *         required=true,
     *         content={
     *
     *             @OA\MediaType(
     *                 mediaType="multipart/form-data",
     *
     *                 @OA\Schema(
     *                     required={"csv_file", "table_name"},
     *
     *                     @OA\Property(
     *                         property="csv_file",
     *                         type="string",
     *                         format="binary",
     *                         description="CSV file to upload"
     *                     ),
     *                     @OA\Property(
     *                         property="table_name",
     *                         type="string",
     *                         example="leads_data"
     *                     )
     *                 )
     *             )
     *         }
     *     ),
     *
     *     @OA\Response(
     *         response=201,
     *         description="Table and data imported successfully.",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="message", type="string", example="Table and data imported successfully.")
     *         )
     *     ),
     *
     *     @OA\Response(response=404, description="Resource not found", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function uploadCsv(UploadCsvRequest $request)
    {
        try {

            $this->authorize('custom.upload-csv', CustomTable::class);

            $hostId = $this->resolveActiveHostId();

            $result = $this->customTableInterface->uploadCsvAndCreate($request, $hostId);

            // 🧾 Log activity
            $this->logActivity(
                type: 'CustomCRM',
                action: 'CustomCRM Table CSV imported',
                relatedId: $result->id ?? null,
                details: [
                    'status' => 'success',
                    'message' => 'CustomCRM Table CSV imported successfully',
                    'data' => $result->toArray(),
                ]
            );

            return response()->json([
                'message' => 'Table and data imported successfully!',
                'data' => new CustomTableResource($result),
            ], 201);
        } catch (Throwable $e) {
            // ❌ Log unexpected failure
            $this->logActivity(
                'CustomCRM',
                'CustomCRM Table imported Failed (Exception)',
                null,
                [
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ]
            );

            return $this->handleException($e, 'CustomTableController@uploadCsv');
        }
    }

    /**
     * @OA\Get(
     *     path="/api/v1/admin/custom-crm/custom-tables/{table_id}/attributes",
     *     operationId="getCustomTableAttributes",
     *     tags={"CustomCRM"},
     *     summary="Get attributes of a custom table",
     *     description="Retrieve only the attributes of a given custom table. Does not return records.",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(
     *         name="table_id",
     *         in="path",
     *         required=true,
     *         description="ID of the custom table",
     *
     *         @OA\Schema(type="integer", example=1)
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Attributes fetched successfully"
     *     ),
     *     @OA\Response(response=404, description="Resource not found", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function getCustomTableAttributes(int $tableId): JsonResponse
    {
        try {
            $this->authorize('custom.view', CustomTable::class);

            $data = $this->customTableInterface->getTableAttributes($tableId);

            return response()->json([
                'message' => 'Table attributes fetched successfully!',
                'data' => new CustomTableResource($data),
            ], 200);
        } catch (Throwable $e) {
            return $this->handleException($e, 'CustomTableController@getCustomTableAttributes');
        }
    }

    /**
     * @OA\Get(
     *     path="/api/v1/admin/custom-crm/custom-tables/{table_id}/attributes/records",
     *     operationId="getCustomTableRecords",
     *     tags={"CustomCRM"},
     *     summary="Get records from a custom table",
     *     description="Retrieve records and attributes for a given custom table. Supports search.",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(
     *         name="table_id",
     *         in="path",
     *         required=true,
     *         description="ID of the custom table",
     *
     *         @OA\Schema(type="integer", example=1)
     *     ),
     *
     *     @OA\Response(
     *         response=201,
     *         description="Table and records fetched successfully",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="message", type="string", example="Table and records view successfully!"),
     *             @OA\Property(property="data", ref="#/components/schemas/CustomTableRecordsResource")
     *         )
     *     ),
     *
     *     @OA\Response(response=404, description="Resource not found", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function getCustomTableRecords(Request $request, int $tableId): JsonResponse
    {
        try {
            $this->authorize('custom.view', CustomTable::class);

            $hostId = $this->resolveActiveHostId();

            $search = $request->input('search');

            $data = $this->customTableInterface->getTableRecords($tableId, $search, $hostId);

            return response()->json([
                'message' => 'Table and records view successfully!',
                'data' => new CustomTableRecordsResource($data),
            ], 201);
        } catch (Throwable $e) {
            return $this->handleException($e, 'CustomTableController@getCustomTableRecords');
        }
    }

    /**
     * @OA\Post(
     *     path="/api/v1/admin/custom-crm/custom-tables/{table_id}/records/store",
     *     operationId="storeCustomTableRecord",
     *     tags={"CustomCRM"},
     *     summary="Insert a record into a custom table",
     *     description="Create a new record in the specified custom table using the defined attributes.",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(
     *         name="table_id",
     *         in="path",
     *         required=true,
     *         description="ID of the custom table",
     *
     *         @OA\Schema(type="integer", example=1)
     *     ),
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(
     *             type="object",
     *             example={
     *                 "attributes": {
     *                      "name": "John Doe",
     *                       "first_name": "John",
     *                      "last_name": "Doe"
     *                  }
     *             }
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=201,
     *         description="Record created successfully",
     *     ),
     *     @OA\Response(response=404, description="Resource not found", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function storeCustomTableRecord(Request $request, int $tableId)
    {
        try {
            $this->authorize('custom.create', CustomTable::class);

            // Convert attributes to a proper associative array (handles nested objects)
            $attributes = json_decode(json_encode($request->input('attributes', [])), true);

            // Add default system fields before validation
            $attributes = array_merge([
                'assigned_to' => null,
                'status' => 1,
                'lead_generated_at' => now()->toDateString(),
                'additional_information' => null,
            ], $attributes);

            $record = $this->customTableInterface->insertTableRecord($tableId, $attributes);

            // 🧾 Log activity
            $this->logActivity(
                type: 'CustomCRM',
                action: 'CustomCRM Table Record inserted',
                relatedId: $tableId ?? null,
                details: [
                    'status' => 'success',
                    'message' => 'Record inserted successfully',
                    'data' => $record->toArray(),
                ]
            );

            return response()->json([
                'message' => 'Record inserted successfully!',
                'data' => $record,
            ], 201);
        } catch (Throwable $e) {
            // ❌ Log unexpected failure
            $this->logActivity(
                'CustomCRM',
                'CustomCRM Table Record inserted Failed (Exception)',
                null,
                [
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ]
            );

            return $this->handleException($e, 'CustomTableController@storeCustomTableRecord');
        }
    }

    /**
     * @OA\Delete(
     *     path="/api/v1/admin/custom-crm/delete/{tableId}",
     *     operationId="deleteCustomTable",
     *     tags={"CustomCRM"},
     *     summary="Delete a custom table and its attributes",
     *     description="Deletes the custom table and all associated attributes",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(
     *         name="tableId",
     *         in="path",
     *         required=true,
     *         description="Custom table ID to delete"
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Table deleted successfully",
     *
     *         @OA\JsonContent(
     *             type="object",
     *
     *             @OA\Property(property="message", type="string", example="Table deleted successfully!")
     *         )
     *     ),
     *
     *     @OA\Response(response=404, description="Resource not found", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     * )
     */
    public function deleteCustomTable($tableId)
    {
        try {
            $this->authorize('custom.delete', CustomTable::class);

            $hostId = $this->resolveActiveHostId();

            // Ensure table belongs to the current host
            $customTable = CustomTable::where('host_id', $hostId)->findOrFail($tableId);

            // Use repository/interface if exists
            $this->customTableInterface->deleteTable($customTable, $hostId);

            // ✅ Log success
            $this->logActivity(
                'CustomCRM',
                'CustomCRM Table Deleted',
                $tableId,
                [
                    'status' => 'success',
                    'message' => 'CustomCRM  Table deleted successfully.',
                    'deleted_crm' => [
                        'id' => $tableId,
                    ],
                ]
            );

            return response()->json([
                'message' => 'Table deleted successfully!',
            ], 200);
        } catch (Throwable $e) {
            // ❌ Log failure
            $this->logActivity(
                'CustomCRM',
                'CustomCRM Table Delete Failed',
                $tableId,
                [
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ]
            );

            return $this->handleException($e, 'CustomTableController@deleteCustomTable');
        }
    }

    /**
     * @OA\Get(
     *     path="/api/v1/admin/custom-crm/crm-leads-status",
     *     tags={"CustomCRM"},
     *     summary="Get list of CRM lead statuses",
     *     operationId="getCrmLeadStatusList",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(
     *         response=200,
     *         description="List of CRM lead statuses",
     *
     *         @OA\JsonContent(
     *             type="object",
     *
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(
     *                 property="data",
     *                 type="array",
     *
     *                 @OA\Items(
     *
     *                     @OA\Property(property="id", type="integer", example=1),
     *                     @OA\Property(property="name", type="string", example="Submitted")
     *                 )
     *             )
     *         )
     *     ),
     *
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function leadStatus(): JsonResponse
    {
        try {
            $statuses = LeadStatus::all();

            return response()->json([
                'success' => true,
                'data' => $statuses,
            ], 200);

        } catch (Throwable $e) {
            return $this->handleException($e, 'CrmLeadStatusController@leadStatus');
        }
    }

    /**
     * @OA\Post(
     *     path="/api/v1/admin/custom-crm/crm-leads-status/store",
     *     tags={"CustomCRM"},
     *     summary="Create or update a CRM lead status",
     *     operationId="createOrUpdateCrmLeadStatus",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(
     *             required={"name"},
     *
     *             @OA\Property(property="id", type="integer", example=1, description="Optional: ID for update"),
     *             @OA\Property(property="name", type="string", example="Interested")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Lead status created or updated successfully",
     *
     *         @OA\JsonContent(
     *             type="object",
     *
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="id", type="integer", example=1),
     *                 @OA\Property(property="name", type="string", example="Submitted")
     *             )
     *         )
     *     ),
     *
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function SaveLeadStatus(Request $request): JsonResponse
    {
        try {
            $data = $request->validate([
                'id' => 'nullable|integer|exists:crm_leads_status,id',
                'name' => 'required|string|max:255',
            ]);

            // Create or update record
            $status = LeadStatus::updateOrCreate(
                ['id' => $data['id'] ?? null],
                ['name' => $data['name']]
            );

            // ✅ Log success
            $this->logActivity(
                'CustomCRM',
                'CustomCRM Lead Status created or updated',
                $status->id,
                [
                    'status' => 'success',
                    'message' => 'CustomCRM Lead status created or updated successfully.',
                    'data' => $status->toArray(),
                ]
            );

            return response()->json([
                'success' => true,
                'data' => $status,
            ], 200);

        } catch (Throwable $e) {
            // ❌ Log unexpected failure
            $this->logActivity(
                'CustomCRM',
                'CustomCRM Lead status created or updated Failed (Exception)',
                null,
                [
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ]
            );

            return $this->handleException($e, 'CrmLeadStatusController@SaveLeadStatus');
        }
    }

    /**
     * @OA\Get(
     *     path="/api/v1/admin/custom-crm/lead-users",
     *     tags={"CustomCRM"},
     *     summary="Get users with roles team member",
     *     operationId="getLeadRelatedUsers",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(
     *         response=200,
     *         description="List of users belonging to the same host",
     *
     *         @OA\JsonContent(
     *             type="object",
     *
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(
     *                 property="data",
     *                 type="array",
     *
     *                 @OA\Items(
     *
     *                     @OA\Property(property="id", type="integer", example=3),
     *                     @OA\Property(property="name", type="string", example="John Deo")
     *                 )
     *             )
     *         )
     *     ),
     *
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function getLeadRelatedUsers(): JsonResponse
    {
        try {
            $hostId = $this->resolveActiveHostId();

            $allowedRoles = ['team-member'];

            $users = User::where('host_id', $hostId)
                ->whereHas('roles', function ($query) use ($allowedRoles) {
                    $query->whereIn('name', $allowedRoles);
                })
                ->orderBy('first_name')
                ->get(['id', 'first_name', 'last_name'])
                ->map(function ($user) {
                    return [
                        'id' => $user->id,
                        'name' => trim($user->first_name.' '.$user->last_name),
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $users,
            ], 200);

        } catch (Throwable $e) {
            return $this->handleException($e, 'CrmUserController@getLeadRelatedUsers');
        }
    }
}
