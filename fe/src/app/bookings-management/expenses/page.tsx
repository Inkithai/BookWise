// pages/index.tsx
import { BookingExpensesSection } from '../../../components/bookings-management/expenses/booking-expenses-section'

import Sidebar from '../../../components/common/sidebar/Sidebar'
import { Footer } from '../../../components/common/Footer'

export default function Home() {
  return (

    <div className="min-h-screen bg-background text-foreground flex flex-col">
          <div className="flex flex-1">
            {/* Sidebar */}
            <div>
              <Sidebar />
            </div>
    
            {/* Main Content */}
            <div className="flex-1 overflow-x-hidden flex flex-col">
    
              {/* BookingExpenses Section */}
              <div className="p-6 space-y-6 flex-1">
                
      <BookingExpensesSection/>
              </div>
    
              {/* Footer */}
              <Footer />
            </div>
          </div>
        </div>
   
  );
}

