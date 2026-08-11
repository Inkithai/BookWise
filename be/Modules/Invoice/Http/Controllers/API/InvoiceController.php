<?php

namespace Modules\Invoice\Http\Controllers\API;

use App\Enums\InvoicePaymentStatusEnum;
use App\Enums\InvoiceStatus;
use App\Http\Controllers\Controller;
use App\Services\Subscription\SubscriptionLimitService;
use Illuminate\Http\Exceptions\HttpResponseException;
use App\Models\Company;
use App\Models\Host;
use App\Models\HostUserDetail;
use App\Traits\LogsActivity;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Modules\Invoice\Http\Requests\SendInvoiceMailRequest;
use Modules\Invoice\Http\Requests\StoreInvoiceClientRequest;
use Modules\Invoice\Http\Requests\StoreInvoiceRequest;
use Modules\Invoice\Http\Requests\UpdateInvoiceClientRequest;
use Modules\Invoice\Http\Requests\UpdateInvoiceRequest;
use Modules\Invoice\Http\Resources\InvoiceCreateResource;
use Modules\Invoice\Http\Resources\InvoiceMailResource;
use Modules\Invoice\Http\Resources\InvoiceResource;
use Modules\Invoice\Mail\InvoiceSendEmail;
use Modules\Invoice\Models\Invoice;
use Modules\Invoice\Models\InvoiceCompany;
use Modules\Invoice\Models\InvoiceClient;
use Modules\Invoice\Repositories\InvoiceInterface;
use Modules\Invoice\Models\Receipt;
use Modules\User\Models\User;
use App\Models\UserStripeFeeSetting;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Validator;
use Modules\User\Models\UserBank;
use Stripe\Checkout\Session;
use Stripe\Stripe;
use Stripe\StripeClient;
use Throwable;

/**
 * @OA\Tag(
 *     name="Invoices",
 *     description="API Endpoints for Managing Invoice , Invoice Clients"
 * )
 */
class InvoiceController extends Controller
{
    use AuthorizesRequests;
    use LogsActivity;

    protected InvoiceInterface $invoiceInterface;

    protected SubscriptionLimitService $subscriptionLimits;

    public function __construct(
        InvoiceInterface $invoiceInterface,
        SubscriptionLimitService $subscriptionLimits
    ) {
        $this->invoiceInterface = $invoiceInterface;
        $this->subscriptionLimits = $subscriptionLimits;

        // Ensure API auth
        $this->middleware('auth:api');
    }

