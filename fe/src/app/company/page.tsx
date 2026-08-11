// app/company/page.tsx
'use client';
import Sidebar from '@/components/common/sidebar/Sidebar'
import { Footer } from '@/components/common/Footer'
import { CompanyContent } from '@/components/company/company-content';
import PermissionGuard from '@/components/common/PermissionGuard';

export default function CompanyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 overflow-x-hidden flex flex-col">
          <main className="flex-1 p-6">
            <PermissionGuard permission="company.change">
              <CompanyContent />
            </PermissionGuard>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}