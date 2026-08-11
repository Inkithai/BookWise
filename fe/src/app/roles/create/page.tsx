//app/roles/create/page.tsx
import Sidebar from '@/components/common/sidebar/Sidebar'
import { Footer } from '@/components/common/Footer'
import { RoleForm } from '@/components/roles/RoleForm'

export default function Page() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 overflow-x-hidden flex flex-col w-full pt-16 lg:pt-0">
          <main className="flex-1 p-6">
            <RoleForm />
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}