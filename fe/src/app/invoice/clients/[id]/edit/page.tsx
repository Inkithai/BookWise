// app/invoice/clients/[id]/edit/page.tsx
// app/invoice/clients/[id]/edit/page.tsx
"use client"

import { EditClientForm } from "@/components/invoice/clients/EditClientForm"
import Sidebar from '@/components/common/sidebar/Sidebar';
import { Footer } from '@/components/common/Footer';
import { useParams } from 'next/navigation';

export default function EditClientPage() {
  const params = useParams();
  const clientId = params.id as string;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 overflow-x-hidden flex flex-col w-full pt-16 lg:pt-0">
          <main className="flex-1 p-6">
            <EditClientForm clientId={clientId} />
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}