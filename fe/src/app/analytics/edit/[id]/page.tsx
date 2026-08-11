// app/analytics/edit/[id]/page.tsx
'use client';
import Sidebar from '@/components/common/sidebar/Sidebar'
import { Footer } from '@/components/common/Footer'
import { useParams } from 'next/navigation';
import { AnalyticsUserDetailView } from '@/components/analytics/AnalyticsUserDetailView';

export default function AnalyticsEditUserPage() {
  const params = useParams();
  const userId = parseInt(params.id as string);
  const hasValidUserId = Number.isFinite(userId);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 overflow-x-hidden flex flex-col">
          <main className="flex-1 p-6">
            {hasValidUserId ? (
              <AnalyticsUserDetailView userId={userId} />
            ) : (
              <div className="text-sm text-destructive">Invalid user id.</div>
            )}
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}