    /**
     * @OA\Get(
     *     path="/api/v1/admin/invoices",
     *     summary="Get all invoices",
     *     tags={"Invoices"},
     *     operationId="getInvoices",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(
     *         name="search",
     *         in="query",
     *         description="Search term",
     *         required=false,
     *
     *         @OA\Schema(type="string")
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="List of invoices",
     *
     *         @OA\JsonContent(type="array", @OA\Items(ref="#/components/schemas/InvoiceResource"))
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
            $this->authorize('invoice.view', Invoice::class);

            $invoices = $this->invoiceInterface->getAllData($request->all());

            return response()->json([
                'success' => true,
                'data' => InvoiceResource::collection($invoices),
            ], Response::HTTP_OK);
        } catch (Throwable $e) {
            return $this->handleException($e, 'InvoiceController@index');
        }
    }

    /**
     * @OA\Get(
     *     path="/api/v1/admin/invoices/get-clients",
     *     summary="Get all invoice clients",
     *     tags={"Invoices"},
     *     operationId="getInvoiceClient",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(response=200, description="Client list"),
     *     @OA\Response(response=404, description="Resource not found", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function getClients()
    {
        try {
            $this->authorize('invoice-client.view', InvoiceClient::class);

            $clients = $this->invoiceInterface->getAllInvoiceClients();

            return response()->json(['success' => true, 'data' => $clients]);
        } catch (Throwable $e) {
            return $this->handleException($e, 'InvoiceController@getClients');
        }
    }

    /**
     * @OA\Post(
     *     path="/api/v1/admin/invoices/clients/store",
     *     tags={"Invoices"},
     *     summary="Create a new invoice client",
     *     operationId="storeInvoiceClient",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\RequestBody(
     *          required=true,
     *
     *          @OA\JsonContent(ref="#/components/schemas/StoreInvoiceClientRequest")
     *     ),
     *
     *     @OA\Response(
     *         response=201,
     *         description="Client created successfully",
     *
     *         @OA\JsonContent(
     *             type="object",
     *
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Invoice client created successfully"),
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="id", type="integer", example=1),
     *                 @OA\Property(property="name", type="string", example="John Doe"),
     *                 @OA\Property(property="email", type="string", example="john@example.com"),
     *                 @OA\Property(property="telephone", type="string", example="+94 77 123 4567"),
     *                 @OA\Property(property="address", type="string", example="123 Main Street, Colombo"),
     *                 @OA\Property(property="host_id", type="integer", example=1)
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
    public function storeInvoiceClient(StoreInvoiceClientRequest $request)
    {
        try {
            $this->authorize('invoice-client.create', InvoiceClient::class);

            $data = $request->validated();
            $host_id = $this->resolveActiveHostId();
            $team_id = $this->resolveActiveTeamId();
            $data['host_id'] = $host_id;
            $data['team_id'] = $team_id;

            $this->subscriptionLimits->assertCanCreateClient(auth()->user(), (int) $host_id);

            $client = InvoiceClient::create($data);

            // 🧾 Log activity
            $this->logActivity(
                type: 'Invoice-client',
                action: 'Invoice client created',
                relatedId: $client->id ?? null,
                details: [
                    'status' => 'success',
                    'message' => 'Invoice client created successfully',
                    'data' => $client->toArray(),
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Invoice client created successfully',
                'data' => $client,
            ], 201);
        } catch (HttpResponseException $e) {
            throw $e;
        } catch (Throwable $e) {
            // ❌ Log unexpected failure
            $this->logActivity(
                'Invoice-client',
                'Invoice client Create Failed (Exception)',
                null,
                [
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ]
            );

            return $this->handleException($e, 'InvoiceController@storeInvoiceClient');
        }
    }

    /**
     * @OA\Get(
     *     path="/api/v1/admin/invoices/clients/show/{id}",
     *     summary="Get a single invoice client by ID",
     *     tags={"Invoices"},
     *     operationId="getInvoiceClientById",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         description="Invoice client ID",
     *         required=true,
     *
     *         @OA\Schema(type="integer")
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Client retrieved successfully",
     *
     *         @OA\JsonContent(
     *             type="object",
     *
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="id", type="integer", example=1),
     *                 @OA\Property(property="name", type="string", example="John Doe"),
     *                 @OA\Property(property="email", type="string", example="john@example.com"),
     *                 @OA\Property(property="telephone", type="string", example="+94 77 123 4567"),
     *                 @OA\Property(property="address_no", type="string", example="123"),
     *                 @OA\Property(property="address_street", type="string", example="Main Street"),
     *                 @OA\Property(property="address_city", type="string", example="Colombo"),
     *                 @OA\Property(property="address_town", type="string", example="Colombo"),
     *                 @OA\Property(property="address_postcode", type="string", example="12345"),
     *                 @OA\Property(property="address_county", type="string", example="Western Province"),
     *                 @OA\Property(property="address_country", type="string", example="Sri Lanka"),
     *                 @OA\Property(property="host_id", type="integer", example=1),
     *                 @OA\Property(property="client_type", type="string", example="business"),
     *                 @OA\Property(property="company_registration_number", type="string", example="SC123456"),
     *                 @OA\Property(property="vat_number", type="string", example="GB123456789"),
     *                 @OA\Property(property="utr", type="string", example="1234567890"),
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
    public function showInvoiceClient(int $id)
    {
        try {
            $this->authorize('invoice-client.view', InvoiceClient::class);

            $hostId = $this->resolveActiveHostId();
            $teamId = $this->resolveActiveTeamId();

            // Fetch client for this host/team
            $query = InvoiceClient::where('host_id', $hostId);
            if ($teamId) {
                $query->where(function ($q) use ($teamId) {
                    $q->where('team_id', $teamId)
                      ->orWhereNull('team_id');
                });
            }
            $client = $query->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $client,
            ], 200);
        } catch (Throwable $e) {
            return $this->handleException($e, 'InvoiceController@getClientById');
        }
    }

    /**
     * @OA\Put(
     *     path="/api/v1/admin/invoices/clients/update/{id}",
     *     tags={"Invoices"},
     *     summary="Update an existing invoice client",
     *     operationId="updateInvoiceClient",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Invoice client ID",
     *
     *         @OA\Schema(type="integer", example=1)
     *     ),
     *
     *     @OA\RequestBody(
     *          required=true,
     *
     *          @OA\JsonContent(ref="#/components/schemas/UpdateInvoiceClientRequest")
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Client updated successfully",
     *
     *         @OA\JsonContent(
     *             type="object",
     *
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Invoice client updated successfully"),
     *             @OA\Property(property="data", ref="#/components/schemas/StoreInvoiceClientRequest")
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
    public function updateInvoiceClient(UpdateInvoiceClientRequest $request, int $id)
    {
        try {

            $hostId = $this->resolveActiveHostId();
            $teamId = $this->resolveActiveTeamId();

            // Ensure client belongs to current host/team
            $query = InvoiceClient::where('host_id', $hostId);
            if ($teamId) {
                $query->where(function ($q) use ($teamId) {
                    $q->where('team_id', $teamId)
                      ->orWhereNull('team_id');
                });
            }
            $client = $query->findOrFail($id);

            $this->authorize('invoice-client.edit', $client);

            $data = $request->validated();

            $finalClientType = $data['client_type'] ?? $client->client_type;

            // If switched to Personal, keep only company/vat cleared.
            // UTR is intentionally allowed for Personal as optional.
            if ($finalClientType === 'Personal') {
                $data['company_registration_number'] = null;
                $data['vat_number'] = null;
            }

            // $client->update($request->validated());
            $client->update($data);

            // 🧾 Log activity
            $this->logActivity(
                type: 'Invoice-client',
                action: 'Invoice client updated',
                relatedId: $client->id ?? null,
                details: [
                    'status' => 'success',
                    'message' => 'Invoice client updated successfully',
                    'data' => $client->toArray(),
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Invoice client updated successfully',
                'data' => $client,
            ], 200);
        } catch (Throwable $e) {
            // ❌ Log unexpected failure
            $this->logActivity(
                'Invoice-client',
                'Invoice client updated Failed (Exception)',
                null,
                [
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ]
            );

            return $this->handleException($e, 'InvoiceController@updateInvoiceClient');
        }
    }

    /**
     * @OA\Delete(
     *     path="/api/v1/admin/invoices/clients/delete/{id}",
     *     tags={"Invoices"},
     *     summary="Delete an invoice client permanently",
     *     operationId="deleteInvoiceClient",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         description="ID of the invoice client to delete",
     *         required=true,
     *
     *         @OA\Schema(type="integer")
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Client deleted successfully",
     *
     *         @OA\JsonContent(
     *             type="object",
     *
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Invoice client deleted successfully!")
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
    public function destroyInvoiceClient(int $id)
    {
        try {
            $hostId = $this->resolveActiveHostId();
            $teamId = $this->resolveActiveTeamId();

            // Ensure the client belongs to the current host/team
            $query = InvoiceClient::where('host_id', $hostId);
            if ($teamId) {
                $query->where(function ($q) use ($teamId) {
                    $q->where('team_id', $teamId)
                      ->orWhereNull('team_id');
                });
            }
            $client = $query->findOrFail($id);

            $this->authorize('invoice-client.delete', $client);

            // Hard delete
            $client->forceDelete();

            // 🧾 Log activity
            $this->logActivity(
                type: 'Invoice-client',
                action: 'Invoice client deleted',
                relatedId: $client->id ?? null,
                details: [
                    'status' => 'success',
                    'message' => 'Invoice client deleted successfully',
                    'deleted_client' => [
                        'id' => $client->id,
                        'name' => $client->name ?? null,
                    ],
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Invoice client deleted successfully!',
            ], 200);
        } catch (Throwable $e) {
            // ❌ Log failure
            $this->logActivity(
                'Invoice-client',
                'Invoice client Delete Failed',
                $id,
                [
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ]
            );

            return $this->handleException($e, 'InvoiceController@deleteInvoiceClient');
        }
    }

    /**
     * @OA\Get(
     *     path="/api/v1/admin/invoices/get-types",
     *     summary="Get all invoice types",
     *     tags={"Invoices"},
     *     operationId="getInvoicesTypes",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(response=200, description="Invoice types"),
     *     @OA\Response(response=404, description="Resource not found", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function getTypes()
    {
        try {
            $this->authorize('invoice.view', Invoice::class);

            $types = $this->invoiceInterface->getAllInvoiceTypes();

            return response()->json(['success' => true, 'data' => $types]);
        } catch (Throwable $e) {
            return $this->handleException($e, 'InvoiceController@getTypes');
        }
    }

    /**
     * @OA\Get(
     *     path="/api/v1/admin/invoices/get-data",
     *     summary="Get invoice creation dropdown data",
     *     tags={"Invoices"},
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(response=200, description="Success", @OA\JsonContent(ref="#/components/schemas/InvoiceCreateResource")),
     *     @OA\Response(response=404, description="Resource not found", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function getData(): JsonResponse
    {
        try {
            $this->authorize('invoice.view', Invoice::class);

            $clients = $this->invoiceInterface->getAllInvoiceClients();
            $invoiceTypes = $this->invoiceInterface->getAllInvoiceTypes();

            $hostId = $this->resolveActiveHostId();
            $invCode = $this->invoiceInterface->generateInvoiceCode($hostId);

            $data = [
                'host_id' => $hostId,
                'invoice_code' => $invCode,
                'clients' => $clients,        // now plain array
                'invoice_types' => $invoiceTypes, // now plain array
            ];

            return response()->json([
                'success' => true,
                'message' => 'Invoice creation data fetched successfully',
                'data' => new InvoiceCreateResource($data),
            ], 200);
        } catch (Throwable $e) {
            // Log error for debugging
            Log::error('InvoiceController@getData failed: ' . $e->getMessage());

            return $this->handleException($e, 'InvoiceController@getData');
        }
    }

    /**
     * @OA\Post(
     *     path="/api/v1/admin/invoices/store",
     *     tags={"Invoices"},
     *     summary="Create a new invoice",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\RequestBody(
     *         required=true,
     *         description="Invoice creation with optional PDF upload",
     *
     *         @OA\MediaType(
     *             mediaType="application/json",
     *
     *             @OA\Schema(ref="#/components/schemas/StoreInvoiceRequest")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Invoice created successfully",
     *
     *         @OA\JsonContent(ref="#/components/schemas/InvoiceResource")
     *     ),
     *
     *     @OA\Response(response=404, description="Resource not found", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function store(StoreInvoiceRequest $request): JsonResponse
    {
        try {
            $this->authorize('invoice.create', Invoice::class);

            $data = $request->validated();
            $requiresBankPayment = (bool) ($data['bank_payment'] ?? false);
            $requiresStripePaymentLink = (bool) ($data['payment_link'] ?? false);

            $authUser = auth()->user();

            $host_id = $this->resolveActiveHostId($data);
            $team_id = $this->resolveActiveTeamId($data);
            $data['host_id'] = $host_id;
            $data['team_id'] = $team_id;

            $this->subscriptionLimits->assertCanCreateInvoice($authUser, (int) $host_id);

            if (! empty($data['items']) && is_array($data['items'])) {
                $this->subscriptionLimits->assertInvoiceCurrencies(
                    $authUser,
                    $data['items'],
                    isset($data['company_id']) ? (int) $data['company_id'] : null,
                    (int) $host_id,
                );
            }

            if (! empty($data['pdf_type'])) {
                $this->subscriptionLimits->assertCanUseTemplate($authUser, (string) $data['pdf_type'], (int) $host_id);
            }

            if ($requiresStripePaymentLink) {
                $this->subscriptionLimits->assertFeature($authUser, 'accept_online_payments', (int) $host_id);
            }

            // Keep the host_id/team_id re-query, but do not hard-fail (firstOrFail)
            // because in some cases the host/team mapping can be temporarily out of sync,
            // which causes ModelNotFoundException -> 404.
            $query = User::where('host_id', $host_id);
            if ($team_id) {
                $query->where('team_id', $team_id);
            }

            $user = $query->first();

            // Fallback: re-query by authenticated user id if scoped query returns nothing.
            if (! $user && $authUser) {
                $user = User::where('id', $authUser->id)->first();
            }

            // Final fallback: use the authenticated user object.
            if (! $user) {
                $user = $authUser;
            }

            $hostForValidation = $this->resolveRequestedCompanyHostId($data);
            $billingUserForValidation = User::primaryBillingUserForHost($hostForValidation) ?? $user;

            // Check bank details against the selected invoice company/host (not current personal context).
            $hasBankDetails = $this->hasHostBankDetails(
                $hostForValidation,
                $billingUserForValidation,
                (int) ($data['company_id'] ?? 0)
            );

            // Also accept bank details sent from the frontend payload as valid.
            if (!$hasBankDetails && !empty($data['account_name']) && !empty($data['account_number']) && !empty($data['sort_code'])) {
                $hasBankDetails = true;
            }

            if (($data['bank_payment'] ?? false) && !$hasBankDetails) {
                // Auto-disable bank payment instead of blocking invoice creation
                $data['bank_payment'] = false;
            }

            // Resolve Stripe status for the billing user/host context.
            $hostStripeStatus = \App\Models\HostUserStripe::where('host_user_id', $billingUserForValidation->id)
                ->where('host_id', $hostForValidation)
                ->value('stripe_connection_status')
                ?? $billingUserForValidation->stripe_connection_status
                ?? 'not_connected';

            // Fallback: auth user's own Stripe (handles rootless super-admin).
            if ($hostStripeStatus !== 'connected') {
                $authId = (int) \Illuminate\Support\Facades\Auth::id();
                if ($authId && $authId !== (int) $billingUserForValidation->id) {
                    $hostStripeStatus = \App\Models\HostUserStripe::where('host_user_id', $authId)
                        ->where('host_id', $hostForValidation)
                        ->value('stripe_connection_status') ?? 'not_connected';

                    // Second fallback: rootless super-admin — Stripe record may use any host_id.
                    if ($hostStripeStatus !== 'connected') {
                        $hostStripeStatus = \App\Models\HostUserStripe::where('host_user_id', $authId)
                            ->where('stripe_connection_status', 'connected')
                            ->value('stripe_connection_status') ?? 'not_connected';
                    }
                }
            }

            $hasStripeConnected = $hostStripeStatus === 'connected';

            // Sub-users are blocked when the parent account has NEITHER bank NOR stripe.
            // Parent users (super-admin, company owner, personal) may create invoices freely.
            $primaryBillingUserForHost = User::primaryBillingUserForHost($hostForValidation);
            $isSubUser = $primaryBillingUserForHost
                && ((int) $authUser->id !== (int) $primaryBillingUserForHost->id);



            if (($data['payment_link'] ?? false)) {
                if (!$hasStripeConnected) {
                    $data['payment_link'] = false;
                }
            }

            // 2026-04-29 — Remove meta-field before DB insert (not an invoice column)
            unset($data['all_accounts_view']);

            $invoice = $this->invoiceInterface->store($data);

            // 🧾 Log activity
            $this->logActivity(
                'Invoice',
                'Invoice created',
                $invoice->id ?? null,
                [
                    'status' => 'success',
                    'message' => 'Invoice created successfully',
                    'data' => $invoice->toArray(),
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Invoice created successfully',
                'data' => new InvoiceResource($invoice),
            ], 200);
        } catch (HttpResponseException $e) {
            throw $e;
        } catch (Throwable $e) {
            Log::error('InvoiceController@store failed', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            $this->logActivity(
                'Invoice',
                'Invoice Create Failed',
                null,
                ['status' => 'error', 'message' => $e->getMessage()]
            );

            return $this->handleException($e, 'InvoiceController@store');
        }
    }

    /**
     * @OA\Post(
     *     path="/api/v1/admin/invoices/save-draft",
     *     tags={"Invoices"},
     *     summary="Save an invoice as Draft",
     *     description="Creates an invoice in Draft status. Client and items are optional. PDF is not generated.",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\RequestBody(
     *         required=false,
     *         description="Invoice draft data. Optional fields can be omitted.",
     *         @OA\MediaType(
     *             mediaType="application/json",
     *             @OA\Schema(
     *                 type="object",
     *                 @OA\Property(property="client_id", type="integer", example=1),
     *                 @OA\Property(property="invoice_code", type="string", example="DRAFT-167890"),
     *                 @OA\Property(property="invoice_date", type="string", format="date", example="2026-01-13"),
     *                 @OA\Property(property="due_date", type="string", format="date", example="2026-01-20"),
     *                 @OA\Property(property="total_discount", type="number", format="float", example=0),
     *                 @OA\Property(property="total_vat", type="number", format="float", example=0),
     *                 @OA\Property(property="total_amount", type="number", format="float", example=1000),
     *                 @OA\Property(property="final_amount", type="number", format="float", example=1000),
     *                 @OA\Property(property="quotation_title", type="string", example="Quotation Title"),
     *                 @OA\Property(property="quotation_content", type="string", example="Quotation content goes here"),
     *                 @OA\Property(
     *                     property="items",
     *                     type="array",
     *                     @OA\Items(
     *                         type="object",
     *                         @OA\Property(property="name", type="string", example="Product A"),
     *                         @OA\Property(property="quantity", type="integer", example=2),
     *                         @OA\Property(property="price", type="number", format="float", example=500),
     *                         @OA\Property(property="total", type="number", format="float", example=1000)
     *                     )
     *                 )
     *             )
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=201,
     *         description="Invoice saved as draft successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Invoice saved as draft successfully"),
     *             @OA\Property(property="is_draft", type="boolean", example=true),
     *             @OA\Property(property="data", ref="#/components/schemas/InvoiceResource")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Internal server error",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     )
     * )
     */

