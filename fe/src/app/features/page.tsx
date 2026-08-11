"use client"
import Sidebar from '@/components/common/sidebar/Sidebar'
import { Footer } from '@/components/common/Footer'
import FeaturesManager from '@/components/features/FeaturesManager'

export default function FeaturesPage() {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <div className="flex flex-1">
                <Sidebar />
                <div className="flex-1 overflow-x-hidden flex flex-col pt-16 lg:pt-0">
                    <main className="flex-1 p-6">
                        <FeaturesManager />
                    </main>
                    <Footer />
                </div>
            </div>
        </div>
    )
}
