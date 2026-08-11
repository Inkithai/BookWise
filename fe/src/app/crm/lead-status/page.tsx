// src/app/crm/lead-status/page.tsx
import Sidebar from '../../../components/common/sidebar/Sidebar';
import { Footer } from '../../../components/common/Footer';
import { LeadStatusManager } from '../../../components/crm/LeadStatusManager';

export default function LeadStatusPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-1">
        {/* Sidebar */}
        <div>
          <Sidebar />
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-x-hidden flex flex-col">
          {/* CRM Section */}
          <div className="p-6 space-y-6 flex-1">
            <LeadStatusManager />
          </div>

          {/* Footer */}
          <Footer />
        </div>
      </div>
    </div>
  );
}