<?php

namespace Modules\User\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Models\HostUserStripe;
use Modules\User\Models\User;
use Stripe\Account;
use Stripe\AccountLink;
use Stripe\Exception\InvalidRequestException;
use Stripe\Stripe;
use App\Services\Subscription\SubscriptionLimitService;

class StripeUserController extends Controller
{
    public function __construct(
        private readonly SubscriptionLimitService $subscriptionLimits
    ) {}
    private function resolveActiveHostId(): ?int
    {
        $user = auth()->user();
        if (
            (string) ($user->active_context_type ?? 'personal') === 'company'
            && !empty($user->active_company_id)
        ) {
            // Owner lookup
            $company = \App\Models\Company::where('id', (int) $user->active_company_id)
                ->where('owner_user_id', $user->id)
                ->first();
            // Sub-user lookup: company under the same host
            if (!$company && !empty($user->host_id)) {
                $company = \App\Models\Company::where('id', (int) $user->active_company_id)
                    ->where('host_id', (int) $user->host_id)
                    ->first();
            }
            if ($company && $company->host_id) {
                return (int) $company->host_id;
            }
        }
        return (int) $user->host_id > 0 ? (int) $user->host_id : null;
    }

    /**
     * @OA\Post(
     *     path="/api/v1/admin/stripe/connect",
     *     summary="Connect user Stripe account",
     *     description="Creates or resumes Stripe Connect onboarding for the authenticated user and returns the Stripe onboarding or dashboard redirect link.",
     *     operationId="connectStripeAccount",
     *     tags={"Stripe"},
     *
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(
     *         response=200,
     *         description="Stripe onboarding link returned successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(
     *                 property="link",
     *                 type="string",
     *                 example="https://connect.stripe.com/setup/s/..."
     *             )
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *
     *     @OA\Response(
     *         response=500,
     *         description="Internal server error",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     )
     * )
     */
    public function connect(Request $request)
    {
        $user = null;
        $platform = 'web';

        // Sub-users cannot connect Stripe — only admins/owners can
        if ($request->isMethod('post')) {
            $authUser = auth()->user();
            if ($authUser && $authUser->hasRole('team-member')) {
                return response()->json([
                    'message' => 'Sub-users cannot manage Stripe connection. Only account owners can connect Stripe.',
                ], 403);
            }
        }

        if ($request->isMethod('post')) {

            $user = Auth::user();

            if ($user) {
                $this->subscriptionLimits->assertCanConnectStripe($user);
            }

            if (!$user) {
                return response()->json([
                    'message' => 'Unauthorized'
                ], 401);
            }
            $platform = $request->input('platform', 'web');
        }

        // Resolve Stripe secret key:
        // - from request payload (company can save per-tenant keys)
        // - else from stored HostUserStripe (saved in company details)
        // - else from app config
        $payloadSecret = $request->input('SECRET_KEY')
            ?? $request->input('secret_key')
            ?? $request->input('stripe_secret_key');
        $payloadPublish = $request->input('PUBLISH_KEY')
            ?? $request->input('publish_key')
            ?? $request->input('stripe_published_key');

        if ($user && (!blank($payloadSecret) || !blank($payloadPublish))) {
            try {
                $activeHostId = $this->resolveActiveHostId();
                HostUserStripe::updateOrCreate(
                    [
                        'host_id' => $activeHostId ?? (int) ($user->host_id ?? 0),
                        'host_user_id' => (int) $user->id,
                    ],
                    [
                        'secret_key' => $payloadSecret,
                        'publish_key' => $payloadPublish,
                    ]
                );
            } catch (\Throwable $e) {
                Log::warning('Stripe key persistence failed', [
                    'user_id' => $user->id ?? null,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $activeHostId = $activeHostId ?? $this->resolveActiveHostId();

        $storedStripeSecret = null;
        if ($user) {
            $stripeHostId = $activeHostId ?? $user->host_id;
            $storedStripeSecret = HostUserStripe::where('host_user_id', (int) $user->id)
                ->where('host_id', (int) $stripeHostId)
                ->value('secret_key');
        }

        $stripeSecret = $payloadSecret
            ?: $storedStripeSecret
            ?: config('services.stripe.secret', config('stripe.secret'));

        if (blank($stripeSecret)) {
            return response()->json([
                'message' => 'Stripe secret key is missing. Provide SECRET_KEY (or configure services.stripe.secret).'
            ], 422);
        }

        Stripe::setApiKey($stripeSecret);

        if ($request->isMethod('get')) {

            return redirect(config('app.frontend_url') . '/company');
        }

        // If Stripe account already exists
        try {
            $hostStripe = HostUserStripe::where('host_user_id', (int) $user->id)
                ->where('host_id', $activeHostId ?? (int) ($user->host_id ?? 0))
                ->first();
            $existingStripeAccountId = $hostStripe?->stripe_account_id ?? $user->stripe_account_id;
            $existingConnectionStatus = $hostStripe?->stripe_connection_status ?? $user->stripe_connection_status;

            if ($existingStripeAccountId && $existingConnectionStatus === 'disconnected') {

                $account =  Account::retrieve($existingStripeAccountId);


                $token = Str::random(32);
                Cache::put('stripe_reconnect', $token, now()->addMinutes(5));

                if ($account) {
                    $user->update([
                        'stripe_connection_status' => 'connected',
                        'stripe_connected_at' => now()
                    ]);
                    if ($hostStripe) {
                        $hostStripe->update([
                            'stripe_connection_status' => 'connected',
                            'stripe_connected_at' => now(),
                        ]);
                    }

                    return response()->json([
                        'link' => route('api.stripe.reconnect')
                    ]);
                }
            }
            // first time link 
            $accountLink = DB::transaction(function () use ($user, $platform, $activeHostId, $payloadSecret, $payloadPublish, $hostStripe) {

                $account = Account::create([
                    'type'  => 'standard',
                    'email' => $user->email,
                    // 'capabilities' => [
                    //     'card_payments' => ['requested' => true],
                    //     'transfers'     => ['requested' => true],
                    // ],
                    'business_profile' => [
                        'name' => ($user->user_name ?? 'My SaaS User') . ' Pvt LTD',
                        'url'  => 'https://invoicing.bookwise.io',
                    ],
                ]);

                // Only update the shared users row in personal context.
                // In company context the HostUserStripe record (below) is the sole source of truth.
                $isPersonalCtx = (string) ($user->active_context_type ?? 'personal') !== 'company';
                if ($isPersonalCtx) {
                    $user->update([
                        'stripe_account_id' => $account->id,
                        'stripe_connection_status' => 'incomplete',
                    ]);
                }


                // Also store per-host so company context sees its own Stripe account
                $stripeHostId = $activeHostId ?? (int) ($user->host_id ?? 0);
                HostUserStripe::updateOrCreate(
                    [
                        'host_id' => $stripeHostId,
                        'host_user_id' => (int) $user->id,
                    ],
                    [
                        'stripe_account_id' => $account->id,
                        'stripe_connection_status' => 'incomplete',
                        'secret_key' => $payloadSecret ?: ($hostStripe->secret_key ?? null),
                        'publish_key' => $payloadPublish ?: ($hostStripe->publish_key ?? null),
                    ]
                );

                return AccountLink::create([
                    'account'     => $account->id,
                    'refresh_url' => route('api.stripe.refresh'),
                    'return_url'  => route('api.stripe.return', [
                        'user_id'  => $user->id,
                        'platform' => $platform,
                        'host_id'  => $stripeHostId,
                    ]),
                    'type'        => 'account_onboarding',
                ]);
            });


            if ($request->isMethod('get')) {
                return redirect($accountLink->url);
            }

            return response()->json([
                'link' => $accountLink->url
            ]);
        } catch (InvalidRequestException $e) {
            Log::warning('Stripe connect request failed', [
                'user_id' => $user?->id,
                'error' => $e->getMessage(),
            ]);

            if (Str::contains($e->getMessage(), "You can only create new accounts if you've signed up for Connect")) {
                return response()->json([
                    'message' => 'Stripe Connect is not enabled for this Stripe account. Please enable Connect in your Stripe Dashboard.'
                ], 500);
            }

            return response()->json([
                'message' => 'Unable to create Stripe Connect account at the moment.'
            ], 500);
        } catch (\Throwable $e) {
            Log::error('Stripe connect unexpected failure', [
                'user_id' => $user?->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Unable to process Stripe connection right now.'
            ], 500);
        }
    }
    /**
     * If onboarding fails or expires
     */
    public function refresh()
    {
        $frontendUrl = rtrim((string) config('app.frontend_url'), '/');
        $targetUrl = $frontendUrl . '/company?stripe=refresh';
        return response()->view('stripe-iframe-redirect', ['targetUrl' => $targetUrl]);
    }

    /**
     * After successful onboarding
     */
    public function return(Request $request)
    {
        $frontendUrl = rtrim((string) config('app.frontend_url'), '/');
        $user = User::find($request->query('user_id'));
        $platform = $request->query('platform', 'web');

        // If user not found
        if (!$user) {
            if ($platform === 'mobile') {
                return response()->view('stripe-iframe-redirect', ['targetUrl' => '/bookwise://home']);
            }
            $targetUrl = $frontendUrl . '/landing?stripe=error&reason=user_not_found';
            return response()->view('stripe-iframe-redirect', ['targetUrl' => $targetUrl]);
        }

        try {
            $isConnected = true;
            $hostId = (int) $request->query('host_id', 0);

            // Resolve the HostUserStripe record: use host_id from URL (company context)
            // or fall back to matching via users.stripe_account_id (personal / old URLs).
            $hostStripe = null;
            if ($hostId > 0) {
                $hostStripe = HostUserStripe::where('host_user_id', (int) $user->id)
                    ->where('host_id', $hostId)
                    ->first();
            }
            $resolvedStripeAccountId = $hostStripe?->stripe_account_id ?? $user->stripe_account_id;

            $stripeSecret = config('services.stripe.secret', config('stripe.secret'));
            $isLiveKey = $stripeSecret && str_starts_with((string) $stripeSecret, 'sk_live_');

            if ($isLiveKey && $resolvedStripeAccountId) {
                Stripe::setApiKey($stripeSecret);
                $account = Account::retrieve($resolvedStripeAccountId);
                $isConnected = $account->charges_enabled && $account->payouts_enabled;
            }

            // Only update the users table in personal context.
            // Company-context connects are tracked solely via HostUserStripe.
            $isPersonalReturn = $hostId === 0 && (string) ($user->active_context_type ?? 'personal') !== 'company';
            if ($isPersonalReturn) {
                $user->update([
                    'stripe_connection_status' => $isConnected ? 'connected' : 'pending_verification',
                    'stripe_connected_at' => $isConnected ? now() : null,
                ]);
            }

            if ($hostStripe) {
                // Company context: update the specific host stripe record directly.
                $hostStripe->update([
                    'stripe_connection_status' => $isConnected ? 'connected' : 'pending_verification',
                    'stripe_connected_at' => $isConnected ? now() : null,
                ]);
            } elseif ($user->stripe_account_id) {
                // Personal context or old return URLs without host_id: find by stripe_account_id.
                $hostStripes = HostUserStripe::where('host_user_id', (int) $user->id)
                    ->where('stripe_account_id', $user->stripe_account_id)
                    ->get();
                foreach ($hostStripes as $hs) {
                    $hs->update([
                        'stripe_connection_status' => $isConnected ? 'connected' : 'pending_verification',
                        'stripe_connected_at' => $isConnected ? now() : null,
                    ]);
                }
            }
        } catch (\Throwable $e) {
            Log::error('Stripe return callback failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
            // Still redirect to frontend so user isn't stuck on Stripe
            if ($platform === 'mobile') {
                return response()->view('stripe-iframe-redirect', ['targetUrl' => '/bookwise://stripe-connected?status=error']);
            }
            $targetUrl = $frontendUrl . '/company?stripe=error&reason=api_failure';
            return response()->view('stripe-iframe-redirect', ['targetUrl' => $targetUrl]);
        }

        if ($platform === 'mobile') {
            return response()->view('stripe-iframe-redirect', ['targetUrl' => '/bookwise://stripe-connected']);
        }
        $targetUrl = $frontendUrl . '/company?stripe=connected';
        return response()->view('stripe-iframe-redirect', ['targetUrl' => $targetUrl]);
    }


    /**
     * @OA\Delete(
     *     path="/api/v1/admin/stripe/disconnect",
     *     summary="Disconnect user Stripe account",
     *     description="Disconnects the authenticated user's Stripe account and resets Stripe connection status.",
     *     operationId="disconnectStripeAccount",
     *     tags={"Stripe"},
     *
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(
     *         response=200,
     *         description="Stripe disconnected successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(
     *                 property="message",
     *                 type="string",
     *                 example="Stripe disconnected successfully."
     *             )
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *
     *     @OA\Response(
     *         response=500,
     *         description="Internal server error",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     )
     * )
     */
    public function disconnect()
    {
        $user = Auth::user();

        // Sub-users cannot disconnect Stripe — only admins/owners can
        if ($user->hasRole('team-member')) {
            return response()->json([
                'message' => 'Sub-users cannot manage Stripe connection. Only account owners can disconnect Stripe.',
            ], 403);
        }

        $activeHostId = $this->resolveActiveHostId();
        $hostStripe = HostUserStripe::where('host_user_id', (int) $user->id)
            ->where('host_id', $activeHostId ?? (int) ($user->host_id ?? 0))
            ->first();

        $resolvedStripeAccountId = $hostStripe?->stripe_account_id ?? $user->stripe_account_id;

        if (!$resolvedStripeAccountId) {
            return response()->json([
                'message' => 'No Stripe account connected.'
            ], 400);
        }

        $isPersonalDisconnect = (string) ($user->active_context_type ?? 'personal') !== 'company';
        if ($isPersonalDisconnect) {
            $user->update([
                'stripe_connection_status' => 'disconnected',
                'stripe_connected_at' => null,
            ]);
        }

        if ($hostStripe) {
            $hostStripe->update([
                'stripe_connection_status' => 'disconnected',
                'stripe_connected_at' => null,
            ]);
        }

        return response()->json([
            'message' => 'Stripe disconnected successfully.'
        ]);
    }


    public function disconnectPermanent()
    {
        $user = Auth::user();

        // Sub-users cannot disconnect Stripe — only admins/owners can
        if ($user->hasRole('team-member')) {
            return response()->json([
                'message' => 'Sub-users cannot manage Stripe connection. Only account owners can disconnect Stripe.',
            ], 403);
        }

        $activeHostIdPerm = $this->resolveActiveHostId();
        $hostStripePerm = HostUserStripe::where('host_user_id', (int) $user->id)
            ->where('host_id', $activeHostIdPerm ?? (int) ($user->host_id ?? 0))
            ->first();

        $resolvedStripeAccountIdPerm = $hostStripePerm?->stripe_account_id ?? $user->stripe_account_id;

        if (!$resolvedStripeAccountIdPerm) {
            return response()->json([
                'message' => 'No Stripe account connected.'
            ], 400);
        }

        try {
            $stripeSecret = config('services.stripe.secret', config('stripe.secret'));
            Stripe::setApiKey($stripeSecret);

            $account = Account::retrieve($resolvedStripeAccountIdPerm);
            $account->delete();
        } catch (\Exception $e) {
            Log::error('Stripe account deletion failed: ' . $e->getMessage());

            return response()->json([
                'message' => 'Failed to delete Stripe account.'
            ], 500);
        }

        $isPersonalPerm = (string) ($user->active_context_type ?? 'personal') !== 'company';
        if ($isPersonalPerm) {
            $user->update([
                'stripe_connection_status' => 'permanently_disconnected',
                'stripe_connected_at' => null,
                'stripe_account_id' => null,
            ]);
        }

        if ($hostStripePerm) {
            $hostStripePerm->update([
                'stripe_connection_status' => 'permanently_disconnected',
                'stripe_connected_at' => null,
                'stripe_account_id' => null,
                'secret_key' => null,
                'publish_key' => null,
            ]);
        }

        return response()->json([
            'message' => 'Stripe account permanently deleted and disconnected.'
        ]);
    }


    public function reconnect()
    {
        $userId = Cache::get('stripe_reconnect');
        $frontendUrl = rtrim((string) config('app.frontend_url'), '/');

        if (!$userId) {
            return response()->view('stripe-iframe-redirect', ['targetUrl' => $frontendUrl . '/landing']);
        }

        return response()->view('stripe-iframe-redirect', ['targetUrl' => $frontendUrl . '/company?stripe=connected']);
    }
}
