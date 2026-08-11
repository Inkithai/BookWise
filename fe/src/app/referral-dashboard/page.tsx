// app/referral-dashboard/page.tsx
import { Suspense } from 'react';
import Sidebar from '@/components/common/sidebar/Sidebar';
import { Footer } from '@/components/common/Footer';
import ReferralDashboardContent from '@/components/referral/ReferralDashboardContent';

export const metadata = {
    title: 'Referral Dashboard | BookWise',
    description: 'Manage your referral codes, track earnings and share your referral link.',
};

export default function ReferralDashboardPage() {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <div className="flex flex-1">
                <Sidebar />
                <div className="flex-1 overflow-x-hidden flex flex-col w-full bg-gradient-to-br from-slate-50 to-teal-50/30">
                    <main className="flex-1 flex flex-col">
                        <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading referral dashboard…</div>}>
                            <ReferralDashboardContent />
                        </Suspense>
                    </main>
                    <Footer />
                </div>
            </div>
        </div>
    );
}
