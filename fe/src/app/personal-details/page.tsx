// app/personal-details/page.tsx
'use client';

import PersonalDetails from '@/components/profile/PersonalDetails';
import Sidebar from '@/components/common/sidebar/Sidebar';
import { Footer } from '@/components/common/Footer';

export default function PersonalDetailsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-1">
        {/* Sidebar */}
        <div>
          <Sidebar />
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-x-hidden flex flex-col w-full pt-16 lg:pt-0">
          <div className="p-6 space-y-6 flex-1">
            <PersonalDetails />
          </div>

          {/* Footer */}
          <Footer />
        </div>
      </div>
    </div>
  );
}