    public function saveDraft(Request $request, $id = null): JsonResponse
    {
        try {
            $data = $request->all();
            $validator = Validator::make($data, [
                'company_id' => 'required|integer|min:1',
            ]);
            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $data['status'] = 'Draft';
            $invoice = $id ? $this->invoiceInterface->findById($id) : null;


            if ($invoice) {
                $this->authorize('invoice.edit', $invoice);

                $draft = $this->invoiceInterface->updateDraft($invoice->id, $data);

                return response()->json([
                    'success' => true,
                    'message' => 'Draft updated successfully',
                    'is_draft' => true,
                    'data' => new InvoiceResource($draft),
                ], 200);
            }
            $this->authorize('invoice.create', Invoice::class);



            // Provide defaults for missing optional fields
            $data['status'] = 'Draft';
            $data['invoice_code'] = $data['invoice_code'] ?? null;
            $data['invoice_date'] = $data['invoice_date'] ?? now()->toDateString();
            $data['total_amount'] = (float) ($data['total_amount'] ?? 0);
            $data['final_amount'] = (float) ($data['final_amount'] ?? 0);
            $data['items'] = $data['items'] ?? [];

            // Call InvoiceInterface to save draft
            $invoice = $this->invoiceInterface->storeDraft($data);

            return response()->json([
                'success' => true,
                'message' => 'Invoice saved as draft successfully',
                'is_draft' => true,
                'data' => new InvoiceResource($invoice),
            ], 201);
        } catch (\Throwable $e) {
            // Log the error
            Log::error('InvoiceController@saveDraft failed: ' . $e->getMessage());

            // Optional: log activity if you have a logging method
            if (method_exists($this, 'logActivity')) {
                $this->logActivity(
                    'Invoice',
                    'Draft save failed',
                    null,
                    ['status' => 'error', 'message' => $e->getMessage()]
                );
            }

            return response()->json([
                'success' => false,
                'message' => 'Failed to save draft',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/v1/admin/invoices/show/{id}",
     *     summary="Get invoice details by ID",
     *     tags={"Invoices"},
     *     operationId="getInvoice",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         description="Invoice ID",
     *         required=true,
     *
     *         @OA\Schema(type="integer")
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Invoice details retrieved successfully",
     *
     *         @OA\JsonContent(ref="#/components/schemas/InvoiceResource")
     *     ),
     *
     *     @OA\Response(response=404, description="Resource not found", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function show(int $id): JsonResponse
    {
        try {
            $this->authorize('invoice.view', Invoice::class);

            Log::info('InvoiceController@show called', ['invoice_id' => $id]);

            $invoice = $this->invoiceInterface->findById($id);

            return response()->json([
                'success' => true,
                'message' => 'Invoice retrieved successfully',
                'data' => new InvoiceResource($invoice),
            ], 200);
        } catch (Throwable $e) {
            Log::error('InvoiceController@show failed: ' . $e->getMessage());

            return $this->handleException($e, 'InvoiceController@show');
        }
    }

    /**
     * @OA\Put(
     *     path="/api/v1/admin/invoices/update/{id}",
     *     summary="Update an existing invoice",
     *     tags={"Invoices"},
     *     operationId="updateInvoice",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Invoice ID to update",
     *
     *         @OA\Schema(type="integer")
     *     ),
     *
     *     @OA\RequestBody(
     *         required=true,
     *         description="Invoice update request with services, products, and cleaning fee arrays",
     *
     *         @OA\MediaType(
     *             mediaType="application/json",
     *
     *             @OA\Schema(allOf={
     *                 @OA\Schema(ref="#/components/schemas/UpdateInvoiceRequest")
     *             })
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Invoice updated successfully",
     *
     *         @OA\JsonContent(
     *             type="object",
     *
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Invoice updated successfully"),
     *             @OA\Property(property="data", ref="#/components/schemas/InvoiceResource")
     *         )
     *     ),
     *
     *     @OA\Response(response=404, description="Invoice not found", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function update(UpdateInvoiceRequest $request, int $id)
    {
        try {
            // 🔍 Find the invoice
            $invoice = $this->invoiceInterface->findById($id);
            if (!$invoice) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invoice not found',
                ], 404);
            }

            // 🔐 Authorize the update action
            $this->authorize('invoice.edit', $invoice);

            // ✅ Validate and normalize data
            $validated = $request->validated();
            $requiresBankPayment = (bool) ($validated['bank_payment'] ?? false);
            $requiresStripePaymentLink = (bool) ($validated['payment_link'] ?? false);
            Log::info('Invoice update payload', ['id' => $id, 'data' => $validated]);


            // 2026-03-01
            if (
                $invoice->status === InvoiceStatus::Paid
            ) {

                throw ValidationException::withMessages([
                    'status' => ['Invoice payment is paid. Status cannot be modified'],
                ]);
                // return response()->json([
                //     'success' => false,
                //     'message' => 'Invoice already paid cannot modify status'
                // ], 422);
            }


            // 2026-03-03
            $hostId = $this->resolveRequestedCompanyHostId($validated);
            $authUserForLimits = auth()->user();
            $user = User::primaryBillingUserForHost($hostId) ?? $authUserForLimits;

            if (! empty($validated['pdf_type'])) {
                $this->subscriptionLimits->assertCanUseTemplate($authUserForLimits, (string) $validated['pdf_type'], $hostId);
            }

            if ($requiresStripePaymentLink) {
                $this->subscriptionLimits->assertFeature($authUserForLimits, 'accept_online_payments', $hostId);
            }

            if (! empty($validated['items']) && is_array($validated['items'])) {
                $this->subscriptionLimits->assertInvoiceCurrencies(
                    $authUserForLimits,
                    $validated['items'],
                    (int) ($validated['company_id'] ?? ($invoice->company_id ?? 0)) ?: null,
                    $hostId,
                );
            }

            $hasBankDetails = $this->hasHostBankDetails(
                $hostId,
                $user,
                (int) ($validated['company_id'] ?? ($invoice->company_id ?? 0))
            );

            // Resolve Stripe status for the billing user/host context.
            $updateStripeStatus = \App\Models\HostUserStripe::where('host_user_id', $user->id)
                ->where('host_id', $hostId)
                ->value('stripe_connection_status')
                ?? $user->stripe_connection_status
                ?? 'not_connected';

            // Fallback: auth user's own Stripe (handles rootless super-admin).
            if ($updateStripeStatus !== 'connected') {
                $authIdUpd = (int) \Illuminate\Support\Facades\Auth::id();
                if ($authIdUpd && $authIdUpd !== (int) $user->id) {
                    $updateStripeStatus = \App\Models\HostUserStripe::where('host_user_id', $authIdUpd)
                        ->where('host_id', $hostId)
                        ->value('stripe_connection_status') ?? 'not_connected';
                }
            }

            $hasStripeConnectedUpdate = $updateStripeStatus === 'connected';

            // Sub-users are blocked when the parent account has NEITHER bank NOR stripe.
            // Parent users (super-admin, company owner, personal) may update invoices freely.
            $authUserForUpdate = auth()->user();
            $isSubUserForUpdate = $user && ((int) $authUserForUpdate->id !== (int) $user->id);



            if (($validated['bank_payment'] ?? false) && !$hasBankDetails) {
                // Auto-disable bank payment instead of blocking update (consistent with store behaviour).
                $validated['bank_payment'] = false;
            }

            $paymentLinkEnabled = (bool) ($validated['payment_link'] ?? $invoice->payment_link ?? false);
            if ($paymentLinkEnabled && !$hasStripeConnectedUpdate) {
                // Auto-disable payment link instead of blocking update (consistent with store behaviour).
                $validated['payment_link'] = false;
            }

            // 2026-04-29 — Remove meta-field before DB update (not an invoice column)
            unset($validated['all_accounts_view']);

            // 🧾 Update main invoice record
            $updatedInvoice = $this->invoiceInterface->update($id, $validated);

            // 🪵 Log successful update
            $this->logActivity(
                type: 'Invoice',
                action: 'Invoice updated',
                relatedId: $updatedInvoice->id ?? null,
                details: [
                    'status' => 'success',
                    'message' => 'Invoice updated successfully',
                    'data' => $updatedInvoice->toArray(),
                ]
            );

            // ✅ Return JSON response
            return response()->json([
                'success' => true,
                'message' => 'Invoice updated successfully',
                'data' => new InvoiceResource($updatedInvoice),
            ], 200);
        } catch (\Throwable $e) {
            // ❌ Handle and log any exception
            Log::error('InvoiceController@update failed', [
                'id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $this->logActivity(
                type: 'Invoice',
                action: 'Invoice update failed',
                details: [
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ]
            );

            return $this->handleException($e, 'InvoiceController@update');
        }
    }

    /**
     * @OA\Delete(
     *     path="/api/v1/admin/invoices/delete/{id}",
     *     summary="Soft delete an invoice",
     *     tags={"Invoices"},
     *     operationId="softDeleteInvoice",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Invoice ID to soft delete",
     *
     *         @OA\Schema(type="integer")
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Invoice soft deleted successfully",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Invoice soft deleted successfully")
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
    public function destroy(int $id): JsonResponse
    {
        try {
            $invoice = $this->invoiceInterface->findById($id);

            $this->authorize('invoice.delete', $invoice);

            // Soft delete invoice (updates deleted_at)
            $invoice->delete();

            // ✅ Log success
            $this->logActivity(
                'Invoice',
                'Invoice Deleted',
                $id,
                [
                    'status' => 'success',
                    'message' => 'Invoice deleted successfully.',
                    'deleted_invoice' => [
                        'id' => $invoice->id,
                    ],
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Invoice soft deleted successfully',
            ], 200);
        } catch (Throwable $e) {
            Log::error('InvoiceController@destroy failed: ' . $e->getMessage());

            // ❌ Log failure
            $this->logActivity(
                'Invoice',
                'Invoice Delete Failed',
                $id,
                [
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ]
            );

            return $this->handleException($e, 'InvoiceController@destroy');
        }
    }

    /**
     * @OA\Post(
     *     path="/api/v1/admin/invoices/send-email",
     *     summary="Send Invoice or Receipt Email",
     *     tags={"Invoices"},
     *     description="Sends the invoice or receipt PDF and optional attachments to client email(s).",
     *     operationId="sendInvoiceMail",
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *
     *             @OA\Schema(ref="#/components/schemas/SendInvoiceMailRequest")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Mail sent successfully",
     *
     *         @OA\JsonContent(ref="#/components/schemas/InvoiceMailResource")
     *     ),
     *
     *     @OA\Response(response=404, description="Resource not found", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function sendMail(SendInvoiceMailRequest $request)
    {
        $invoice = null;

        // $payment_link_enabled = $request->payment_link_enabled;


        try {
            $permission = $request->type === 'receipt' ? 'receipt.mail' : 'invoice.mail';
            $this->authorize($permission, Invoice::class);

            $invoice = $this->loadInvoiceForEmailAttachment((int) $request->id);
            if (!$invoice) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invoice not found.',
                ], 404);
            }

            $hostId = (int) ($invoice->host_id ?? $this->resolveActiveHostId());
            if ($request->type === 'receipt') {
                $this->subscriptionLimits->assertCanCreateReceipt(auth()->user(), $hostId);
            } else {
                $this->subscriptionLimits->assertCanSendInvoice(auth()->user(), $hostId);
            }

            $invoice->setRelation('user', $this->resolveInvoiceBillingUser($invoice));
            $senderSnapshot = $this->resolveSenderSnapshotFromInvoice($invoice);

            $paymentLink = null;
            $currency  = $invoice->items->value('item_currency');

            /*----------------------------- 26-02-23 -------------------------------------------------------*/

            // if ($request->type !== 'receipt' && $invoice->stripe_session_id) {

            //     $stripe = new StripeClient(config('stripe.secret'));

            //     try {

            //         $oldSession = $stripe->checkout->sessions->retrieve(
            //             $invoice->stripe_session_id,
            //             [],
            //             ['stripe_account' => $invoice->user->stripe_account_id]
            //         );

            //         // Only expire if still open
            //         if ($oldSession->status === 'open') {

            //             $stripe->checkout->sessions->expire(
            //                 $invoice->stripe_session_id,
            //                 [],
            //                 ['stripe_account' => $invoice->user->stripe_account_id]
            //             );

            //             Log::info('Old Stripe session expired: ' . $invoice->stripe_session_id);
            //         }
            //     } catch (\Exception $e) {
            //         Log::warning('Expire failed: ' . $e->getMessage());
            //     }
            // }


            // logger($invoice->items->first()->item_currency);

            $paymentLink = $request->type !== 'receipt' ? $this->createStripeSession($invoice) : null;

            // if (
            //     $request->type !== 'receipt'
            //     && $invoice->payment_link
            //     && $invoice->payment_status
            //     && $invoice->payment_status !== InvoicePaymentStatusEnum::PAID
            //     && ($invoice->user->stripe_connection_status && $invoice->user->stripe_connection_status === 'connected')
            // ) {

            //     Stripe::setApiKey(config('stripe.secret'));

            //     $connectedStripeAccountId = $invoice->user->stripe_account_id;

            //     // Get user's Stripe fee settings
            //     $userStripeFee = UserStripeFeeSetting::where('user_id', auth()->user()->id)->first();

            //     $percentage = $userStripeFee?->stripe_fee_percentage ?? 0;
            //     $fixedFee   = $userStripeFee?->stripe_fixed_fee ?? 0;

            //     $netAmount = $invoice->final_amount;

            //     // Apply CIS if enabled
            //     if ($invoice->cis_enabled) {
            //         $cisPercentage = $invoice->cis_tax ?? 0;
            //         $cisDecimal = $cisPercentage / 100;

            //         $cisDeduction = $netAmount * $cisDecimal;
            //         $netAmountAfterCIS = $netAmount - $cisDeduction;
            //     } else {
            //         $netAmountAfterCIS = $netAmount;
            //     }

            //     // Convert percentage to decimal
            //     $percentageDecimal = $percentage / 100;


            //     // Reverse calculate gross so user gets correct amount AFTER fees
            //     if ($percentage > 0 || $fixedFee > 0) {
            //         $grossAmount = ($netAmountAfterCIS + $fixedFee) / (1 - $percentageDecimal);
            //     } else {
            //         $grossAmount = $netAmountAfterCIS;
            //     }


            //     // Always round to 2 decimals before converting to cents
            //     $grossAmount = round($grossAmount, 2);

            //     $session = Session::create(
            //         [
            //             'mode' => 'payment',
            //             'line_items' => [[
            //                 'price_data' => [
            //                     'currency' => strtolower($currency),
            //                     'product_data' => [
            //                         'name' => 'Invoice #' . $invoice->code,
            //                     ],
            //                     'unit_amount' =>  (int) round($grossAmount * 100),
            //                 ],
            //                 'quantity' => 1,
            //             ]],
            //             'success_url' => config('app.frontend_url') . '/payments/success',
            //             'cancel_url' => config('app.frontend_url') . '/payments/cancel',
            //             'metadata' => [
            //                 'invoice_id' => $invoice->id,
            //             ],
            //         ],
            //         [
            //             'stripe_account' => $connectedStripeAccountId
            //         ]
            //     );

            //     Log::info([
            //         'session_id' => $session->id,
            //         'invoice_id' => $invoice->id
            //     ]);

            //     DB::table('invoices')->where('id', $request->id)->update([
            //         'stripe_session_id' => $session->id,
            //         'payment_status' => InvoicePaymentStatusEnum::PENDING->value,
            //     ]);

            //     $paymentLink = $session->url;
            // }
            /* ---------------------------------26-02-03 ----------------------------------------------*/


            // Ensure temp storage directory exists
            $directory = storage_path('temp');
            if (!file_exists($directory)) {
                mkdir($directory, 0755, true);
            }

            // Generate PDF
            $fileName = $request->type === 'receipt'
                ? $invoice->code . '_receipt.pdf'
                : $invoice->code . '.pdf';

            $pdfOutput = $request->type === 'receipt'
                ? $this->receiptPdfBinary($invoice, $senderSnapshot)
                : $this->printPDF($invoice, $paymentLink, 0, $senderSnapshot);

            $tempPdfPath = $directory . '/' . $fileName;
            file_put_contents($tempPdfPath, $pdfOutput);

            $sentEmails = [];
            $emails = (array) $request->email;

            foreach ($emails as $email) {
                if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    Log::warning("Invalid email skipped: {$email}");

                    continue;
                }

                $bankDetails = null;
                if ($invoice->bank_payment && $invoice->billingCompany) {
                    $company = $invoice->billingCompany;
                    $bankParts = array_filter([
                        $company->account_name ? "Account Name: {$company->account_name}" : null,
                        $company->account_number ? "Account Number: {$company->account_number}" : null,
                        $company->sort_code ? "Sort Code: {$company->sort_code}" : null,
                    ]);
                    $bankDetails = implode("\n", $bankParts);
                }

                $data = [
                    'path' => $tempPdfPath,
                    'email' => $email,
                    'type' => $request->type,
                    'name' => $request->name,
                    'subject' => $request->subject ?? null,
                    'additional_info' => $request->additional_info ?? null,
                    'files' => $request->file('files') ?? [],
                    'payment_link' => $paymentLink,
                    'bank_details' => $bankDetails,
                    'sender_snapshot' => $senderSnapshot,
                    'invoice' => $invoice,
                    'is_personal' => (int) $invoice->company_id === (int) $invoice->host_id,
                ];

                Log::info('payment' . $paymentLink);

                try {
                    $emailHostId = $this->resolveInvoiceSenderHostId($invoice) ?: (auth()->user()->host_id ?? null);
                    $emailBrandingUserId = is_null(auth()->user()?->host_id) ? auth()->user()?->id : null;
                    $branding = \App\Helpers\EmailTemplateHelper::resolveCompanyBranding($emailHostId, $emailBrandingUserId);
                    $ccEmail = auth()->user()->email ?? null;
                    $mailer = Mail::to($email);
                    if ($ccEmail) {
                        $mailer = $mailer->cc($ccEmail);
                    }
                    $mailer->send(new InvoiceSendEmail($data, $branding['logoUrl'], $branding['companyName']));
                    Log::info(($request->type !== 'receipt' ? 'Invoice' : 'Receipt') . ' Mail sent to ' . $email);
                    $sentEmails[] = $email;
                } catch (\Throwable $mailEx) {
                    Log::error("Failed to send email to {$email}: " . $mailEx->getMessage());
                }
            }

            if (empty($sentEmails)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No valid recipient emails found.',
                ], 422);
            }
            $status =  $invoice->status->value;



            // Update invoice status
            // $status =
            //     $request->type === 'receipt'
            //     ? InvoiceStatus::ReceiptSent
            //     : ($invoice->payment_status !== InvoicePaymentStatusEnum::PAID ?
            //         InvoiceStatus::MailSent : InvoiceStatus::Paid);

            if ($invoice->payment_status !== InvoicePaymentStatusEnum::PAID) {

                $status = $request->type === 'receipt'
                    ? InvoiceStatus::ReceiptSent
                    : InvoiceStatus::MailSent;

                $invoice->status = $status;
                $invoice->save();
            }


            // Clean up temp file
            if (file_exists($tempPdfPath)) {
                unlink($tempPdfPath);
            }

            // 🧾 Log success
            $this->logActivity(
                type: 'Invoice',
                action: $request->type === 'receipt' ? 'Invoice Receipt sent' : 'Invoice Mail sent',
                relatedId: $invoice->id,
                details: [
                    'status' => 'success',
                    'message' => $request->type === 'receipt'
                        ? 'Invoice Receipt sent successfully'
                        : 'Invoice Mail sent successfully',
                    'data' => $invoice->toArray(),
                ]
            );

            return new InvoiceMailResource([
                'success' => true,
                'invoice_id' => $invoice->id,
                'emails' => $sentEmails,
                'payment' => $paymentLink,
                'status' => $status,
                'message' => $request->type === 'receipt'
                    ? 'Receipt sent successfully'
                    : 'Invoice sent successfully',
            ]);
        } catch (Throwable $e) {
            Log::error('InvoiceController@sendMail failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            // ❌ Log failure
            $this->logActivity(
                type: 'Invoice',
                action: 'Invoice SendMail Failed',
                relatedId: $invoice->id ?? null,
                details: [
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ]
            );

            return $this->handleException($e, 'InvoiceController@sendMail');
        }
    }

