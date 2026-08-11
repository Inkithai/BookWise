<?php

namespace Modules\Invoice\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Invoice\Services\InvoiceWebHookService;
use Stripe\Webhook;

class InvoiceStripeWebhookController extends Controller
{

    public function handle(Request $request, InvoiceWebHookService $service)
    {
        $payload = $request->getContent();
        $signature = $request->header('Stripe-Signature');
        $secret = config('stripe.webhook_secret');


        try {
            $event = Webhook::constructEvent($payload, $signature, $secret);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Invalid webhook signature'], 400);
        }

        switch ($event->type) {

            case 'checkout.session.completed':
                $service->handleCheckoutCompleted($event->data->object);
                break;

            case 'payment_intent.payment_failed':
                $service->handlePaymentFailed($event->data->object);
                break;

            case 'checkout.session.expired':
                $service->handleSessionExpired($event->data->object);
                break;
        }

        return response()->json(['status' => 'success']);
    }
}
