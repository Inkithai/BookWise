// pages/index.tsx
import { GeneralExpensesSection } from '../../../components/bookings-management/general-expenses/general-expenses-section'

import Sidebar from '../../../components/common/sidebar/Sidebar'
import { Footer } from '../../../components/common/Footer'

export default function GeneralExpenses() {
  return (

    <div className="min-h-screen bg-background text-foreground flex flex-col">
          <div className="flex flex-1">
            {/* Sidebar */}
            <div>
              <Sidebar />
            </div>
    
            {/* Main Content */}
            <div className="flex-1 overflow-x-hidden flex flex-col">
    
              {/* General-Expenses Section */}
              <div className="p-6 space-y-6 flex-1">
                
                <GeneralExpensesSection />
              </div>
    
              {/* Footer */}
              <Footer />
            </div>
          </div>
        </div>
   
  );
}