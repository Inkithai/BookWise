'use client';

import Sidebar from '@/components/common/sidebar/Sidebar';
import { Footer } from '@/components/common/Footer';
import RecurringStatementsManager from '@/components/recurring/RecurringStatementsManager';

export default function RecurringStatementsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden flex flex-col w-full pt-16 lg:pt-0">
          <div className="p-4 sm:p-6 flex-1">
            <RecurringStatementsManager />
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
}