    private function resolveActiveHostId(?array $data = null): int
    {
        $user = auth()->user();

        // 2026-04-29 — ALL-Accounts View: derive host_id from company_id in payload
        // instead of relying on session context (which may not match).
        if ($data && !empty($data['all_accounts_view'])) {
            $requestedRef = (int) ($data['company_id'] ?? 0);
            if ($requestedRef > 0) {
                // Try personal host_id match
                $personalHostId = (int) ($user->host_id ?? 0);
                if ($personalHostId > 0 && $requestedRef === $personalHostId) {
                    return $personalHostId;
                }
                // Try company match
                $company = Company::where('id', $requestedRef)
                    ->where('owner_user_id', $user->id)
                    ->first();
                if ($company && $company->host_id) {
                    return (int) $company->host_id;
                }
            }
            // Fallback to session-based logic below
        }

        $isCompanyContext = (string) ($user->active_context_type ?? '') === 'company'
            || (empty($user->active_context_type) && strtolower((string) ($user->account_type ?? '')) === 'company');
        if (
            $isCompanyContext
            && !empty($user->active_company_id)
        ) {
            $company = Company::where('id', (int) $user->active_company_id)
                ->where('owner_user_id', $user->id)
                ->first();
            // Sub-user: company belongs to the same host
            if (!$company && !empty($user->host_id)) {
                $company = Company::where('id', (int) $user->active_company_id)
                    ->where('host_id', (int) $user->host_id)
                    ->first();
            }
            if ($company && $company->host_id) {
                return (int) $company->host_id;
            }
        }
        // Company account without active_company_id: try first active company
        if ($isCompanyContext && empty($user->active_company_id)) {
            $firstCompany = Company::where('owner_user_id', $user->id)
                ->where('is_active', true)
                ->orderByDesc('id')
                ->first();
            if ($firstCompany && $firstCompany->host_id) {
                return (int) $firstCompany->host_id;
            }
        }
        return $this->resolveUserHostIdWithFallback($user);
    }

