<?php

// ─────────────────────────────────────────────────────────────────────────────
// TEMPORARY DIAGNOSTIC CONTROLLER
// Add this route to your api.php ABOVE the auth:api middleware group:
//
//   Route::get('/v1/admin/analytics/debug', [AnalyticsDiagnosticController::class, 'run']);
//
// Then hit: GET /api/v1/admin/analytics/debug?token=YOUR_BEARER_TOKEN
// Remove this file once the real endpoints are working.
// ─────────────────────────────────────────────────────────────────────────────

namespace Modules\AdminAnalytics\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class AnalyticsDiagnosticController extends Controller
{
    public function run(Request $request): JsonResponse
    {
        $checks = [];

        // 1. Auth guard
        try {
            $user = auth('api')->user();
            $checks['auth'] = $user
                ? ['ok' => true,  'user_id' => $user->id, 'host_id' => $user->host_id ?? null]
                : ['ok' => false, 'error'   => 'auth()->user() returned null — token missing or invalid'];
        } catch (Throwable $e) {
            $checks['auth'] = ['ok' => false, 'error' => $e->getMessage()];
        }

        // 2. Invoice model resolution
        try {
            $cls = class_exists(\Modules\Invoice\Models\Invoice::class)
                ? \Modules\Invoice\Models\Invoice::class
                : (class_exists(\App\Models\Invoice::class) ? \App\Models\Invoice::class : null);

            $checks['invoice_model'] = $cls
                ? ['ok' => true, 'class' => $cls]
                : ['ok' => false, 'error' => 'Neither Modules\Invoice\Models\Invoice nor App\Models\Invoice found'];
        } catch (Throwable $e) {
            $checks['invoice_model'] = ['ok' => false, 'error' => $e->getMessage()];
        }

        // 3. Tables exist
        foreach (['invoices', 'invoice_clients', 'users', 'activity_logs'] as $table) {
            try {
                $exists = DB::getSchemaBuilder()->hasTable($table);
                $checks["table_{$table}"] = ['ok' => $exists, 'exists' => $exists];
            } catch (Throwable $e) {
                $checks["table_{$table}"] = ['ok' => false, 'error' => $e->getMessage()];
            }
        }

        // 4. invoice_clients.user_id column
        try {
            $has = DB::getSchemaBuilder()->hasColumn('invoice_clients', 'user_id');
            $checks['invoice_clients_user_id_col'] = ['ok' => true, 'exists' => $has];
        } catch (Throwable $e) {
            $checks['invoice_clients_user_id_col'] = ['ok' => false, 'error' => $e->getMessage()];
        }

        // 5. ActivityLog model
        try {
            $count = \App\Models\ActivityLog::count();
            $checks['activity_log_model'] = ['ok' => true, 'row_count' => $count];
        } catch (Throwable $e) {
            $checks['activity_log_model'] = ['ok' => false, 'error' => $e->getMessage()];
        }

        // 6. Quick row counts (only if auth passed)
        if (!empty($checks['auth']['ok'])) {
            $diagUser = auth('api')->user();
            $hostId = $diagUser->host_id ?? auth('api')->id();
            if (
                (string) ($diagUser->active_context_type ?? 'personal') === 'company'
                && !empty($diagUser->active_company_id)
            ) {
                $company = \App\Models\Company::where('id', (int) $diagUser->active_company_id)
                    ->where('owner_user_id', $diagUser->id)
                    ->first();
                if ($company && $company->host_id) {
                    $hostId = (int) $company->host_id;
                }
            }
            foreach ([
                'invoices'        => fn() => DB::table('invoices')->where('host_id', $hostId)->whereNull('deleted_at')->count(),
                'invoice_clients' => fn() => DB::table('invoice_clients')->where('host_id', $hostId)->count(),
                'users'           => fn() => DB::table('users')->where('host_id', $hostId)->count(),
            ] as $label => $fn) {
                try {
                    $checks["count_{$label}"] = ['ok' => true, 'count' => $fn()];
                } catch (Throwable $e) {
                    $checks["count_{$label}"] = ['ok' => false, 'error' => $e->getMessage()];
                }
            }
        }

        $allOk = collect($checks)->every(fn($c) => $c['ok'] ?? false);

        return response()->json([
            'overall' => $allOk ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED',
            'checks'  => $checks,
        ], $allOk ? 200 : 500);
    }
}