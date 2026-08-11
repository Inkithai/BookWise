<?php

namespace Modules\Role\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Traits\LogsActivity;
use Carbon\Carbon;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Role\Http\Requests\StoreRoleRequest;
use Modules\Role\Http\Requests\UpdateRoleRequest;
use Modules\Role\Http\Resources\RoleResource;
use Modules\Role\Repositories\RoleRepositoryInterface;
use OpenApi\Annotations as OA;
use Spatie\Permission\Models\Role;
use Throwable;
use Yajra\DataTables\Facades\DataTables;

/**
 * @OA\Tag(
 *     name="Roles",
 *     description="Manage user roles"
 * )
 */
class RoleController extends Controller
{
    use AuthorizesRequests;
    use LogsActivity;

    protected RoleRepositoryInterface $roleRepository;

    public function __construct(RoleRepositoryInterface $roleRepository)
    {
        $this->roleRepository = $roleRepository;

        // Ensure API auth
        $this->middleware('auth:api');
    }

    /**
     * @OA\Get(
     *     path="/api/v1/admin/roles",
     *     tags={"Roles"},
     *     summary="Get all roles",
     *     description="Returns a list of roles with DataTables support",
     *     operationId="getRoles",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(
     *         name="search",
     *         in="query",
     *         description="Search query for filtering roles",
     *         required=false,
     *
     *         @OA\Schema(
     *             type="string",
     *             example=""
     *         )
     *     ),
     *
     *     @OA\Parameter(
     *         name="draw",
     *         in="query",
     *         description="DataTables draw counter",
     *         required=false,
     *
     *         @OA\Schema(
     *             type="integer"
     *         )
     *     ),
     *
     *     @OA\Parameter(
     *         name="start",
     *         in="query",
     *         description="DataTables start record for pagination",
     *         required=false,
     *
     *         @OA\Schema(
     *             type="integer",
     *             example=0
     *         )
     *     ),
     *
     *     @OA\Parameter(
     *         name="length",
     *         in="query",
     *         description="DataTables number of records to return",
     *         required=false,
     *
     *         @OA\Schema(
     *             type="integer",
     *             example=10
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *
     *         @OA\JsonContent(
     *             type="object",
     *
     *             @OA\Property(
     *                 property="draw",
     *                 type="integer",
     *                 example=1,
     *                 description="DataTables draw counter"
     *             ),
     *             @OA\Property(
     *                 property="recordsTotal",
     *                 type="integer",
     *                 example=25,
     *                 description="Total number of records"
     *             ),
     *             @OA\Property(
     *                 property="recordsFiltered",
     *                 type="integer",
     *                 example=25,
     *                 description="Number of records after filtering"
     *             ),
     *             @OA\Property(
     *                 property="data",
     *                 type="array",
     *
     *                 @OA\Items(
     *                     type="object",
     *
     *                     @OA\Property(
     *                         property="DT_RowIndex",
     *                         type="integer",
     *                         example=1,
     *                         description="Row index for DataTables"
     *                     ),
     *                     @OA\Property(
     *                         property="name",
     *                         type="string",
     *                         example="Administrator",
     *                         description="Role name"
     *                     ),
     *                     @OA\Property(
     *                         property="created_at",
     *                         type="string",
     *                         format="date-time",
     *                         example="2024-01-15 10:30:00",
     *                         description="Role creation timestamp"
     *                     )
     *                 )
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
    public function index(Request $request): JsonResponse
    {
        try {
            $this->authorize('role.view', Role::class);

            $roles = $this->roleRepository->getAll($request->toArray());

            if ($request->ajax()) {
                return DataTables::of($roles)
                    ->addIndexColumn()
                    ->editColumn('created_at', fn ($role) => Carbon::parse($role->created_at)->format('Y-m-d H:i:s'))
                    ->addColumn('action', function ($role) {
                        return '<a title="Edit" href="/admin/roles/'.$role->id.'" class="data-table-btn"><i class="fa fa-pencil-alt"></i></a>'
                            .'<a title="Permissions" href="/admin/roles/permissions/'.$role->id.'" class="data-table-btn"><i class="fa fa-lock"></i></a>'
                            .'<a title="Delete" data-id="'.$role->id.'" class="data-table-btn delete_data"><i class="fa fa-trash"></i></a>';
                    })
                    ->rawColumns(['action'])
                    ->toJson();
            }

            $transformed = $roles->map(fn ($role, $index) => [
                'DT_RowIndex' => $index + 1,
                'name' => $role->name,
                'created_at' => Carbon::parse($role->created_at)->format('Y-m-d H:i:s'),
                'action' => '<a title="Edit" href="/admin/roles/'.$role->id.'/show" class="data-table-btn"><i class="fa fa-pencil-alt"></i></a>'
                    .'<a title="Permissions" href="/admin/roles/permissions/'.$role->id.'" class="data-table-btn"><i class="fa fa-lock"></i></a>'
                    .'<a title="Delete" data-id="'.$role->id.'" class="data-table-btn delete_data"><i class="fa fa-trash"></i></a>',
            ]);

            return response()->json([
                'draw' => 1,
                'recordsTotal' => count($transformed),
                'recordsFiltered' => count($transformed),
                'data' => $transformed,
            ]);
        } catch (Throwable $e) {
            return $this->handleException($e, 'RoleController@index');
        }
    }

    /**
     * @OA\Post(
     *     path="/api/v1/admin/roles",
     *     summary="Create a new role",
     *     tags={"Roles"},
     *     security={{"bearerAuth":{}}},
     *     operationId="createRoles",
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(ref="#/components/schemas/StoreRoleRequest")
     *     ),
     *
     *     @OA\Response(
     *         response=201,
     *         description="Successful operation",
     *
     *         @OA\JsonContent(ref="#/components/schemas/RoleResource")
     *     ),
     *
     *     @OA\Response(response=404, description="Resource not found", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function store(StoreRoleRequest $request): JsonResponse
    {
        try {
            $this->authorize('user.create', Role::class);

            $role = $this->roleRepository->store($request->validated());

            // 🧾 Log activity
            $this->logActivity(
                type: 'Role',
                action: 'Host Sub User Role created',
                relatedId: $role->id ?? null,
                details: [
                    'status' => 'success',
                    'message' => 'Role created successfully',
                    'data' => $role->toArray(),
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Role created successfully',
                'data' => new RoleResource($role),
            ], 201);
        } catch (Throwable $e) {
            // ❌ Log unexpected failure
            $this->logActivity(
                'Role',
                'Host Sub User Role Create Failed (Exception)',
                null,
                [
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ]
            );

            return $this->handleException($e, 'RoleController@store');
        }
    }

    /**
     * @OA\Get(
     *     path="/api/v1/admin/roles/{id}",
     *     summary="Show a specific role",
     *     tags={"Roles"},
     *     security={{"bearerAuth":{}}},
     *     operationId="getRolesById",

     *
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *
     *         @OA\Schema(type="integer")
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *
     *         @OA\JsonContent(ref="#/components/schemas/RoleResource")
     *     ),
     *
     *     @OA\Response(response=404, description="Resource not found", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function show($id): JsonResponse
    {
        try {
            $role = $this->roleRepository->getById($id);

            $this->authorize('role.view', $role);

            return response()->json([
                'success' => true,
                'data' => new RoleResource($role),
            ], 200);
        } catch (Throwable $e) {
            return $this->handleException($e, 'RoleController@show');
        }
    }

    /**
     * @OA\Put(
     *     path="/api/v1/admin/roles/{id}",
     *     summary="Update an existing role",
     *     tags={"Roles"},
     *     security={{"bearerAuth":{}}},
     *     operationId="updateRoles",
     *
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *
     *         @OA\Schema(type="integer")
     *     ),
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(ref="#/components/schemas/UpdateRoleRequest")
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *
     *         @OA\JsonContent(ref="#/components/schemas/RoleResource")
     *     ),
     *
     *     @OA\Response(response=404, description="Resource not found", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function update(UpdateRoleRequest $request, $id): JsonResponse
    {
        try {
            // Just get validated data as is
            $data = $request->validated();

            $role = $this->roleRepository->getById($id);

            $this->authorize('role.edit', $role);

            $updatedRole = $this->roleRepository->update($id, $data);

            // 🧾 Log activity
            $this->logActivity(
                type: 'Role',
                action: 'Host Sub User Role updated',
                relatedId: $id ?? null,
                details: [
                    'status' => 'success',
                    'message' => 'Role updated successfully',
                    'data' => $updatedRole->toArray(),
                ]
            );

            return response()->json([
                'success' => true,
                'data' => new RoleResource($updatedRole),
            ], 200);
        } catch (Throwable $e) {
            // ❌ Log unexpected failure
            $this->logActivity(
                'Role',
                'Host Sub User Role updated Failed (Exception)',
                null,
                [
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ]
            );

            return $this->handleException($e, 'RoleController@update');
        }
    }

    /**
     * @OA\Delete(
     *     path="/api/v1/admin/roles/{id}",
     *     summary="Delete a role",
     *     tags={"Roles"},
     *     security={{"bearerAuth":{}}},
     *     operationId="deleteRoles",
     *
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *
     *         @OA\Schema(type="integer")
     *     ),
     *
     *     @OA\Response(
     *         response=204,
     *         description="Role deleted"
     *     ),
     *     @OA\Response(response=404, description="Resource not found", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function destroy($id): JsonResponse
    {
        try {

            $role = $this->roleRepository->getById($id);

            $this->authorize('role.delete', $role);

            $this->roleRepository->delete($id);

            // ✅ Log success
            $this->logActivity(
                'Role',
                'Host Sub User Role Deleted',
                $id,
                [
                    'status' => 'success',
                    'message' => 'Role deleted successfully.',
                    'deleted_role' => [
                        'id' => $role->id,
                        'name' => $role->name ?? null,
                    ],
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Role deleted successfully',
            ], 200);
        } catch (Throwable $e) {
            // ❌ Log failure
            $this->logActivity(
                'Role',
                'Host Sub User Role Delete Failed',
                $id,
                [
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ]
            );

            return $this->handleException($e, 'RoleController@destroy');
        }
    }
}
