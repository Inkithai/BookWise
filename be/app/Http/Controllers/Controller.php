<?php

namespace App\Http\Controllers;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;

abstract class Controller extends BaseController
{
    use AuthorizesRequests;

    /**
     * Authorize the action, or allow if the user has admin/super-admin role (direct DB check).
     * This runs instead of the Gate for these users so Spatie's team-scoped check cannot block them.
     */
    public function authorize($ability, $arguments = [])
    {
        $user = request()->user();
        if ($user && $this->userHasAdminOrSuperAdminRole($user)) {
            return;
        }
        return parent::authorize($ability, $arguments);
    }

    private function userHasAdminOrSuperAdminRole($user): bool
    {
        $pivotTable = config('permission.table_names.model_has_roles', 'model_has_roles');
        $rolesTable = config('permission.table_names.roles', 'roles');
        $modelTypes = array_unique([
            get_class($user),
            'Modules\User\Models\User',
            'App\Models\User',
        ]);

        return DB::table($pivotTable)
            ->join($rolesTable, "{$rolesTable}.id", '=', "{$pivotTable}.role_id")
            ->where("{$pivotTable}.model_id", $user->getKey())
            ->whereIn("{$pivotTable}.model_type", $modelTypes)
            ->whereIn("{$rolesTable}.name", ['admin', 'super-admin'])
            ->exists();
    }

    /**
     *  @OA\Info(
     *     title="BookWise Accounting APIs",
     *     description="BookWise — multi-tenant accounting & bookkeeping API for SMBs.",
     *     version="1.0"
     * )
     * 
     *  @OA\Server(
     *     url="https://invoicingapi.bookwise.io",
     *     description="Latest Production Server"
     * )
     *
     * @OA\Server(
     *     url="http://127.0.0.1:8080",
     *     description="Local Development Server"
     * )
     *
     * @OA\SecurityScheme(
     *     securityScheme="bearerAuth",
     *     type="http",
     *     description="Enter JWT Bearer token",
     *     name="Authorization",
     *     in="header",
     *     scheme="bearer",
     *     bearerFormat="JWT",
     * )
     */
    protected function handleException(Throwable $e, ?string $context = null)
    {
        if ($context) {
            Log::error("[{$context}] Exception: ".$e->getMessage(), [
                'exception' => $e,
                'context' => $context,
                'trace' => $e->getTraceAsString(),
            ]);
        } else {
            Log::error('Unhandled Exception: '.$e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString(),
            ]);
        }

        $status = 500;
        $message = $e->getMessage();
        $errors = [];

        switch (true) {
            case $e instanceof ValidationException:
                $status = 422;
                $message = 'Validation failed';
                $errors = $e->errors();
                break;

            case $e instanceof ModelNotFoundException:
                $status = 404;
                $message = 'Resource not found';
                break;

            case $e instanceof AuthenticationException:
                $status = 401;
                $message = 'Unauthenticated';
                break;

            case $e instanceof AuthorizationException:
                $status = 403;
                $message = 'You do not have permission to perform this action.';
                break;

            case $e instanceof HttpException:
                $status = $e->getStatusCode();
                $message = $e->getMessage() ?: 'HTTP error';
                break;

            case $e instanceof HttpResponseException:
                return $e->getResponse();

            // ── Handle database integrity constraint violations (e.g., duplicate invoice numbers) ──
            case $e instanceof \Illuminate\Database\QueryException:
                if (str_contains($e->getMessage(), 'unique_invoice_code_per_company')) {
                    $status = 422;
                    $message = 'This invoice number already exists for this company. Please use a different number.';
                    $errors = ['invoice_code' => [$message]];
                } elseif (str_contains($e->getMessage(), 'UNIQUE constraint failed')) {
                    $status = 422;
                    $message = 'A record with this value already exists. Please use a different value.';
                } else {
                    $status = 422;
                    $message = 'Database operation failed. Please try again.';
                }
                break;
        }

        $response = [
            'error' => true,
            'message' => $message,
            'code' => $status,
            'errors' => $errors,
            'timestamp' => now()->toIso8601String(),
        ];

        if (config('app.debug')) {
            $response['debug'] = [
                'exception' => get_class($e),
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ];
        }

        return response()->json($response, $status);
    }
}
