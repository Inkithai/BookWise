// app/property/page.tsx
import { PropertyTable } from "@/components/property/PropertyTable"
import { PropertyCreateButton } from "@/components/property/PropertyCreateButton"
import Sidebar from '@/components/common/sidebar/Sidebar'
import { Footer } from '@/components/common/Footer'

export default function PropertyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 overflow-x-hidden flex flex-col">
          <main className="flex-1 p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Property</h1>
              <PropertyCreateButton />
            </div>
            <PropertyTable />
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}