"use client";

import { Elements } from "@stripe/react-stripe-js";
import { getStripePromise, STRIPE_KEY_ENV_HINT } from "@/lib/stripe-client";

const stripePromise = getStripePromise();

export default function StripeProvider({
  clientSecret,
  children,
}: {
  clientSecret: string | null | undefined;
  children: React.ReactNode;
}) {
  if (!stripePromise) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
      >
        Stripe publishable key is missing. Add{" "}
        <code className="rounded bg-amber-100 px-1 font-mono text-xs dark:bg-amber-900/60">
          {STRIPE_KEY_ENV_HINT}
        </code>{" "}
        to your <code className="font-mono text-xs">.env</code> or{" "}
        <code className="font-mono text-xs">.env.local</code> (your{" "}
        <code className="font-mono text-xs">pk_test_…</code> or{" "}
        <code className="font-mono text-xs">pk_live_…</code> key), then restart{" "}
        <code className="font-mono text-xs">npm run dev</code>.
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret: clientSecret ?? undefined }}>
      {children}
    </Elements>
  );
}
