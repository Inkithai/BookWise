import { redirect } from 'next/navigation'

export default function RolesPage() {
  redirect('/users?tab=roles')
}