    /**
     * Personal / super-admin users may have null host_id; use first Host row (same as StoreInvoiceClientRequest).
     */
    private function resolveUserHostIdWithFallback(User $user): int
    {
        $hostId = (int) ($user->host_id ?? 0);
        if ($hostId > 0) {
            return $hostId;
        }

        if (is_null($user->host_id) || strtolower((string) ($user->account_type ?? '')) === 'super-admin') {
            $hostId = (int) (Host::query()->orderBy('id')->value('id') ?? 0);
        }

        if ($hostId <= 0) {
            throw ValidationException::withMessages([
                'host' => ['No host account exists. Seed hosts or assign a host_id to your user.'],
            ]);
        }

        return $hostId;
    }

    private function resolveActiveTeamId(?array $data = null): ?int
    {
        $hostId = $this->resolveActiveHostId($data);
        return \App\Models\Team::where('host_id', $hostId)->value('id');
    }

    private function resolveRequestedCompanyHostId(array $data): int
    {
        $requestedRef = (int) ($data['company_id'] ?? 0);
        if ($requestedRef <= 0) {
            throw ValidationException::withMessages([
                'company_id' => ['company_id is required and must be a positive integer.'],
            ]);
        }

        $user = auth()->user();

        // 2026-04-29 — ALL-Accounts View: trust company_id directly, skip session context validation.
        // The frontend explicitly selected this company from a dropdown; no context-switch needed.
        $allAccountsView = !empty($data['all_accounts_view']);

        if ($allAccountsView) {
            // Try personal host_id match first
            $personalHostId = (int) ($user->host_id ?? 0);
            // Super-admin is rootless; fall back to first real host.
            if ($personalHostId <= 0 && is_null($user->host_id)) {
                $personalHostId = (int) (\App\Models\Host::orderBy('id')->value('id') ?? 0);
            }
            if ($personalHostId > 0 && $requestedRef === $personalHostId) {
                return $personalHostId;
            }

            // Try company match (owned by this user, active)
            $byCompanyId = Company::query()
                ->where('owner_user_id', $user->id)
                ->where('id', $requestedRef)
                ->where('is_active', true)
                ->first();
            if ($byCompanyId) {
                return (int) $byCompanyId->host_id;
            }

            // Fallback: try any company owned by this user (even if inactive) — defensive
            $anyCompany = Company::query()
                ->where('owner_user_id', $user->id)
                ->where('id', $requestedRef)
                ->first();
            if ($anyCompany) {
                return (int) ($anyCompany->host_id ?? $personalHostId);
            }

            throw ValidationException::withMessages([
                'company_id' => ['all_accounts_view: company_id does not match any account you own.'],
            ]);
        }

        // Original logic (unchanged) for non-ALL-view requests
        $isCompanyContext = (string) ($user->active_context_type ?? '') === 'company'
            || (empty($user->active_context_type) && strtolower((string) ($user->account_type ?? '')) === 'company');
        $personalHostId = (int) ($user->host_id ?? 0);
        // Super-admin is rootless; fall back to first real host.
        if ($personalHostId <= 0 && is_null($user->host_id)) {
            $personalHostId = (int) (\App\Models\Host::orderBy('id')->value('id') ?? 0);
        }

        if (!$isCompanyContext) {
            if ($personalHostId > 0 && $requestedRef === $personalHostId) {
                return $personalHostId;
            }
            throw ValidationException::withMessages([
                'company_id' => ['In personal context, company_id must be your personal host_id.'],
            ]);
        }

        $byCompanyId = Company::query()
            ->where('owner_user_id', $user->id)
            ->where('id', $requestedRef)
            ->where('is_active', true)
            ->first();
        if ($byCompanyId) {
            return (int) $byCompanyId->host_id;
        }

        // Sub-user fallback: sub-users share the parent host but don't own the company.
        // Allow if the requested company belongs to the same host as the sub-user.
        if (!is_null($user->host_id)) {
            $subUserHostId = (int) $user->host_id;
            // Direct host_id match: no Company record needed.
            if ($requestedRef === $subUserHostId) {
                return $subUserHostId;
            }
            $hostCompany = Company::query()
                ->where('host_id', $subUserHostId)
                ->where('id', $requestedRef)
                ->where('is_active', true)
                ->first();
            if ($hostCompany) {
                return (int) $hostCompany->host_id;
            }
        }

        throw ValidationException::withMessages([
            'company_id' => ['In company context, company_id must be an active company id owned by you.'],
        ]);
    }

    private function resolveInvoiceBillingUser(Invoice $invoice): User
    {
        $authUser = auth()->user();

        // When the authenticated user is in company context (super-admin or any personal user
        // who switched into one of their companies), resolve the billing user from the
        // company's own host — NOT the personal user row.
        // This ensures the receipt/invoice PDF shows the company name, logo, and bank
        // details rather than the personal account's details.
        $isCompanyCtx = (string) ($authUser->active_context_type ?? '') === 'company'
            && !empty($authUser->active_company_id);

        if ($isCompanyCtx) {
            $hostId = $this->resolveActiveHostId();
            if ($hostId > 0) {
                $billing = User::primaryBillingUserForHost($hostId);
                if ($billing) {
                    return $billing->loadMissing('bank', 'HostUserStripe');
                }
            }
        }

        $hostId = $this->resolveInvoiceSenderHostId($invoice);
        if ($hostId > 0) {
            $billing = User::primaryBillingUserForHost($hostId);
            if ($billing) {
                return $billing->loadMissing('bank', 'HostUserStripe');
            }
        }

        $creator = $invoice->relationLoaded('user')
            ? $invoice->getRelation('user')
            : $invoice->user()->first();

        return ($creator ?? $authUser)->loadMissing('bank', 'HostUserStripe');
    }

