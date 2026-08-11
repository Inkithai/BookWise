// app/property/view/[id]/page.tsx
import { PropertyEditPage } from "@/components/property/PropertyEditPage"
import Sidebar from '@/components/common/sidebar/Sidebar'
import { Footer } from '@/components/common/Footer'
export default function PropertyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 overflow-x-hidden flex flex-col w-full pt-16 lg:pt-0">
          <main className="flex-1 p-6">
            <PropertyEditPage />
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}