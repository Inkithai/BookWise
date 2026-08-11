<?php

namespace Modules\Role\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Traits\LogsActivity;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Role\Http\Resources\RoleResource;
use Modules\Role\Repositories\RoleRepositoryInterface;
use OpenApi\Annotations as OA;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Throwable;

/**
 * @OA\Tag(
 *     name="Permissions",
 *     description="Manage user permissions"
 * )
 */
class PermissionController extends Controller
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
     * @OA\Post(
     *     path="/api/v1/admin/roles/{id}/permissions",
     *     summary="Assign permissions to a role",
     *     tags={"Permissions"},
     *     security={{"bearerAuth":{}}},
     *     operationId="AssignPermissions",
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
     *         @OA\JsonContent(
     *             type="object",
     *
     *             @OA\Property(
     *                 property="permissions",
     *                 type="array",
     *
     *                 @OA\Items(type="string"),
     *                 example={
     *                     "user.create",
     *                     "user.edit",
     *                     "user.delete",
     *                     "role.view",
     *                     "role.create",
     *                     "role.edit",
     *                     "role.delete",
     *                     "permission.view",
     *                     "permission.create",
     *                     "permission.edit",
     *                     "permission.delete",
     *                     "dashboard.view",
     *                     "custom.view",
     *                     "custom.create",
     *                     "custom.edit",
     *                     "custom.delete",
     *                     "custom.upload-csv",
     *                     "invoice-client.view",
     *                     "invoice-client.create",
     *                     "invoice-client.edit",
     *                     "invoice-client.delete",
     *                     "invoice.view",
     *                     "invoice.manage",
     *                     "invoice.mail",
     *                     "invoice.create",
     *                     "invoice.edit",
     *                     "invoice.delete",
     *                     "receipt.view",
     *                     "receipt.create",
     *                     "receipt.edit",
     *                     "receipt.delete",
     *                     "receipt.mail",
     *                     "company.change",
     *                    "feature.monthly-invoice",
     *                    "feature.saved-client",
     *                    "feature.monthly-payment-receipt",
     *                    "feature.monthly-quotation",
     *                    "feature.team-membership",
     *                    "feature.template",
     *                    "feature.any-currency",
     *                    "feature.standard-dashboard",
     *                    "feature.advanced-dashboard",
     *                    "feature.custom-dashboard",
     *                    "feature.recurring-invoice",
     *                    "feature.accept-online-payment",
     *                    "feature.branding",
     *                    "feature.send-invoice",
     *                    "feature.multiple-business",
     *                    "feature.crm",
     *                    "feature.tax"
     *                 }
     *             )
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Permissions assigned successfully",
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
    public function assignPermissions(Request $request, $id): JsonResponse
    {
        try {
            $this->authorize('permission.create', Permission::class);

            $role = $this->roleRepository->getById($id);

            $request->validate([
                'permissions' => 'present|array',
                'permissions.*' => 'string|exists:permissions,name',
            ]);

            // Fix DEF_122: Set team context for Spatie Permission teams feature
            // When teams are enabled, permission operations require team_id context
            if ($role->team_id !== null) {
                app(PermissionRegistrar::class)->setPermissionsTeamId($role->team_id);
            }

            $permissions = $role->syncPermissions($request->permissions);
            app(PermissionRegistrar::class)->forgetCachedPermissions();

            // 🧾 Log activity
            $this->logActivity(
                type: 'Permissions',
                action: 'Host Sub User Permissions assigned Successfully',
                relatedId: $id ?? null,
                details: [
                    'status' => 'success',
                    'message' => 'Permissions assigned successfully',
                    'data' => $permissions->toArray(),
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Permissions assigned successfully',
                'data' => new RoleResource($role->fresh()),
            ]);
        } catch (Throwable $e) {
            // ❌ Log unexpected failure
            $this->logActivity(
                'Permissions',
                'Host Sub User Permissions assigned Failed (Exception)',
                null,
                [
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ]
            );

            return $this->handleException($e, 'RoleController@assignPermissions');
        }
    }
}
