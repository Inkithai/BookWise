// app/propertyPL/page.tsx
'use client'


import Sidebar from '../../../components/common/sidebar/Sidebar'
import { PropertyPLSection} from '../../../components/bookings-management/propertyPL/property-pl-section'
import { Footer } from '../../../components/common/Footer'
import { PropertiesList} from '../../../components/bookings-management/propertyPL/PropertiesList'



export default function PropertyPL() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-1">
        {/* Sidebar */}
        <div>
          <Sidebar />
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-x-hidden flex flex-col">

          {/* propertyPL Section */}
          <div className="p-6 space-y-6 flex-1">
            
            <PropertiesList />
            <PropertyPLSection />
          
          </div>

          {/* Footer */}
          <Footer />
        </div>
      </div>
    </div>
  )
}