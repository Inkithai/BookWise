
import { RecipientTable } from "@/components/invoice/recipients/RecipientTable"
import Sidebar from '@/components/common/sidebar/Sidebar';
import { Footer } from '@/components/common/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Main layout container */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex-1 overflow-x-hidden flex flex-col">
          {/* Page content */}
          <main className="flex-1 p-6">
            {/* Header with title and dialog button */}
          

            {/* Invoice table container - outer box removed */}
            <RecipientTable />

          </main>

          {/* Footer */}
          <Footer />
        </div>
      </div>
    </div>
  );
}