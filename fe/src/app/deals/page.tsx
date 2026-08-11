// app/deals/page.tsx
import Sidebar from '@/components/common/sidebar/Sidebar'
import { Footer } from '@/components/common/Footer'
import DealsTable from '@/components/deals/DealsTable'

export default function Page() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 overflow-x-hidden flex flex-col">
          <main className="flex-1 p-4 sm:p-6">
            <DealsTable />
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}