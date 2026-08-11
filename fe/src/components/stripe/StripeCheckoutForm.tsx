"use client";

import { http } from "@/services/service";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { Loader } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface StripeCheckoutFormProps {

    subscriptionId: string;
}

export default function StripeCheckoutForm({ subscriptionId }: StripeCheckoutFormProps) {
    const stripe = useStripe();
    const elements = useElements();

    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: any) => {
        e.preventDefault();

        if (!stripe || !elements) return;

        setLoading(true);

        try {
            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: `${window.location.origin}/subscription/activated`,
                },

                // savePaymentMethod: true,
                // Save the payment method for future use
                redirect: 'if_required', // prevents auto redirect if 3DS not needed

            });

            if (error) {
                console.error(error.message);
                toast.error(error.message);
                setLoading(false);
                return;
            }

            if (paymentIntent && paymentIntent.status === 'succeeded') {
                //   const paymentMethodId = paymentIntent.payment_method;

                // Send this ID to your backend to save in subscription
                await http.post('admin/plans/save-payment-method', {
                    subscription_id: subscriptionId, // send subscription identifier
                    payment_intent_id: paymentIntent.id,
                });

                toast.success('Payment successful!');
                location.href = '/subscription/activated'
            }

        } catch (err) {
            console.error(err);
            toast.error('Payment failed');
        }

        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6  p-2 rounded-2xl  max-h-[80vh] overflow-y-auto">
            <PaymentElement />



            <button
                type="submit"
                disabled={!stripe || loading}
                //   className="w-full py-3 bg-primary text-white rounded-lg"
                className="w-full py-3 px-6 bg-primary text-white rounded-lg font-medium
                     hover:opacity-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
            >

                {loading && (
                    <>
                        <Loader className="w-4 h-4 animate-spin" />

                    </>
                )

                }
                {loading ? ' Processing...' : 'Pay now'}

            </button>
        </form>
    );
}