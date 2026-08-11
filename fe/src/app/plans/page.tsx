'use client';

import SuperAdminGuard from '@/components/common/SuperAdminGuard';
import Sidebar from '@/components/common/sidebar/Sidebar';
import { Footer } from '@/components/common/Footer';
import PlansManagement from '@/components/plans/PlansManagement';
import { CreditCard } from 'lucide-react';

export default function PlansPage() {
  return (
    <SuperAdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/30 flex flex-col">
        <div className="flex flex-1">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <header className="bg-white border-b border-slate-200 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-slate-900">Plan feature validation</h1>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Plans and pricing from BookWise — configure Invoice features and limits only.
                  </p>
                </div>
              </div>
            </header>

            <main className="flex-1 p-6">
              <div className="max-w-7xl mx-auto">
                <PlansManagement />
              </div>
            </main>
            <Footer />
          </div>
        </div>
      </div>
    </SuperAdminGuard>
  );
}
