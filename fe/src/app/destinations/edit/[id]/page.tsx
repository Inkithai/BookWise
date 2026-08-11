"use client";
// app/destinations/edit/[id]/page.tsx
import Sidebar from '@/components/common/sidebar/Sidebar'
import { Footer } from '@/components/common/Footer'
import DestinationForm from '@/components/destinations/DestinationForm'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

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

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  // const { id } = use(params)
  const router = useRouter()
  const [id, setId] = useState<string>('')

  useEffect(() => {
    params.then(({ id }) => setId(id))
  }, [params])

  // Mock data - replace with actual data fetching
  const initialData: DestinationFormData = {
    name: 'Mountain Resort',
    locationNickname: 'Alpine Paradise',
    country: 'Switzerland',
    description: 'Beautiful mountain views with ski facilities',
    images: [],
    sections: [
      {
        title: 'Winter Activities',
        subtitle: 'Snow fun for everyone',
        content: 'Enjoy skiing, snowboarding and more',
        images: []
      }
    ]
  }

  const handleSubmit = (data: DestinationFormData) => {
    console.log('Updating destination:', id, data)
    // Add your API call here
    // router.push('/destinations')
  }

  if (!id) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 overflow-x-hidden flex flex-col">
          <main className="flex-1 p-4 sm:p-6">
            <DestinationForm
              mode="edit"
              initialData={initialData}
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