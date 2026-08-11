// app/invoice/clients/create/page.tsx
"use client"

import { CreateClientForm } from "@/components/invoice/clients/CreateClientForm"
import Sidebar from '@/components/common/sidebar/Sidebar';
import { Footer } from '@/components/common/Footer';

export default function CreateClientPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 overflow-x-hidden flex flex-col w-full pt-16 lg:pt-0">
          <main className="flex-1 p-4 md:p-6">
            <CreateClientForm />
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}

