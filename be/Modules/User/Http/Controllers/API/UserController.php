<?php

namespace Modules\User\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\Subscription\SubscriptionLimitService;
use Illuminate\Http\Exceptions\HttpResponseException;
use App\Traits\LogsActivity;
use Carbon\Carbon;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Modules\User\Http\Requests\CompanyDetailsRequest;
use Modules\User\Http\Requests\UserStoreRequest;
use Modules\User\Http\Requests\UserUpdateRequest;
use Modules\User\Http\Requests\ValidateUserFieldsRequest;
use Modules\User\Http\Resources\UserResource;
use Modules\User\Models\User;
use Modules\User\Repositories\UserRepositoryInterface;
use OpenApi\Annotations as OA;
use Throwable;
use Yajra\DataTables\DataTables;

/**
 * @OA\Tag(
 *     name="Users",
 *     description="API Endpoints for Managing Organisation Sub Users"
 * )
 */
class UserController extends Controller
{
    use AuthorizesRequests;
    use LogsActivity;

    protected UserRepositoryInterface $userRepository;

    public function __construct(UserRepositoryInterface $userRepository)
    {
        $this->userRepository = $userRepository;

        // Ensure API auth
        $this->middleware('auth:api');
    }

    /**
     * @OA\Get(
     *     path="/api/v1/admin/users",
     *     tags={"Users"},
     *     summary="Get organisation's all users",
     *     description="Returns a list of users with optional search, filter and pagination",
     *     operationId="getUsers",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="search", in="query", description="Search users by first name, last name, email", required=false, @OA\Schema(type="string")),
     *     @OA\Parameter(name="is_active", in="query", description="Filter by active status (1 = Active, 0 = Inactive)", required=false, @OA\Schema(type="integer", enum={0,1})),
     *     @OA\Parameter(name="per_page", in="query", description="Number of rows per page", required=false, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="page", in="query", description="Page number for pagination", required=false, @OA\Schema(type="integer")),
     *
     *     @OA\Response(response=200, description="Successful operation"),
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
            $this->authorize('user.view', User::class);

            $filters = $request->only(['search', 'is_active', 'per_page', 'page']);
            $dataQuery = $this->userRepository->getAll($filters);

            $draw = (int) $request->input('draw', 1);

            if ($request->ajax()) {
                return DataTables::of($dataQuery)
                    ->addIndexColumn()
                    ->editColumn('created_at', fn($row) => $row->created_at ? Carbon::parse($row->created_at)->format('d M Y') : '')
                    ->editColumn('is_active', fn($row) => $row->is_active === 1 ? 'Active' : 'Inactive')
                    ->editColumn('is_otp_verified',fn($row) => $row->is_otp_verified === 1 ? 'Active' : 'Inactive')
                    ->editColumn('phone_number', fn($row) => $this->formatPhoneNumber($row->phone_number))
                    ->addColumn('account_type', fn($row) => $row->account_type ?? 'Personal')
                    ->addColumn('role', fn($row) => $row->roles->first()?->name ?? 'No Role')
                    ->addColumn('action', fn($row) => '<a title="Edit" href="/admin/user/edit/' . $row->id . '" class="data-table-btn"><i class="fa fa-pencil-alt" aria-hidden="true"></i></a>')
                    ->rawColumns(['action'])
                    ->make(true);
            } else {
                $data = $dataQuery->get();

                $transformed = $data->map(fn($row, $index) => [
                    'DT_RowIndex' => $index + 1,
                    'id' => $row->id,
                    'first_name' => $row->first_name,
                    'last_name' => $row->last_name,
                    'user_name' => $row->user_name,
                    'email' => $row->email,
                    'phone_number' => $this->formatPhoneNumber($row->phone_number),
                    'account_type' => $row->account_type ?? 'Personal',
                    'role' => $row->roles->first()?->name ?? 'No Role',
                    'is_active' => $row->is_active === 1 ? 'Active' : 'Inactive',
                    'is_otp_verified' => $row->is_otp_verified === 1 ? 'Active' : 'Inactive',
                    'created_at' => $row->created_at ? Carbon::parse($row->created_at)->format('d M Y') : '',
                    'action' => url('/admin/user/edit/' . $row->id),
                ]);

                return response()->json([
                    'draw' => $draw,
                    'recordsTotal' => $transformed->count(),
                    'recordsFiltered' => $transformed->count(),
                    'data' => $transformed,
                ]);
            }
        } catch (Throwable $e) {
            return $this->handleException($e, 'UserController@index');
        }
    }

    /**
     * Format a phone number to international format.
     *
     * @param  string|null  $phoneNumber
     */
    protected function formatPhoneNumber(?string $number): string
    {
        if (!$number) {
            return '';
        }

        // Example: Format +94771234567 to +94 77 123 4567
        return preg_replace("/(\+94)(\d{2})(\d{3})(\d{4})/", '$1 $2 $3 $4', $number);
    }

