<?php

namespace Modules\Invoice\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\Subscription\SubscriptionLimitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Modules\Invoice\Models\InvoiceClient;
use Modules\Invoice\Models\RecurringStatement;
use Modules\User\Models\User;

class RecurringStatementController extends Controller
{
    public function __construct(
        private readonly SubscriptionLimitService $subscriptionLimits
    ) {}

    public function index(Request $request): JsonResponse
    {
        $hostId = $this->resolveHostId($request);
        if ($hostId <= 0) {
            return response()->json(['success' => false, 'message' => 'host_id is required.'], 422);
        }

        $this->subscriptionLimits->assertFeature($request->user(), 'recurring_statements');

        $rows = RecurringStatement::query()
            ->where('host_id', $hostId)
            ->with(['client:id,name,email'])
            ->orderByDesc('is_active')
            ->orderBy('next_run_at')
            ->get();

        return response()->json(['success' => true, 'data' => $rows]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->subscriptionLimits->assertFeature($request->user(), 'recurring_statements');

        $hostId = $this->resolveHostId($request);
        if ($hostId <= 0) {
            return response()->json(['success' => false, 'message' => 'host_id is required.'], 422);
        }

        $validator = Validator::make($request->all(), $this->rules());
        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $authUser = $request->user();

        if (! empty($data['pdf_type'])) {
            $this->subscriptionLimits->assertCanUseTemplate($authUser, (string) $data['pdf_type']);
        }

        if (! empty($data['client_id'])) {
            $this->assertClientOnHost((int) $data['client_id'], $hostId);
        }

        $row = RecurringStatement::create([
            'host_id' => $hostId,
            'team_id' => $authUser instanceof User ? ($authUser->team_id ?? null) : null,
            'created_by' => $authUser?->id,
            'client_id' => $data['client_id'] ?? null,
            'title' => $data['title'],
            'frequency' => $data['frequency'],
            'amount' => $data['amount'] ?? null,
            'currency' => strtoupper($data['currency'] ?? 'GBP'),
            'pdf_type' => $data['pdf_type'] ?? 'classic',
            'next_run_at' => $data['next_run_at'],
            'is_active' => (bool) ($data['is_active'] ?? true),
            'notes' => $data['notes'] ?? null,
        ]);

        return response()->json(['success' => true, 'data' => $row->load('client:id,name,email')], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $this->subscriptionLimits->assertFeature($request->user(), 'recurring_statements');

        $hostId = $this->resolveHostId($request);
        $row = RecurringStatement::query()->where('host_id', $hostId)->find($id);
        if (! $row) {
            return response()->json(['success' => false, 'message' => 'Recurring statement not found.'], 404);
        }

        $validator = Validator::make($request->all(), $this->rules(partial: true));
        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        if (! empty($data['pdf_type'])) {
            $this->subscriptionLimits->assertCanUseTemplate($request->user(), (string) $data['pdf_type']);
        }
        if (! empty($data['client_id'])) {
            $this->assertClientOnHost((int) $data['client_id'], $hostId);
        }

        $row->update($data);

        return response()->json(['success' => true, 'data' => $row->fresh()->load('client:id,name,email')]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->subscriptionLimits->assertFeature($request->user(), 'recurring_statements');

        $hostId = $this->resolveHostId($request);
        $row = RecurringStatement::query()->where('host_id', $hostId)->find($id);
        if (! $row) {
            return response()->json(['success' => false, 'message' => 'Recurring statement not found.'], 404);
        }

        $row->delete();

        return response()->json(['success' => true, 'message' => 'Recurring statement deleted.']);
    }

    /** @return array<string, mixed> */
    private function rules(bool $partial = false): array
    {
        $freq = 'in:weekly,monthly,quarterly,yearly';
        $rules = [
            'title' => ($partial ? 'sometimes|' : '').'required|string|max:255',
            'frequency' => ($partial ? 'sometimes|' : 'required|').'string|'.$freq,
            'amount' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|size:3',
            'pdf_type' => 'nullable|string|max:32',
            'next_run_at' => ($partial ? 'sometimes|' : 'required|').'date',
            'client_id' => 'nullable|integer|min:1',
            'is_active' => 'nullable|boolean',
            'notes' => 'nullable|string|max:5000',
            'host_id' => 'nullable|integer|min:1',
        ];

        return $rules;
    }

    private function resolveHostId(Request $request): int
    {
        $fromQuery = (int) $request->query('host_id', 0);
        if ($fromQuery > 0) {
            return $fromQuery;
        }

        $user = $request->user();
        if ($user instanceof User) {
            return (int) ($user->host_id ?? 0);
        }

        return 0;
    }

    private function assertClientOnHost(int $clientId, int $hostId): void
    {
        $exists = InvoiceClient::query()
            ->where('id', $clientId)
            ->where('host_id', $hostId)
            ->exists();

        if (! $exists) {
            abort(response()->json([
                'success' => false,
                'message' => 'Client does not belong to this account.',
            ], 422));
        }
    }
}
