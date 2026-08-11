// app/invoice/clients/[id]/page.tsx
// app/invoice/clients/[id]/page.tsx
"use client"

import { ClientDetail } from "@/components/invoice/clients/ClientDetail"
import Sidebar from '@/components/common/sidebar/Sidebar';
import { Footer } from '@/components/common/Footer';
import { useParams } from 'next/navigation';

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 overflow-x-hidden flex flex-col w-full pt-16 lg:pt-0">
          <main className="flex-1 p-6">
            <ClientDetail clientId={clientId} />
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}