    /**
     * @OA\Get(
     *     path="/api/v1/admin/users/{id}",
     *     tags={"Users"},
     *     summary="Get user details",
     *     operationId="getUserById",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         description="User ID",
     *         required=true,
     *
     *         @OA\Schema(type="integer")
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="User details",
     *
     *         @OA\JsonContent(ref="#/components/schemas/UserResource")
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
            $user = $this->userRepository->findById($id);

            $this->authorize('user.view', $user);

            return response()->json([
                'success' => true,
                'data' => new UserResource($user),
            ], 200);

        } catch (Throwable $e) {
            return $this->handleException($e, 'UserController@show');
        }
    }

    /**
     * @OA\Post(
     *     path="/api/v1/admin/users",
     *     tags={"Users"},
     *     summary="Register a new sub user",
     *     security={{"bearerAuth":{}}},
     *     operationId="createUsers",
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(ref="#/components/schemas/UserStoreRequest")
     *     ),
     *
     *     @OA\Response(
     *         response=201,
     *         description="User registered successfully",
     *
     *         @OA\JsonContent(ref="#/components/schemas/UserResource")
     *     ),
     *
     *     @OA\Response(response=404, description="Resource not found", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function validateUserFields(ValidateUserFieldsRequest $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Email, username, and phone number are available.',
        ]);
    }

    public function registerUser(UserStoreRequest $request): JsonResponse
    {
        try {
            $this->authorize('user.create', User::class);

            $host = auth()->user(); // Current host user
            $hostId = (int) ($host->host_id ?? $host->id);
            app(SubscriptionLimitService::class)->assertCanAddTeamMember($host, $hostId);

            $user = $this->userRepository->create($request->validated());

            // ✅ Log success activity
            $this->logActivity(
                'User',
                'Host Sub User Created',
                $user->id ?? null,
                [
                    'status' => 'success',
                    'message' => 'User registered successfully',
                    'data' => $user->toArray(),
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'User registered successfully',
                'data' => new UserResource($user),
            ], 201);
        } catch (ValidationException $e) {
            // ❌ Log validation failure
            $this->logActivity(
                'User',
                'Host Sub User Create Failed (Validation)',
                null,
                [
                    'status' => 'error',
                    'message' => 'Validation error',
                    'errors' => $e->errors(),
                ]
            );

            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $e->errors(),
            ], 422);
        } catch (HttpResponseException $e) {
            throw $e;
        } catch (Throwable $e) {
            // ❌ Log unexpected failure
            $this->logActivity(
                'User',
                'Host Sub User Create Failed (Exception)',
                null,
                [
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ]
            );

            return $this->handleException($e, 'UserController@registerUser');
        }
    }

    /**
     * @OA\Post(
     *     path="/api/v1/admin/users/{id}",
     *     tags={"Users"},
     *     summary="Update an existing user (multipart safe PUT override)",
     *     security={{"bearerAuth":{}}},
     *     operationId="updateUser",
     *
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         description="User ID",
     *         required=true,
     *
     *         @OA\Schema(type="integer")
     *     ),
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *
     *             @OA\Schema(
     *                 allOf={
     *                     @OA\Schema(ref="#/components/schemas/UserUpdateRequest"),
     *                     @OA\Schema(
     *
     *                         @OA\Property(property="_method", type="string", example="PUT")
     *                     )
     *                 }
     *             )
     *         )
     *     ),
     *
     *     @OA\Response(response=200, description="User updated successfully", @OA\JsonContent(ref="#/components/schemas/UserResource")),
     *     @OA\Response(response=422, description="Validation error"),
     *     @OA\Response(response=401, description="Unauthorized"),
     *     @OA\Response(response=404, description="Not found"),
     *     @OA\Response(response=500, description="Server error")
     * )
     */
    public function update(UserUpdateRequest $request, $id): JsonResponse
    {
        try {
            $data = $request->validated();
            $is_remove = false;
            // Previously we enforced a policy check here:
            // $user = $this->userRepository->findById($id);
            // $this->authorize('user.edit', $user);
            // Requirement change: allow all authenticated users to update users,
            // so we skip the policy and just load the user for logging/consistency.
            $user = $this->userRepository->findById($id);

            if ($request->hasFile('profile_img')) {
                $file = $request->file('profile_img');
                $filename = 'prof_img_' . $id . '_' . time() . '.' . $file->getClientOriginalExtension();
                $filePath = $file->storeAs('profile_img', $filename, 'public');
                $data['profile_img'] = $filePath;
            }else{
                if (array_key_exists('is_remove', $data) && $data['is_remove']== true) {
                    $is_remove= true;
                }
            }
            
            $updatedUser = $this->userRepository->update($data, $id, $is_remove);

            // ✅ Log success
            $this->logActivity(
                'User',
                'Host Admin/Sub User Updated',
                $updatedUser->id,
                [
                    'status' => 'success',
                    'message' => 'User updated successfully',
                    'changes' => $data,
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'User updated successfully',
                'data' => new UserResource($updatedUser),
            ], 200);

        } catch (ValidationException $e) {
            // ❌ Log validation error
            $this->logActivity(
                'User',
                'Host  Admin/Sub User Update Failed (Validation)',
                $id ?? null,
                [
                    'status' => 'error',
                    'message' => 'Validation error',
                    'errors' => $e->errors(),
                ]
            );

            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $e->errors(),
            ], 422);
        } catch (Throwable $e) {
            Log::error('User update failed', ['error' => $e->getMessage()]);

            // ❌ Log unexpected error
            $this->logActivity(
                'User',
                'Host  Admin/Sub User Update Failed (Exception)',
                $id,
                [
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ]
            );

            return response()->json([
                'success' => false,
                'message' => 'Internal server error',
            ], 500);
        }
    }

    /**
     * @OA\Post(
     *     path="/api/v1/admin/users/change-company-details",
     *     tags={"Users"},
     *     summary="Change an existing company details",
     *     security={{"bearerAuth":{}}},
     *     operationId="changeCompanyDetails",
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *
     *             @OA\Schema(ref="#/components/schemas/CompanyDetailsRequest")
     *         ),
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Company details updated successfully",
     *
     *         @OA\JsonContent(ref="#/components/schemas/UserResource")
     *     ),
     *
     *     @OA\Response(response=404, description="Resource not found", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function changeCompanyDetails(CompanyDetailsRequest $request): JsonResponse
    {
        try {
            $logoFile = $request->file('company_logo');
            Log::info('change-company-details request parsed', [
                'content_type' => $request->header('content-type'),
                'keys' => array_keys($request->all()),
                'has_company_logo_file' => $request->hasFile('company_logo'),
                'company_logo_file' => $logoFile ? [
                    'original_name' => $logoFile->getClientOriginalName(),
                    'mime' => $logoFile->getMimeType(),
                    'size' => $logoFile->getSize(),
                    'tmp_path' => $logoFile->getPathname(),
                ] : null,
            ]);

            $data = $request->validated();

            $authUser = auth()->user();
            // $this->authorize('changeCompany', $authUser);

            // ✅ Update via repository
            $updatedUser = $this->userRepository->changeCompanyData($data);

            // ✅ Log success
            $this->logActivity(
                'Company',
                'Host Admin Company Details Updated',
                $authUser->id,
                [
                    'status' => 'success',
                    'message' => 'Company details updated successfully',
                    'updated_fields' => $data,
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Company details updated successfully',
                'data' => new UserResource($updatedUser->fresh()),
            ], 200);

        } catch (ValidationException $e) {
            // ❌ Log validation failure
            $this->logActivity(
                'Company',
                'Host Admin Company Details Update Failed (Validation)',
                auth()->id() ?? null,
                [
                    'status' => 'error',
                    'message' => 'Validation error',
                    'errors' => $e->errors(),
                ]
            );

            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $e->errors(),
            ], 422);
        } catch (Throwable $e) {
            // ❌ Log unexpected failure
            $this->logActivity(
                'Company',
                'Host Admin Company Details Update Failed (Exception)',
                auth()->id(),
                [
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ]
            );
            $payload = [
                'success' => false,
                'message' => 'Failed to update company details.',
            ];
            if (config('app.debug')) {
                $payload['debug'] = [
                    'error' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ];
            }
            return response()->json($payload, 500);
        }
    }

    /**
     * @OA\Delete(
     *     path="/api/v1/admin/users/remove-company-logo",
     *     tags={"Users"},
     *     summary="Remove company logo",
     *     description="Deletes the company logo file from storage and removes the database reference",
     *     security={{"bearerAuth":{}}},
     *     operationId="removeCompanyLogo",
     *
     *     @OA\Response(
     *         response=200,
     *         description="Company logo removed successfully",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Company logo removed successfully"),
     *             @OA\Property(property="data", ref="#/components/schemas/UserResource")
     *         )
     *     ),
     *
     *     @OA\Response(response=404, description="Resource not found", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function removeCompanyLogo(): JsonResponse
    {
        try {
            $authUser = auth()->user();
            $this->authorize('company.change', $authUser);

            // ✅ Remove via repository
            $updatedUser = $this->userRepository->removeCompanyLogo();

            // ✅ Log success
            $this->logActivity(
                'Company',
                'Company Logo Removed',
                $authUser->id,
                [
                    'status' => 'success',
                    'message' => 'Company logo removed successfully',
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Company logo removed successfully',
                'data' => new UserResource($updatedUser),
            ], 200);

        } catch (Throwable $e) {
            // ❌ Log failure
            $this->logActivity(
                'Company',
                'Company Logo Removal Failed',
                auth()->id() ?? null,
                [
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ]
            );

            return $this->handleException($e, 'UserController@removeCompanyLogo');
        }
    }

    /**
     * @OA\Delete(
     *     path="/api/v1/admin/users/{id}/{action}",
     *     tags={"Users"},
     *     summary="Delete or deactivate a user",
     *     security={{"bearerAuth":{}}},
     *     operationId="deleteUsers",
     *
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         description="User ID",
     *         required=true,
     *
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Parameter(
     *         name="action",
     *         in="path",
     *         description="Action to perform (e.g. delete, deactivate)",
     *         required=true,
     *         @OA\Schema(
     *             type="string",
     *             example="delete"
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="User deleted successfully",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="User deleted successfully.")
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
    public function destroy($id, $action = 'delete'): JsonResponse
    {
        try {
            $user = $this->userRepository->findById($id);
            $this->authorize('user.delete', $user);

            $this->userRepository->delete($id, $action);

            $message = $action === 'delete'
                ? 'User account permanently deleted.'
                : 'User account deactivated successfully.';

            $this->logActivity(
                'User',
                'User Account Action',
                (int) $id,
                [
                    'status' => 'success',
                    'action' => $action,
                ]
            );

            return response()->json([
                'success' => true,
                'message' => $message,
            ]);

        } catch (Throwable $e) {
            $this->logActivity(
                'User',
                'User Account Action Failed',
                (int) $id,
                [
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ]
            );

            return $this->handleException($e, 'UserController@destroy');
        }
    }

    /**
     * Deactivate a user (set is_active = 0)
     */
    public function deactivate($id): JsonResponse
    {
        try {
            $user = $this->userRepository->findById($id);
            $this->authorize('user.delete', $user);

            $this->userRepository->delete($id, 'deactivate');

            $this->logActivity('User', 'User Deactivated', (int) $id, ['status' => 'success']);

            return response()->json([
                'success' => true,
                'message' => 'User account deactivated successfully.',
            ]);

        } catch (Throwable $e) {
            return $this->handleException($e, 'UserController@deactivate');
        }
    }

    /**
     * Activate a user (set is_active = 1)
     */
    public function activate($id): JsonResponse
    {
        try {
            $user = $this->userRepository->findById($id);
            $this->authorize('user.delete', $user);

            \App\Models\User::findOrFail($id)->update(['is_active' => 1]);

            $this->logActivity('User', 'User Activated', (int) $id, ['status' => 'success']);

            return response()->json([
                'success' => true,
                'message' => 'User account activated successfully.',
            ]);

        } catch (Throwable $e) {
            return $this->handleException($e, 'UserController@activate');
        }
    }

    /**
     * @OA\Put(
     *     path="/api/v1/admin/users/change-theme",
     *     tags={"Users"},
     *     summary="Update user theme colors",
     *     security={{"bearerAuth":{}}},
     *     operationId="updateUserTheme",
     *
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="theme_color", type="string", example="#ffffff"),
     *             @OA\Property(property="invoice_theme_color", type="string", example="#000000")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Theme colors updated successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Theme colors updated successfully."),
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="theme_color", type="string", example="#ffffff"),
     *                 @OA\Property(property="invoice_theme_color", type="string", example="#000000")
     *             )
     *         )
     *     ),
     *     @OA\Response(response=422, description="Validation error"),
     *     @OA\Response(response=401, description="Unauthorized")
     * )
     */
    public function markPricingSeen(): JsonResponse
    {
        $user = auth()->user();
        $user->update(['has_seen_pricing' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Pricing onboarding marked as complete.',
        ]);
    }

    public function updateTheme(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();

            $request->validate([
                'theme_color' => 'nullable|string',
                'invoice_theme_color' => 'nullable|string|regex:/^#([A-Fa-f0-9]{6})$/',
            ]);

            $themeColor = $request->input('theme_color', $user->theme_color ?? '#ffffff');
            $invoiceThemeColor = $request->input('invoice_theme_color', $user->invoice_theme_color ?? '#000000');

            // Resolve the correct host to update (company's host_id when in company context,
            // personal host_id otherwise). Uses owner_user_id lookup — works for super admin too.
            $hostId = $this->userRepository->resolveHostIdForUser($user);

            // Update the host record (scoped correctly per context)
            if ($hostId) {
                \App\Models\Host::where('id', $hostId)->update([
                    'theme_color' => $themeColor,
                    'invoice_theme_color' => $invoiceThemeColor,
                ]);
            }

            // Also save to user record as personal fallback
            $user->theme_color = $themeColor;
            $user->invoice_theme_color = $invoiceThemeColor;
            $user->save();

            $this->logActivity(
                'User',
                'Theme Updated',
                $user->id,
                [
                    'status' => 'success',
                    'theme_color' => $themeColor,
                    'invoice_theme_color' => $invoiceThemeColor,
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Theme colors updated successfully.',
                'data' => [
                    'theme_color' => $themeColor,
                    'invoice_theme_color' => $invoiceThemeColor,
                ],
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $e->errors(),
            ], 422);

        } catch (\Throwable $e) {
            $this->logActivity(
                'User',
                'Theme Update Failed',
                auth()->id(),
                [
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ]
            );

            return response()->json([
                'success' => false,
                'message' => 'Internal server error',
            ], 500);
        }
    }

}
