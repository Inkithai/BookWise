"use client"

import Sidebar from '../../components/common/sidebar/Sidebar';
import { Footer } from './../../components/common/Footer';
import WhatsAppAdminPanel from '@/components/WhatsappAdmin/WhatsAppAdminPanel';
export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 overflow-x-hidden flex flex-col">
          <div className="flex-1">
            <WhatsAppAdminPanel />
          </div>
          <Footer />
        </div>
      </div>
    </div>
  );
}

