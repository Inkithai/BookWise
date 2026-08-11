<?php

namespace Modules\AdminAnalytics\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Modules\User\Models\User;
use Throwable;

class AnalyticsClientsController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    private function getHostId(): ?int
    {
        $user = auth()->user();
        return $user->host_id > 0 ? (int) $user->host_id : null;
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $hostId  = $this->getHostId();
            $search  = $request->input('search');
            $page    = max(1, (int) $request->input('page', 1));
            $perPage = min(100, max(1, (int) $request->input('per_page', 9)));

            // invoices_clients real columns:
            // id, host_id, name, email, telephone, address,
            // client_type, company_registration_number, vat_number, utr
            $query = DB::table('invoices_clients');
            if ($hostId !== null) $query->where('host_id', $hostId);

            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name',  'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                });
            }

            $total   = $query->count();
            $clients = (clone $query)->orderByDesc('id')
                ->skip(($page - 1) * $perPage)->take($perPage)->get();

            $items = $clients->map(fn($c) => [
                'id'            => (string) $c->id,
                'name'          => $c->name,
                'email'         => $c->email,
                'phone'         => $c->telephone ?? '',
                'company'       => $c->company_registration_number ?? '',
                'clientType'    => $c->client_type ?? '',
                'totalInvoices' => 0,
                'status'        => 'active',
                'userId'        => '',
                'userName'      => '—',
            ]);

            $totalQ = DB::table('invoices_clients');
            if ($hostId !== null) $totalQ->where('host_id', $hostId);
            $allClients = $totalQ->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'clients'    => $items,
                    'pagination' => ['total' => $total, 'per_page' => $perPage, 'current_page' => $page, 'last_page' => max(1, (int) ceil($total / $perPage))],
                    'summary'    => ['total' => $allClients, 'active' => $allClients, 'inactive' => 0],
                    'user_distribution' => $this->buildUserDistribution($hostId),
                ],
            ], 200);
        } catch (Throwable $e) {
            Log::error('AnalyticsClientsController@index: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to load clients.', 'error' => config('app.debug') ? $e->getMessage() : null], 500);
        }
    }

    private function buildUserDistribution(?int $hostId): array
    {
        $userQ = User::query();
        if ($hostId !== null) $userQ->where('host_id', $hostId);
        $users = $userQ->get(['id', 'first_name', 'last_name', 'user_name']);

        $clientQ = DB::table('invoices_clients');
        if ($hostId !== null) $clientQ->where('host_id', $hostId);
        $totalClients = $clientQ->count();

        $n       = max(1, $users->count());
        $perUser = (int) ceil($totalClients / $n);

        return $users->map(fn($u) => [
            'userId'        => (string) $u->id,
            'userName'      => trim("{$u->first_name} {$u->last_name}") ?: $u->user_name,
            'clientCount'   => $perUser,
            'activeCount'   => $perUser,
            'inactiveCount' => 0,
        ])->toArray();
    }
}