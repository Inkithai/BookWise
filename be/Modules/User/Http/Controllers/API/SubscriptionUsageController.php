<?php



namespace Modules\User\Http\Controllers\API;



use App\Enums\InvoiceStatus;

use App\Http\Controllers\Controller;

use App\Models\Company;

use App\Services\Subscription\SubscriptionPlanService;

use Illuminate\Http\JsonResponse;

use Illuminate\Http\Request;

use Modules\Invoice\Models\Invoice;

use Modules\Invoice\Models\InvoiceClient;

use Modules\Invoice\Models\Receipt;

use Modules\User\Models\User as InvoiceUser;



/**

 * Current plan entitlements and per-host usage (validated against billing user subscription).

 */

class SubscriptionUsageController extends Controller

{

    public function __construct(

        private readonly SubscriptionPlanService $plans

    ) {

        $this->middleware(['auth:api', 'otp.verified']);

    }



    public function show(Request $request): JsonResponse

    {

        $user = $request->user();

        if (! $user instanceof InvoiceUser) {

            return response()->json(['success' => false, 'message' => 'Invalid user context.'], 403);

        }



        $hostId = (int) $request->query('host_id', $user->host_id ?? 0);

        if ($hostId <= 0) {

            return response()->json(['success' => false, 'message' => 'host_id is required.'], 422);

        }



        $billingUser = InvoiceUser::primaryBillingUserForHost($hostId) ?? $user;

        $entitlements = $this->plans->entitlementsForUser($billingUser);

        $subscription = $this->plans->subscriptionForUser($billingUser);



        $usage = [

            'invoices' => Invoice::query()

                ->where('host_id', $hostId)

                ->whereMonth('created_at', now()->month)

                ->whereYear('created_at', now()->year)

                ->count(),

            'clients' => InvoiceClient::query()->where('host_id', $hostId)->count(),

            'receipts' => Receipt::query()

                ->whereHas('invoice', fn ($q) => $q->where('host_id', $hostId))

                ->whereMonth('created_at', now()->month)

                ->whereYear('created_at', now()->year)

                ->count(),

            'send_invoices' => Invoice::query()

                ->where('host_id', $hostId)

                ->whereIn('status', [

                    InvoiceStatus::MailSent->value,

                    InvoiceStatus::ReceiptSent->value,

                ])

                ->whereMonth('updated_at', now()->month)

                ->whereYear('updated_at', now()->year)

                ->count(),

            'team_members' => InvoiceUser::query()->where('host_id', $hostId)->count(),

            'companies_owned' => Company::query()->where('owner_user_id', $billingUser->id)->count(),

        ];



        $limits = $entitlements['limits'] ?? [];

        $remaining = [];

        foreach ($limits as $key => $max) {

            $maxInt = (int) $max;

            if ($maxInt === -1 || $entitlements['full_trial_access']) {

                $remaining[$key] = null;

                continue;

            }

            $current = (int) ($usage[$key] ?? 0);

            $remaining[$key] = max(0, $maxInt - $current);

        }



        return response()->json([

            'success' => true,

            'data' => [

                'host_id' => $hostId,

                'billing_user_id' => $billingUser->id,

                'subscription_status' => $subscription?->status,

                'entitlements' => $entitlements,

                'allowed_templates' => $this->plans->allowedTemplateKeys($billingUser),

                'usage' => $usage,

                'remaining' => $remaining,

            ],

        ]);

    }

}


