// app/users/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Sidebar from '@/components/common/sidebar/Sidebar'
import { Footer } from '@/components/common/Footer'
import { PageHeaderTabs, type PageNavTab } from '@/components/common/PageNavTabs'
import { ThemeToggle } from '@/components/common/ThemeToggle'

const UsersContent = dynamic(
  () =>
    import('@/components/users/users-content').then((mod) => ({
      default: mod.UsersContent,
    })),
  {
    loading: () => (
      <div
        className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground"
        aria-busy="true"
        aria-label="Loading users"
      >
        <div className="h-10 w-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
        <p className="text-sm">Loading users…</p>
      </div>
    ),
  }
)
const RolesTable = dynamic(() => import('@/components/roles/RolesTable'))

type UserTabId = 'users' | 'roles'

const TAB_COPY: Record<UserTabId, { heading: string; subheading: string }> = {
  users: {
    heading: 'Users',
    subheading: 'Complete overview of user accounts and permissions',
  },
  roles: {
    heading: 'Roles',
    subheading: 'Complete overview of role access and permissions',
  },
}

export default function Page() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tabFromUrl = (searchParams.get('tab') as UserTabId) || 'users'
  const [activeTab, setActiveTab] = useState<UserTabId>(tabFromUrl === 'roles' ? 'roles' : 'users')

  useEffect(() => {
    const nextTab = (searchParams.get('tab') as UserTabId) || 'users'
    setActiveTab(nextTab === 'roles' ? 'roles' : 'users')
  }, [searchParams])

  const setTab = (tab: UserTabId) => {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`${pathname}?${params.toString()}`)
  }

  const tabs: PageNavTab[] = useMemo(
    () => [
      { id: 'users', name: 'Users', icon: 'Users', onClick: () => setTab('users') },
      { id: 'roles', name: 'Roles', icon: 'Key', onClick: () => setTab('roles') },
    ],
    [searchParams]
  )

  const copy = TAB_COPY[activeTab]

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 overflow-x-hidden flex flex-col w-full bg-gradient-to-br from-slate-50 to-teal-50/30">
          <PageHeaderTabs title={copy.heading} description={copy.subheading} tabs={tabs} activeTabId={activeTab} actions={<ThemeToggle />} />
          <main className="flex-1 p-6">
            {activeTab === 'users' ? <UsersContent /> : <RolesTable />}
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}
