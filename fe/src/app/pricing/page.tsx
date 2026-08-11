import { redirect } from 'next/navigation';
import { UPGRADE_PLAN_PATH } from '@/lib/subscription-routes';

/** Legacy route — plan selection lives under Settings → Pricing. */
export default function PricingPage() {
  redirect(UPGRADE_PLAN_PATH);
}
