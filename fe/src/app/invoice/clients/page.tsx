// app/invoice/clients/page.tsx - UPDATED RESPONSIVE VERSION
"use client"

import { InvoiceClientTable } from "@/components/invoice/clients/InvoiceClientTable"
import Sidebar from '@/components/common/sidebar/Sidebar';
import { Footer } from '@/components/common/Footer';
import PermissionGuard from '@/components/common/PermissionGuard';

export default function InvoiceClientsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-1">
        {/* Sidebar - Shows as navbar on mobile, sidebar on desktop */}
        <Sidebar />
        
        {/* Main Content Area with mobile padding */}
        <div className="flex-1 overflow-x-hidden flex flex-col w-full pt-16 lg:pt-0">
          {/* Main content with responsive padding */}
          <main className="flex-1 p-4 md:p-6">
            <PermissionGuard permission="invoice-client.view">
              <InvoiceClientTable />
            </PermissionGuard>
          </main>   
          {/* Footer */}
          <Footer />
        </div>
      </div>
    </div>
  );
}