    /**
     * Keep validation source aligned with preview/user resource fallback:
     * 1) billing user's bank, then
     * 2) any bank record under same host.
     */
    private function hasHostBankDetails(int $hostId, ?User $billingUser, int $companyRef = 0): bool
    {
        $contextBank = $this->resolveBankFromContext($companyRef, $hostId);
        if ($this->hasAnyBankValue($contextBank)) {
            return true;
        }

        if ($billingUser) {
            $billingBank = UserBank::where('user_id', $billingUser->id)->first();
            if ($this->hasAnyBankValue($billingBank)) {
                return true;
            }
        }

        if ($hostId <= 0) {
            return false;
        }

        $relatedUserIds = User::where('host_id', $hostId)->pluck('id')->toArray();
        if (!empty($relatedUserIds)) {
            $fallbackBank = UserBank::whereIn('user_id', $relatedUserIds)->first();
            if ($this->hasAnyBankValue($fallbackBank)) {
                return true;
            }
        }

        // Last resort: auth user's own bank (handles rootless super-admin whose host_id is null).
        $authUserId = (int) \Illuminate\Support\Facades\Auth::id();
        if ($authUserId > 0) {
            $authBank = UserBank::where('user_id', $authUserId)->first();
            if ($this->hasAnyBankValue($authBank)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Raw PDF bytes for attaching receipt emails (printReceipt returns an HTTP response when not previewing).
     */
    private function receiptPdfBinary(Invoice $invoice, array $senderSnapshot = []): string
    {
        $invoice->setRelation('user', $this->resolveInvoiceBillingUser($invoice));
        $this->hydrateInvoiceBankSnapshot($invoice);
        $this->hydrateInvoiceCompanyAddressSnapshot($invoice);

        $pdf = Pdf::loadView('invoice::pdf.receipt', [
            'invoice' => $invoice,
            'authUser' => $invoice->user,
            'pdfUser' => $invoice->user,
            'footerEmail' => $senderSnapshot['sender_email'] ?? null,
            'number' => $senderSnapshot['sender_phone'] ?? null,
        ]);

        $pdf->setOption(['isFontSubSettingEnabled' => true])
            ->setPaper('a4', 'portrait');

        return $pdf->output();
    }

    private function printPDF(Invoice $invoice, ?string $paymentLink, int $preview = 0, array $senderSnapshot = [])
    {
        $invoice->setRelation('user', $this->resolveInvoiceBillingUser($invoice));
        $this->hydrateInvoiceBankSnapshot($invoice);
        $this->hydrateInvoiceCompanyAddressSnapshot($invoice);
        $invoice->load('client'); // Ensure client relationship is loaded with all address fields

        switch ($invoice->pdf_type) {
            case 'classic':
                $pdf = Pdf::loadView('invoice::pdf.template_classic', [
                    'invoice' => $invoice,
                    'payment_link' => $paymentLink,
                    'pdfUser' => $invoice->user,
                    'footerEmail' => $senderSnapshot['sender_email'] ?? null,
                    'number' => $senderSnapshot['sender_phone'] ?? null,
                ]);
                break;

            case 'minimal':
                $pdf = Pdf::loadView('invoice::pdf.template_minimal', [
                    'invoice' => $invoice,
                    'payment_link' => $paymentLink,
                    'pdfUser' => $invoice->user,
                    'footerEmail' => $senderSnapshot['sender_email'] ?? null,
                    'number' => $senderSnapshot['sender_phone'] ?? null,
                ]);
                break;

            case 'modern':
                $pdf = Pdf::loadView('invoice::pdf.template_modern', [
                    'invoice' => $invoice,
                    'payment_link' => $paymentLink,
                    'pdfUser' => $invoice->user,
                    'footerEmail' => $senderSnapshot['sender_email'] ?? null,
                    'number' => $senderSnapshot['sender_phone'] ?? null,
                ]);
                break;

            case 'modern1':
                $pdf = Pdf::loadView('invoice::pdf.template_modern1', [
                    'invoice' => $invoice,
                    'payment_link' => $paymentLink,
                    'pdfUser' => $invoice->user,
                    'footerEmail' => $senderSnapshot['sender_email'] ?? null,
                    'number' => $senderSnapshot['sender_phone'] ?? null,
                ]);
                break;

            default:
                $pdf = Pdf::loadView('invoice::pdf.general', [
                    'invoice' => $invoice,
                    'payment_link' => $paymentLink,
                    'pdfUser' => $invoice->user,
                    'footerEmail' => $senderSnapshot['sender_email'] ?? null,
                    'number' => $senderSnapshot['sender_phone'] ?? null,
                ]);
                break;
        }

        $pdf->setOption(['isFontSubSettingEnabled' => true])
            ->setPaper('a4', 'portrait');

        if ($preview) {
            return $pdf->stream($invoice->code . '.pdf'); // for browser preview
        }

        return $pdf->output(); // raw binary string for file_put_contents()
    }

    private function printReceipt(Invoice $invoice, int $preview = 0, array $senderSnapshot = [])
    {
        $invoice->setRelation('user', $this->resolveInvoiceBillingUser($invoice));
        $this->hydrateInvoiceBankSnapshot($invoice);
        $this->hydrateInvoiceCompanyAddressSnapshot($invoice);
        $invoice->load('client'); // Ensure client relationship is loaded with all address fields

        $pdf = Pdf::loadView('invoice::pdf.receipt', [
            'invoice' => $invoice,
            'authUser' => $invoice->user,
            'pdfUser' => $invoice->user,
            'footerEmail' => $senderSnapshot['sender_email'] ?? null,
            'number' => $senderSnapshot['sender_phone'] ?? null,
        ]);

        $pdf->setOption(['isFontSubSettingEnabled' => true])
            ->setPaper('a4', 'portrait');

        if ($preview) {
            // 🔹 Stream PDF in browser (good for web preview)
            return $pdf->stream($invoice->code . '_receipt.pdf');
        }

        // 🔹 Return as downloadable PDF response (API safe)
        return response($pdf->output(), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="' . $invoice->code . '_receipt.pdf"');
    }

    /**
     * @OA\Get(
     *     path="/api/v1/admin/invoices/{id}/pdf",
     *     tags={"Invoices"},
     *     summary="Generate invoice PDF",
     *     description="Generate and download a PDF version of the invoice",
     *     operationId="getInvoicePdf",
     *
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Invoice ID",
     *
     *         @OA\Schema(type="integer", example=1)
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="PDF file generated successfully",
     *
     *         @OA\MediaType(
     *              mediaType="application/pdf"
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
    public function generatePDF(Request $request, int $id)
    {
        try {
            $this->authorize('invoice.view', Invoice::class);

            $invoice = $this->invoiceInterface->getInvoiceById($id, $request->all());

            if (!$invoice) {
                Log::warning("InvoiceController@generatePDF: Invoice not found for ID {$id}");

                // ❌ Log not found case
                $this->logActivity(
                    type: 'Invoice',
                    action: 'Invoice PDF generation failed',
                    relatedId: $id,
                    details: [
                        'status' => 'error',
                        'message' => "Invoice with ID {$id} not found.",
                    ]
                );

                return response()->json([
                    'success' => false,
                    'message' => "Invoice with ID {$id} not found.",
                ], 404);
            }

            $invoice->setRelation('user', $this->resolveInvoiceBillingUser($invoice));

            $paymentLink = null;
            $currency  = $invoice->items->value('item_currency');

            /*----------------------------- 26-02-23 -------------------------------------------------------*/

            // if ($request->type !== 'receipt' && $invoice->stripe_session_id) {

            //     $stripe = new StripeClient(config('stripe.secret'));

            //     try {

            //         $oldSession = $stripe->checkout->sessions->retrieve(
            //             $invoice->stripe_session_id,
            //             [],
            //             ['stripe_account' => $invoice->user->stripe_account_id]
            //         );

            //         // Only expire if still open
            //         if ($oldSession->status === 'open') {

            //             $stripe->checkout->sessions->expire(
            //                 $invoice->stripe_session_id,
            //                 [],
            //                 ['stripe_account' => $invoice->user->stripe_account_id]
            //             );

            //             Log::info('Old Stripe session expired: ' . $invoice->stripe_session_id);
            //         }
            //     } catch (\Exception $e) {
            //         Log::warning('Expire failed: ' . $e->getMessage());
            //     }
            // }


            // logger($invoice->items->first()->item_currency);

            $paymentLink = null;
            if ($request->type !== 'receipt') {
                try {
                    $paymentLink = $this->createStripeSession($invoice);
                } catch (\Throwable $stripeErr) {
                    Log::warning('createStripeSession failed during PDF generation, continuing without payment link: ' . $stripeErr->getMessage());
                    $paymentLink = null;
                }
            }

            // if (
            //     $request->type !== 'receipt'
            //     && $invoice->payment_link
            //     && $invoice->payment_status
            //     && $invoice->payment_status !== InvoicePaymentStatusEnum::PAID
            //     && ($invoice->user->stripe_connection_status && $invoice->user->stripe_connection_status === 'connected')
            // ) {

            //     Stripe::setApiKey(config('stripe.secret'));


            //     $connectedStripeAccountId = $invoice->user->stripe_account_id;

            //     // Get user's Stripe fee settings
            //     $userStripeFee = UserStripeFeeSetting::where('user_id', auth()->user()->id)->first();

            //     $percentage = $userStripeFee?->stripe_fee_percentage ?? 0;
            //     $fixedFee   = $userStripeFee?->stripe_fixed_fee ?? 0;

            //     $netAmount = $invoice->final_amount;

            //     // Apply CIS if enabled
            //     if ($invoice->cis_enabled) {
            //         $cisPercentage = $invoice->cis_tax ?? 0;
            //         $cisDecimal = $cisPercentage / 100;

            //         $cisDeduction = $netAmount * $cisDecimal;
            //         $netAmountAfterCIS = $netAmount - $cisDeduction;
            //     } else {
            //         $netAmountAfterCIS = $netAmount;
            //     }

            //     // Stripe fee settings
            //     $percentage = $userStripeFee?->stripe_fee_percentage ?? 0;
            //     $fixedFee   = $userStripeFee?->stripe_fixed_fee ?? 0;

            //     $percentageDecimal = $percentage / 100;

            //     // Reverse calculate gross so user gets correct amount AFTER fees
            //     if ($percentage > 0 || $fixedFee > 0) {
            //         $grossAmount = ($netAmountAfterCIS + $fixedFee) / (1 - $percentageDecimal);
            //     } else {
            //         $grossAmount = $netAmountAfterCIS;
            //     }

            //     $grossAmount = round($grossAmount, 2);



            //     $session = Session::create(
            //         [
            //             'mode' => 'payment',
            //             'line_items' => [[
            //                 'price_data' => [
            //                     'currency' => strtolower($currency),
            //                     'product_data' => [
            //                         'name' => 'Invoice #' . $invoice->code,
            //                     ],
            //                     'unit_amount' =>  (int) round($grossAmount * 100),
            //                 ],
            //                 'quantity' => 1,
            //             ]],
            //             'success_url' => config('app.frontend_url') . '/payments/success',
            //             'cancel_url' => config('app.frontend_url') . '/payments/cancel',
            //             'metadata' => [
            //                 'invoice_id' => $invoice->id,
            //             ],
            //         ],
            //         [
            //             'stripe_account' => $connectedStripeAccountId
            //         ]
            //     );

            //     Log::info([
            //         'session_id' => $session->id,
            //         'invoice_id' => $invoice->id
            //     ]);

            //     DB::table('invoices')->where('id', $request->id)->update([
            //         'stripe_session_id' => $session->id,
            //         'payment_status' => InvoicePaymentStatusEnum::PENDING->value,
            //     ]);

            //     $paymentLink = $session->url;
            // }
            /* ---------------------------------26-02-03 ----------------------------------------------*/


            // ✅ Log success
            $this->logActivity(
                type: 'Invoice',
                action: 'Invoice PDF generated',
                relatedId: $invoice->id ?? null,
                details: [
                    'status' => 'success',
                    'message' => 'Invoice PDF generated successfully',
                    'data' => $invoice->toArray(),
                ]
            );

            $binary = $this->printPDF($invoice, $paymentLink);

            return response($binary, 200)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'inline; filename="' . $invoice->code . '.pdf"');
        } catch (Throwable $e) {
            Log::error('InvoiceController@generatePDF failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'id' => $request->id,
            ]);

            // ❌ Log failure
            $this->logActivity(
                type: 'Invoice',
                action: 'Invoice PDF generation failed',
                relatedId: $request->id ?? null,
                details: [
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ]
            );

            return $this->handleException($e, 'InvoiceController@generatePDF');
        }
    }

