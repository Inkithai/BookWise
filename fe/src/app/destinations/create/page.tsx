// app/destinations/create/page.tsx
"use client";
import Sidebar from '@/components/common/sidebar/Sidebar'
import { Footer } from '@/components/common/Footer'
import DestinationForm from '@/components/destinations/DestinationForm'
import { useRouter } from 'next/navigation'

// Use the same type as the form component (inferred from Zod schema)
type DestinationFormData = {
  name: string;
  locationNickname?: string;
  country: string;
  description: string;
  images?: File[];
  sections?: Array<{
    title: string;
    subtitle?: string;
    content: string;
    images?: File[];
  }>;
};

export default function Page() {
  const router = useRouter()

  const handleSubmit = (data: DestinationFormData) => {
    console.log('Creating destination:', data)
    // Add your API call here
    // router.push('/destinations')
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 overflow-x-hidden flex flex-col">
          <main className="flex-1 p-4 sm:p-6">
              <DestinationForm 
                mode="create"
                onCancel={() => router.push('/destinations')}
                onSubmit={handleSubmit}
              />
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}