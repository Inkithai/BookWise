// pages/index.tsx
import BookingCancellationPage from '../../../components/bookings-management/cancellation/BookingCancellation';

import Sidebar from '../../../components/common/sidebar/Sidebar';
import { Footer } from '../../../components/common/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main Content */}
        <div className="flex-1 overflow-x-hidden flex flex-col">
          {/* BookingCancelRequestManagement Section - removed top padding */}
          <div className="flex-1">
            <BookingCancellationPage />
          </div>
          
          {/* Footer */}
          <Footer />
        </div>
      </div>
    </div>
  );
}