    /**
     * @OA\Get(
     *     path="/api/v1/admin/invoices/{id}/receipt",
     *     tags={"Invoices"},
     *     summary="Generate invoice receipt PDF",
     *     description="Generate and download a PDF version of the invoice receipt",
     *     operationId="getInvoiceReceipt",
     *
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Invoice ID",
     *
     *         @OA\Schema(type="integer", example=1)
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Receipt PDF generated successfully",
     *
     *         @OA\MediaType(mediaType="application/pdf", @OA\Schema(type="string", format="binary"))
     *     ),
     *
     *     @OA\Response(response=404, description="Resource not found", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=422, description="Validation error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=401, description="Unauthorized", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=403, description="Forbidden", @OA\JsonContent(ref="#/components/schemas/ErrorResponse")),
     *     @OA\Response(response=500, description="Internal server error", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function generateReceipt(Request $request, int $id)
    {
        try {
            $this->authorize('receipt.view', Invoice::class);

            $invoice = $this->invoiceInterface->getInvoiceById($id, $request->all());

            if ($invoice) {
                $hostId = (int) ($invoice->host_id ?? $this->resolveActiveHostId());
                $this->subscriptionLimits->assertCanCreateReceipt(auth()->user(), $hostId);
            }

            if (!$invoice) {
                Log::warning("InvoiceController@generateReceipt: Invoice not found for ID {$id}");

                // ❌ Log failure (Invoice not found)
                $this->logActivity(
                    type: 'Invoice',
                    action: 'Invoice Receipt print failed',
                    relatedId: $id,
                    details: [
                        'status' => 'error',
                        'message' => "Invoice with ID {$id} not found.",
                    ]
                );

                return response()->json([
                    'success' => false,
                    'message' => "Invoice with ID {$id} not found.",
                ], 404);
            }

            $invoice->setRelation('user', $this->resolveInvoiceBillingUser($invoice));

            // ✅ Log success (Before printing)
            $this->logActivity(
                type: 'Invoice',
                action: 'Invoice Receipt print',
                relatedId: $invoice->id ?? null,
                details: [
                    'status' => 'success',
                    'message' => 'Invoice Receipt generated successfully',
                    'data' => $invoice->toArray(),
                ]
            );

            return $this->printReceipt($invoice, 0, $this->resolveSenderSnapshotFromInvoice($invoice));
        } catch (Throwable $e) {
            Log::error('InvoiceController@generateReceipt Exception: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'id' => $id,
            ]);

            // ❌ Log failure (Exception)
            $this->logActivity(
                type: 'Invoice',
                action: 'Invoice Receipt print failed',
                relatedId: $id,
                details: [
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ]
            );

            return $this->handleException($e, 'InvoiceController@generateReceipt');
        }
    }

    private function loadInvoiceForEmailAttachment(int $invoiceId): ?Invoice
    {
        $authUser = auth()->user();
        if (!$authUser) {
            return null;
        }

        $allowedHostIds = Company::query()
            ->where('owner_user_id', (int) $authUser->id)
            ->pluck('host_id')
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->values()
            ->all();

        if (!empty($authUser->host_id)) {
            $allowedHostIds[] = (int) $authUser->host_id;
        }
        $allowedHostIds = array_values(array_unique(array_filter($allowedHostIds)));

        $query = Invoice::query()
            ->with(['client', 'user', 'items', 'type'])
            ->where('id', $invoiceId)
            ->whereNull('deleted_at')
            ->where(function ($q) use ($authUser, $allowedHostIds) {
                $q->where('created_by', (int) $authUser->id);
                if (!empty($allowedHostIds)) {
                    $q->orWhereIn('host_id', $allowedHostIds)
                        ->orWhereIn('company_id', $allowedHostIds);
                }
            });

        return $query->first();
    }

    private function resolveSenderSnapshotFromInvoice(Invoice $invoice): array
    {
        $this->hydrateInvoiceBankSnapshot($invoice);
        $billingUser = $this->resolveInvoiceBillingUser($invoice);
        $hostId = $this->resolveInvoiceSenderHostId($invoice);
        if ($hostId <= 0) {
            $hostId = (int) ($billingUser?->host_id ?? 0);
        }

        $details = collect();
        if ($hostId > 0) {
            $details = HostUserDetail::query()
                ->where('host_id', $hostId)
                ->where('type', 'company_details')
                ->get()
                ->unique('name')
                ->keyBy('name');
        }

        $detailValue = function (string $key) use ($details) {
            if (!isset($details[$key])) {
                return null;
            }
            return $details[$key]->values ?? $details[$key]->files ?? null;
        };

        return [
            'sender_name' => $billingUser
                ? trim((string) (($billingUser->first_name ?? '') . ' ' . ($billingUser->last_name ?? '')))
                : null,
            'sender_company_name' => $detailValue('company_name'),
            'sender_email' => $detailValue('business_email') ?? ($billingUser->email ?? null),
            'sender_phone' => $detailValue('phone_number') ?? ($billingUser->phone_number ?? null),
        ];
    }

    private function hydrateInvoiceBankSnapshot(Invoice $invoice): void
    {
        $resolved = $this->resolveInvoiceBankDetails($invoice);

        $invoice->account_name = $resolved['account_name'];
        $invoice->account_number = $resolved['account_number'];
        $invoice->sort_code = $resolved['sort_code'];
    }

    private function hydrateInvoiceCompanyAddressSnapshot(Invoice $invoice): void
    {
        $resolved = $this->resolveInvoiceCompanyAddress($invoice);
        if ($resolved !== null) {
            $invoice->company_address = $resolved;
        }
    }

    private function resolveInvoiceCompanyAddress(Invoice $invoice): ?string
    {
        $normalize = function (?string $value): ?string {
            if ($value === null) return null;
            $trimmed = trim($value);
            if ($trimmed === '' || strcasecmp($trimmed, 'null') === 0) {
                return null;
            }
            return $trimmed;
        };

        $existing = $normalize((string) ($invoice->company_address ?? ''));
        if ($existing !== null) {
            return $existing;
        }

        $hostId = $this->resolveInvoiceSenderHostId($invoice);
        $companyRef = (int) ($invoice->company_id ?? 0);
        $addressLines = [];

        $appendLinesFromString = function (?string $raw) use (&$addressLines): void {
            if ($raw === null) return;
            $parts = preg_split('/[\r\n,]+/', (string) $raw) ?: [];
            foreach ($parts as $part) {
                $line = trim((string) $part);
                if ($line !== '') {
                    $addressLines[] = $line;
                }
            }
        };

        if ($hostId > 0) {
            $hostDetails = HostUserDetail::query()
                ->where('host_id', $hostId)
                ->where('type', 'company_details')
                ->whereIn('name', [
                    'company_address',
                    'address',
                    'company_address_nr',
                    'company_address_street',
                    'company_address_city',
                    'company_address_town',
                    'company_address_county',
                    'company_address_postcode',
                    'company_address_country',
                ])
                ->get()
                ->keyBy('name');

            $appendLinesFromString($normalize((string) data_get($hostDetails->get('company_address'), 'values', '')));
            $appendLinesFromString($normalize((string) data_get($hostDetails->get('address'), 'values', '')));

            foreach ([
                'company_address_nr',
                'company_address_street',
                'company_address_city',
                'company_address_town',
                'company_address_county',
                'company_address_postcode',
                'company_address_country',
            ] as $field) {
                $value = $normalize((string) data_get($hostDetails->get($field), 'values', ''));
                if ($value !== null) {
                    $addressLines[] = $value;
                }
            }
        }

        if (empty($addressLines) && $companyRef > 0) {
            $company = Company::query()->find($companyRef);
            if ($company) {
                $appendLinesFromString($normalize((string) ($company->company_address ?? '')));
                foreach ([
                    'company_address_nr',
                    'company_address_street',
                    'company_address_city',
                    'company_address_town',
                    'company_address_county',
                    'company_address_postcode',
                    'company_address_country',
                ] as $field) {
                    $value = $normalize((string) ($company->{$field} ?? ''));
                    if ($value !== null) {
                        $addressLines[] = $value;
                    }
                }
            }
        }

        if (empty($addressLines) && $hostId > 0) {
            $invoiceCompany = InvoiceCompany::query()
                ->where('host_id', $hostId)
                ->when($companyRef > 0, fn ($q) => $q->where('company_id', $companyRef))
                ->first([
                    'address',
                    'address_no',
                    'address_street',
                    'address_city',
                    'address_town',
                    'address_county',
                    'address_postcode',
                    'address_country',
                ]);

            if ($invoiceCompany) {
                $appendLinesFromString($normalize((string) ($invoiceCompany->address ?? '')));
                foreach ([
                    'address_no',
                    'address_street',
                    'address_city',
                    'address_town',
                    'address_county',
                    'address_postcode',
                    'address_country',
                ] as $field) {
                    $value = $normalize((string) ($invoiceCompany->{$field} ?? ''));
                    if ($value !== null) {
                        $addressLines[] = $value;
                    }
                }
            }
        }

        if (empty($addressLines)) {
            return null;
        }

        return implode(', ', array_values(array_unique($addressLines)));
    }

    private function resolveInvoiceBankDetails(Invoice $invoice): array
    {
        $stored = [
            'account_name' => $invoice->account_name ?? null,
            'account_number' => $invoice->account_number ?? null,
            'sort_code' => $invoice->sort_code ?? null,
        ];

        $hostId = $this->resolveInvoiceSenderHostId($invoice);
        $companyRef = (int) ($invoice->company_id ?? 0);
        $contextBank = $this->resolveBankFromContext($companyRef, $hostId);

        // Load auth user as the Module User model so the bank() relation exists.
        $authModuleUser = auth()->id() ? User::find(auth()->id()) : null;
        $currentUserBank = $authModuleUser?->bank;
        $fallback = [
            'account_name' => $currentUserBank?->account_name ?? null,
            'account_number' => $currentUserBank?->account_number ?? null,
            'sort_code' => $currentUserBank?->sort_code ?? null,
        ];

        // Fresh live data always wins over the snapshot stored on the invoice row.
        // The stored snapshot was captured at creation time and becomes stale when the
        // parent account updates their bank details afterwards.
        return [
            'account_name' => $contextBank['account_name'] ?: ($fallback['account_name'] ?: $stored['account_name']),
            'account_number' => $contextBank['account_number'] ?: ($fallback['account_number'] ?: $stored['account_number']),
            'sort_code' => $contextBank['sort_code'] ?: ($fallback['sort_code'] ?: $stored['sort_code']),
        ];
    }

    private function resolveBankFromContext(int $companyRef, int $hostId): array
    {
        $empty = ['account_name' => null, 'account_number' => null, 'sort_code' => null];

        $extract = function ($record) {
            return [
                'account_name' => $record->account_name ?? null,
                'account_number' => $record->account_number ?? null,
                'sort_code' => $record->sort_code ?? null,
            ];
        };

        if ($hostId > 0) {
            $billingUser = User::primaryBillingUserForHost($hostId);

            // Personal-context parents (super-admin / personal account type) always save
            // bank details to user_banks, never to invoices_companies.  Skip the
            // invoices_companies lookup for those hosts so a stale row cannot shadow
            // the freshly updated user_banks entry.
            $ownerAccountType = strtolower((string) ($billingUser?->account_type ?? ''));
            $isPersonalContextHost = in_array($ownerAccountType, ['personal', 'super-admin', ''], true);

            if (!$isPersonalContextHost) {
                $companyBank = InvoiceCompany::query()
                    ->where('host_id', $hostId)
                    ->first(['account_name', 'account_number', 'sort_code']);
                if ($this->hasAnyBankValue($companyBank)) {
                    return $extract($companyBank);
                }
            }

            if ($billingUser) {
                $billingBank = UserBank::query()
                    ->where('user_id', (int) $billingUser->id)
                    ->first(['account_name', 'account_number', 'sort_code']);
                if ($this->hasAnyBankValue($billingBank)) {
                    return $extract($billingBank);
                }
            }
        }

        if ($companyRef > 0 && $companyRef !== $hostId) {
            $companyById = Company::query()->where('id', $companyRef)->first();
            $mappedHostId = (int) ($companyById?->host_id ?? $companyRef);
            if ($mappedHostId > 0) {
                $companyBank = InvoiceCompany::query()
                    ->where('host_id', $mappedHostId)
                    ->first(['account_name', 'account_number', 'sort_code']);
                if ($this->hasAnyBankValue($companyBank)) {
                    return $extract($companyBank);
                }

                $billingUser = User::primaryBillingUserForHost($mappedHostId);
                if ($billingUser) {
                    $billingBank = UserBank::query()
                        ->where('user_id', (int) $billingUser->id)
                        ->first(['account_name', 'account_number', 'sort_code']);
                    if ($this->hasAnyBankValue($billingBank)) {
                        return $extract($billingBank);
                    }
                }
            }
        }

        return $empty;
    }

    private function hasAnyBankValue(mixed $bank): bool
    {
        if (is_array($bank)) {
            return !empty($bank['account_name']) || !empty($bank['account_number']) || !empty($bank['sort_code']);
        }
        return (bool) ($bank && (
            !empty($bank->account_name)
            || !empty($bank->account_number)
            || !empty($bank->sort_code)
        ));
    }

    /**
     * Sender resolution for email/PDF must follow persisted invoice company reference.
     * company_id can be either:
     * - companies.id (company dropdown), or
     * - personal host_id (personal dropdown).
     */
    private function resolveInvoiceSenderHostId(Invoice $invoice): int
    {
        $companyRef = (int) ($invoice->company_id ?? 0);
        if ($companyRef > 0) {
            $companyById = Company::query()
                ->where('id', $companyRef)
                ->first();
            if ($companyById && !empty($companyById->host_id)) {
                return (int) $companyById->host_id;
            }

            // Personal fallback: for personal selection company_id equals host_id.
            return $companyRef;
        }

        return (int) (
            $invoice->host_id
            ?? ($invoice->relationLoaded('user') ? $invoice->getRelation('user')?->host_id : $invoice->user()->value('host_id'))
            ?? auth()->user()?->host_id
            ?? 0
        );
    }

