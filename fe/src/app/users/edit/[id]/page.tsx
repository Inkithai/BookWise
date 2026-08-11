// app/users/edit/[id]/page.tsx
'use client';
import Sidebar from '@/components/common/sidebar/Sidebar'
import { Footer } from '@/components/common/Footer'
import { useParams } from 'next/navigation';
import { UserForm } from '@/components/users/user-form';
import PermissionGuard from '@/components/common/PermissionGuard';

export default function EditUserPage() {
  const params = useParams();
  const userId = parseInt(params.id as string);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 overflow-x-hidden flex flex-col w-full pt-16 lg:pt-0">
          <main className="flex-1 p-6">
            <PermissionGuard permission="user.edit">
              <UserForm isEdit={true} userId={userId} />
            </PermissionGuard>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}