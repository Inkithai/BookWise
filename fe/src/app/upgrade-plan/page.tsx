import { redirect } from 'next/navigation'

export default function UpgradePlanPage() {
  redirect('/settings?tab=upgrade-plan')
}