    /**
     * @OA\Post(
     *     path="/api/v1/admin/invoices/preview",
     *     tags={"Invoices"},
     *     summary="Preview invoice PDF",
     *     description="Generate a temporary preview PDF of the invoice before saving",
     *     operationId="getInvoicePreview",
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(
     *             required={"id", "company_id", "invoice_code", "client_id", "invoice_date", "due_date", "type_id", "status"},
     *
     *             @OA\Property(property="item_count", type="integer", example=1),
     *             @OA\Property(property="id", type="integer", example=1),
     *             @OA\Property(property="company_id", type="integer", example=1),
     *             @OA\Property(property="invoice_code", type="string", example="Reg-000001"),
     *             @OA\Property(property="client_id", type="integer", example=1),
     *             @OA\Property(property="invoice_date", type="string", format="date", example="2025-06-13"),
     *             @OA\Property(property="due_date", type="string", format="date", example="2025-06-18"),
     *             @OA\Property(property="type_id", type="integer", example=1),
     *             @OA\Property(property="status", type="string", example="Created")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Preview PDF generated successfully",
     *
     *         @OA\MediaType(
     *              mediaType="application/pdf"
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
    public function previewPDF(Request $request)
    {
        try {
            $this->authorize('invoice.view', Invoice::class);

            $paramArr = $request->toArray();
            $data = $this->formatData($paramArr);

            if (isset($paramArr['id'])) {
                $createdInvoice = $this->invoiceInterface->getInvoiceById($paramArr['id']);
                $data['created_by'] = $createdInvoice->created_by;
                $data['invoice_code'] = $createdInvoice->invoice_code ?? ($data['invoice_code'] ?? null);
                $data['pdf_field_visibility'] = $paramArr['pdf_field_visibility'] ?? $createdInvoice->pdf_field_visibility;
            } else {
                $data['created_by'] = auth()->user()->id;
                $data['pdf_field_visibility'] = $paramArr['pdf_field_visibility'] ?? null;
            }

            $invoice = $this->invoiceInterface->previewStore($data);

            // ✅ Log success
            $this->logActivity(
                type: 'Invoice',
                action: 'Invoice Preview PDF generated',
                relatedId: $invoice->id ?? null,
                details: [
                    'status' => 'success',
                    'message' => 'Invoice Preview PDF generated successfully',
                    'data' => $invoice->toArray(),
                ]
            );

            return $this->printPDF($invoice, 1);
        } catch (Throwable $e) {
            Log::error('InvoiceController@previewPDF failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            // ❌ Log failure
            $this->logActivity(
                type: 'Invoice',
                action: 'Invoice Preview PDF generation failed',
                relatedId: $request->get('id') ?? null,
                details: [
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ]
            );

            return $this->handleException($e, 'InvoiceController@previewPDF');
        }
    }

    private function formatData(array $data)
    {
        $data['products'] = [];
        $data['services'] = [];
        $data['cleaning_fee'] = [];
        $data['total_amount'] = 0;
        $data['total_vat'] = 0;
        $data['total_discount'] = 0;
        $data['final_amount'] = 0;
        $data['property_id'] = isset($data['property_id']) ? $data['property_id'] : null;
        $data['invoice_date'] = Carbon::formatToMySqlDate($data['invoice_date']);
        $data['due_date'] = !empty($data['due_date'])
            ? Carbon::formatToMySqlDate($data['due_date'])
            : null;
        $data['receipt_date'] = (isset($data['receipt_date']) && $data['receipt_date'] && $data['receipt_date'] !== '' ? Carbon::formatToMySqlDate($data['receipt_date']) : null);
        $data['quotation_title'] = $data['quotation_title'] ?? null;
        $data['quotation_content'] = $data['quotation_content'] ?? null;
        $data['pdf_field_visibility'] = $data['pdf_field_visibility'] ?? null;

        $itemCount = $data['item_count'] ?? 0;

        for ($i = 1; $i <= $itemCount; $i++) {
            if (!isset($data['item_type' . $i])) {
                continue;
            }

            $type = $data['item_type' . $i];
            $data['total_vat'] = $data['total_vat'] + (isset($data['vat_value' . $i]) ? $data['vat_value' . $i] : 0);
            $data['total_discount'] = $data['total_discount'] + $data['discount_value' . $i];
            switch ($type) {
                case 'product':
                    $data['total_amount'] = $data['total_amount'] + ($data['unit_price' . $i] * $data['quantity' . $i]);
                    $itemFinalAmount = ($data['unit_price' . $i] * $data['quantity' . $i]) - $data['discount_value' . $i] + $data['vat_value' . $i];
                    $data['final_amount'] = $data['final_amount'] + $itemFinalAmount;
                    array_push($data['products'], [
                        'type' => 'product',
                        'name' => $data['product_name' . $i],
                        'price' => $data['unit_price' . $i],
                        'quantity' => $data['quantity' . $i],
                        'discount' => $data['discount' . $i],
                        'discount_value' => $data['discount_value' . $i],
                        'vat' => $data['vat' . $i],
                        'vat_value' => $data['vat_value' . $i],
                        'total_amount' => $itemFinalAmount,
                    ]);
                    break;
                case 'service':
                    $data['total_amount'] = $data['total_amount'] + $data['price' . $i];
                    $itemFinalAmount = ($data['price' . $i] + $data['vat_value' . $i]) - $data['discount_value' . $i];
                    $data['final_amount'] = $data['final_amount'] + $itemFinalAmount;
                    array_push($data['services'], [
                        'type' => 'service',
                        'name' => $data['service_name' . $i],
                        'price' => $data['price' . $i],
                        'quantity' => 1, // By default
                        'discount' => $data['discount' . $i],
                        'discount_value' => $data['discount_value' . $i],
                        'vat' => $data['vat' . $i],
                        'vat_value' => $data['vat_value' . $i],
                        'total_amount' => $itemFinalAmount,
                    ]);
                    break;
                case 'cleaning_fee':
                    $data['total_amount'] = $data['total_amount'] + $data['price' . $i];
                    $itemFinalAmount = $data['price' . $i] - $data['discount_value' . $i];
                    $data['final_amount'] = $data['final_amount'] + $itemFinalAmount;
                    array_push($data['services'], [
                        'type' => 'cleaning_fee',
                        'name' => $data['cleaning_fee_name' . $i],
                        'price' => $data['price' . $i],
                        'quantity' => 1, // By default
                        'discount' => $data['discount' . $i],
                        'discount_value' => $data['discount_value' . $i],
                        'vat' => 0,
                        'vat_value' => 0,
                        'total_amount' => $itemFinalAmount,
                    ]);
                    break;
            }
        }

        return $data;
    }



    private function createStripeSession(Invoice $invoice): ?string
    {
        if (!$invoice->payment_link) {
            return null;
        }

        $billingUser = $invoice->user;
        $invoiceHostId = $this->resolveInvoiceSenderHostId($invoice);

        // Resolve Stripe status and account ID from HostUserStripe first.
        // For company-context parents, Stripe Connect only writes to host_user_stripe,
        // not to users.stripe_connection_status / users.stripe_account_id.
        $hostStripe = \App\Models\HostUserStripe::where('host_user_id', $billingUser->id)
            ->where('host_id', $invoiceHostId)
            ->first(['stripe_connection_status', 'stripe_account_id']);

        $stripeStatus = $hostStripe?->stripe_connection_status
            ?? $billingUser->stripe_connection_status
            ?? 'not_connected';

        $connectedStripeAccountId = $hostStripe?->stripe_account_id
            ?? $billingUser->stripe_account_id;

        if (
            $stripeStatus !== 'connected'
            || !$connectedStripeAccountId
            || $invoice->payment_status === InvoicePaymentStatusEnum::PAID
        ) {
            return null;
        }

        Stripe::setApiKey(config('stripe.secret'));

        // Expire old session if exists
        if ($invoice->stripe_session_id) {
            $stripe = new StripeClient(config('stripe.secret'));
            try {
                $oldSession = $stripe->checkout->sessions->retrieve(
                    $invoice->stripe_session_id,
                    [],
                    ['stripe_account' => $connectedStripeAccountId]
                );
                if ($oldSession->status === 'open') {
                    $stripe->checkout->sessions->expire(
                        $invoice->stripe_session_id,
                        [],
                        ['stripe_account' => $connectedStripeAccountId]
                    );
                    Log::info('Old Stripe session expired: ' . $invoice->stripe_session_id);
                }
            } catch (\Exception $e) {
                Log::warning('Expire failed: ' . $e->getMessage());
            }
        }

        // Stripe fee settings
        $feeUserId = $invoice->user->id ?? auth()->user()->id;
        $userStripeFee = UserStripeFeeSetting::where('user_id', $feeUserId)->first();
        $percentage = $userStripeFee?->stripe_fee_percentage ?? 0;
        $fixedFee = $userStripeFee?->stripe_fixed_fee ?? 0;

        $netAmount = $invoice->final_amount;

        // Apply CIS if enabled
        $netAmountAfterCIS = $netAmount;
        if ($invoice->cis_enabled) {
            $cisPercentage = $invoice->cis_tax ?? 0;
            $netAmountAfterCIS = $netAmount - ($netAmount * ($cisPercentage / 100));
        }

        $percentageDecimal = $percentage / 100;
        $grossAmount = ($percentage > 0 || $fixedFee > 0)
            ? ($netAmountAfterCIS + $fixedFee) / (1 - $percentageDecimal)
            : $netAmountAfterCIS;
        $grossAmount = round($grossAmount, 2);

        $currency = $invoice->items->value('item_currency') ?: 'GBP';

        // Create new Stripe session
        $session = Session::create(
            [
                'mode' => 'payment',
                'line_items' => [[
                    'price_data' => [
                        'currency' => strtolower($currency),
                        'product_data' => [
                            'name' => 'Invoice #' . $invoice->code,
                        ],
                        'unit_amount' => (int) round($grossAmount * 100),
                    ],
                    'quantity' => 1,
                ]],
                'success_url' => config('app.frontend_url') . '/payments/success',
                'cancel_url' => config('app.frontend_url') . '/payments/cancel',
                'metadata' => [
                    'invoice_id' => $invoice->id,
                ],
            ],
            [
                'stripe_account' => $connectedStripeAccountId
            ]
        );

        DB::table('invoices')->where('id', $invoice->id)->update([
            'stripe_session_id' => $session->id,
            'payment_status' => InvoicePaymentStatusEnum::PENDING->value,
        ]);

        Log::info([
            'session_id' => $session->id,
            'invoice_id' => $invoice->id
        ]);

        return $session->url;
    }
}
