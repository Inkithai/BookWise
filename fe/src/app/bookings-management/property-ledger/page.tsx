// pages/index.tsx
import { PropertyLedger } from '../../../components/bookings-management/property-ledger/PropertyLedger'
import Sidebar from '../../../components/common/sidebar/Sidebar'
import { Footer } from '../../../components/common/Footer'

export default function PropertyLedgerPage() {
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
              <div className=" space-y-6 flex-1">
                
      <PropertyLedger/>
              </div>
    
              {/* Footer */}
              <Footer />
            </div>
          </div>
        </div>
   
  );
}