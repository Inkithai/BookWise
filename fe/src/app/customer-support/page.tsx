import { redirect } from 'next/navigation'

export default function CustomerSupportPage() {
  redirect('/settings?tab=customer-support')
}
