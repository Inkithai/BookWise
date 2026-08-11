<?php

namespace Modules\SuperAdminAnalytics\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Modules\SuperAdminAnalytics\Services\AnalyticsService;

class AnalyticsUsersController extends Controller
{
    public function __construct(private readonly AnalyticsService $service) 
    {
        $this->middleware(function ($request, $next) {
            if (!auth()->user() || !auth()->user()->hasRole('super-admin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. Super Admin privileges required.'
                ], 403);
            }
            return $next($request);
        });
    }

    // GET /api/analytics/users
    public function index(Request $request): JsonResponse
    {
        try {
            $data = $this->service->getUsers($request->only([
                'search', 'status', 'account_type', 'page', 'per_page',
            ]));
            return response()->json($data);
        } catch (\Throwable $e) {
            return $this->serverError($e);
        }
    }

    // GET /api/analytics/users/dropdown
    public function dropdown(): JsonResponse
    {
        try {
            return response()->json($this->service->getUsersDropdown());
        } catch (\Throwable $e) {
            return $this->serverError($e);
        }
    }

    // GET /api/analytics/users/{id}
    public function show(int $id): JsonResponse
    {
        try {
            $user = $this->service->getUserById($id);
            if (empty($user)) {
                return response()->json(['message' => 'User not found.'], 404);
            }
            return response()->json($user);
        } catch (\Throwable $e) {
            return $this->serverError($e);
        }
    }

    // PUT /api/analytics/users/{id}/activate
    public function activate(int $id): JsonResponse
    {
        return $this->setActiveStatus($id, 1);
    }

    // PUT /api/analytics/users/{id}/deactivate
    public function deactivate(int $id): JsonResponse
    {
        return $this->setActiveStatus($id, 0);
    }

    private function setActiveStatus(int $id, int $status): JsonResponse
    {
        try {
            $updated = DB::table('users')->where('id', $id)->whereNull('deleted_at')
                ->update(['is_active' => $status, 'updated_at' => now()]);

            if (!$updated) {
                return response()->json(['message' => 'User not found.'], 404);
            }

            return response()->json([
                'message' => $status ? 'User activated.' : 'User deactivated.',
            ]);
        } catch (\Throwable $e) {
            return $this->serverError($e);
        }
    }

    // DELETE /api/analytics/users/{id}
    public function destroy(int $id): JsonResponse
    {
        try {
            $updated = DB::table('users')->where('id', $id)->whereNull('deleted_at')
                ->update(['deleted_at' => now()]);

            if (!$updated) {
                return response()->json(['message' => 'User not found.'], 404);
            }

            return response()->json(['message' => 'User deleted.']);
        } catch (\Throwable $e) {
            return $this->serverError($e);
        }
    }

    // POST /api/analytics/users
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name'   => 'required|string|max:255',
            'last_name'    => 'required|string|max:255',
            'email'        => 'required|email|unique:users,email',
            'user_name'    => 'required|string|max:255|unique:users,user_name',
            'phone_number' => 'nullable|string|max:20',
            'active'       => 'required|in:0,1',
            'roles'        => 'required|integer|exists:roles,id',
        ]);

        try {
            $userId = DB::table('users')->insertGetId([
                'first_name'   => $validated['first_name'],
                'last_name'    => $validated['last_name'],
                'email'        => $validated['email'],
                'user_name'    => $validated['user_name'],
                'phone_number' => $validated['phone_number'] ?? null,
                'is_active'    => $validated['active'],
                'password'     => Hash::make(\Str::random(12)),
                'created_at'   => now(),
                'updated_at'   => now(),
            ]);

            DB::table('model_has_roles')->insert([
                'role_id'    => $validated['roles'],
                'model_type' => 'App\\Models\\User',
                'model_id'   => $userId,
            ]);

            return response()->json(['message' => 'User created.', 'id' => $userId], 201);
        } catch (\Throwable $e) {
            return $this->serverError($e);
        }
    }

    // PUT /api/analytics/users/{id}
    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'first_name'           => 'sometimes|string|max:255',
            'last_name'            => 'sometimes|string|max:255',
            'email'                => "sometimes|email|unique:users,email,{$id}",
            'user_name'            => "sometimes|string|max:255|unique:users,user_name,{$id}",
            'phone_number'         => 'nullable|string|max:20',
            'active'               => 'sometimes|in:0,1',
            'roles'                => 'sometimes|integer|exists:roles,id',
            'location'             => 'nullable|string|max:255',
            'short_bio'            => 'nullable|string',
            'company_designation'  => 'nullable|string|max:255',
            'profile_img'          => 'nullable|image|max:2048',
        ]);

        try {
            $payload = collect($validated)
                ->except(['roles', 'profile_img', 'active'])
                ->filter(fn ($v) => $v !== null || in_array($v, ['location','short_bio','company_designation']))
                ->toArray();

            if (isset($validated['active'])) {
                $payload['is_active'] = $validated['active'];
            }

            if ($request->hasFile('profile_img')) {
                $file = $request->file('profile_img');
                $filename = 'prof_img_' . $id . '_' . time() . '.' . $file->getClientOriginalExtension();
                $path = $file->storeAs('profile_img', $filename, 'public');
                $payload['profile_img'] = $path;
            }

            if (!empty($payload)) {
                $payload['updated_at'] = now();
                DB::table('users')->where('id', $id)->update($payload);
            }

            if (!empty($validated['roles'])) {
                DB::table('model_has_roles')
                    ->where('model_id', $id)
                    ->where('model_type', 'App\\Models\\User')
                    ->delete();
                DB::table('model_has_roles')->insert([
                    'role_id'    => $validated['roles'],
                    'model_type' => 'App\\Models\\User',
                    'model_id'   => $id,
                ]);
            }

            return response()->json(['message' => 'User updated.']);
        } catch (\Throwable $e) {
            return $this->serverError($e);
        }
    }

    private function serverError(\Throwable $e): JsonResponse
    {
        return response()->json([
            'message' => 'Server error.',
            'error'   => config('app.debug') ? $e->getMessage() : null,
        ], 500);
    }
}
