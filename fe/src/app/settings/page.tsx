// app/settings/page.tsx

'use client'



import { useEffect, useMemo, useState } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { SettingsComponent } from '@/components/settings/settings'

import Profile from '@/components/profile/Profile'

import UpgradePlanSection from '@/components/subscription/UpgradePlanSection'

import CustomerSupportForm from '@/components/customer-support/CustomerSupportForm'

import Sidebar from '../../components/common/sidebar/Sidebar'

import { Footer } from '@/components/common/Footer'

import { PageHeaderTabs, type PageNavTab } from '@/components/common/PageNavTabs'

import { ThemeToggle } from '@/components/common/ThemeToggle'

import { usePermissions } from '@/utils/permissions'

import { isSubUser } from '@/utils/account-context'

import { getInvoiceReferralRole } from '@/lib/invoice-referral-scope'

import { useAppSelector } from '@/slices/hooks'



type SettingsTabId = 'profile' | 'settings' | 'upgrade-plan' | 'customer-support'



function canAccessAdminSettingsTabs(user: unknown, isSubUserAccount: boolean): boolean {

  if (isSubUserAccount || !user) return false

  const role = getInvoiceReferralRole(user)

  return role === 'admin' || role === 'super-admin'

}



function canAccessUpgradePlanTab(user: unknown, isSubUserAccount: boolean): boolean {

  return Boolean(user) && !isSubUserAccount

}



const TAB_COPY: Record<SettingsTabId, { heading: string; subheading: string }> = {

  profile: {

    heading: 'Profile',

    subheading: 'Complete overview of your personal information',

  },

  settings: {

    heading: 'Settings',

    subheading: 'Complete overview of account preferences and configuration',

  },

  'upgrade-plan': {

    heading: 'Plans & pricing',

    subheading: 'Choose or change your subscription plan',

  },

  'customer-support': {

    heading: 'Customer Support',

    subheading: 'Complete overview of support requests and help options',

  },

}



export default function SettingsPage() {

  const router = useRouter()

  const pathname = usePathname()

  const searchParams = useSearchParams()

  const { user } = usePermissions()

  const authUser = useAppSelector((s) => s.auth.authUser)

  const isSubUserAccount = isSubUser(authUser ?? user)

  const showAdminSettingsTabs = canAccessAdminSettingsTabs(user, isSubUserAccount)

  const showUpgradePlanTab = canAccessUpgradePlanTab(user, isSubUserAccount)



  const seenPricing =

    authUser?.onboarding?.has_seen_pricing === true ||

    (typeof window !== 'undefined' && localStorage.getItem('hasSeenPricing') === 'true') ||

    (typeof window !== 'undefined' && localStorage.getItem('trialActivated') === 'true')



  const onboardingMode = showUpgradePlanTab && !seenPricing



  const resolveTab = (raw: string | null): SettingsTabId => {

    if (raw === 'upgrade-plan' && showUpgradePlanTab) return 'upgrade-plan'

    const candidate = (raw as SettingsTabId) || (showAdminSettingsTabs ? 'settings' : 'profile')

    if (!['profile', 'upgrade-plan', 'customer-support', 'settings'].includes(candidate)) {

      return showAdminSettingsTabs ? 'settings' : 'profile'

    }

    if (candidate === 'upgrade-plan' && !showUpgradePlanTab) return 'profile'

    if (candidate === 'settings' && !showAdminSettingsTabs) return 'profile'

    if (candidate === 'customer-support' && !showAdminSettingsTabs) return 'profile'

    return candidate

  }



  const tabFromUrl = resolveTab(searchParams.get('tab'))

  const [activeTab, setActiveTab] = useState<SettingsTabId>(tabFromUrl)



  useEffect(() => {

    setActiveTab(resolveTab(searchParams.get('tab')))

  }, [searchParams, showAdminSettingsTabs, showUpgradePlanTab])



  useEffect(() => {

    if (!showUpgradePlanTab && activeTab === 'upgrade-plan') {

      const params = new URLSearchParams(searchParams.toString())

      params.set('tab', 'profile')

      router.replace(`${pathname}?${params.toString()}`)

    }

  }, [showUpgradePlanTab, activeTab, pathname, router, searchParams])



  const setTab = (tab: SettingsTabId) => {

    setActiveTab(tab)

    const params = new URLSearchParams(searchParams.toString())

    params.set('tab', tab)

    router.replace(`${pathname}?${params.toString()}`)

  }



  const tabs: PageNavTab[] = useMemo(() => {

    const all: PageNavTab[] = [

      { id: 'profile', name: 'Profile', icon: 'User', onClick: () => setTab('profile') },

      { id: 'settings', name: 'Settings', icon: 'Settings', onClick: () => setTab('settings') },

      { id: 'upgrade-plan', name: 'Pricing', icon: 'DollarSign', onClick: () => setTab('upgrade-plan') },

      { id: 'customer-support', name: 'Customer Support', icon: 'LifeBuoy', onClick: () => setTab('customer-support') },

    ]

    return all.filter((t) => {

      if (t.id === 'upgrade-plan') return showUpgradePlanTab

      if (t.id === 'settings' || t.id === 'customer-support') return showAdminSettingsTabs

      return true

    })

  }, [showAdminSettingsTabs, showUpgradePlanTab])



  const copy = TAB_COPY[activeTab]



  return (

    <div className="min-h-screen bg-background text-foreground flex flex-col">

      <div className="flex flex-1">

        <Sidebar />



        <div className="flex-1 overflow-x-hidden flex flex-col w-full bg-gradient-to-br from-slate-50 to-teal-50/30">

          <PageHeaderTabs title={copy.heading} description={copy.subheading} tabs={tabs} activeTabId={activeTab} actions={<ThemeToggle />} />

          <main className="flex-1 p-6">

            {activeTab === 'profile' && <Profile />}

            {activeTab === 'settings' && showAdminSettingsTabs && <SettingsComponent />}

            {activeTab === 'upgrade-plan' && showUpgradePlanTab && (

              <UpgradePlanSection onboardingMode={onboardingMode} />

            )}

            {activeTab === 'customer-support' && showAdminSettingsTabs && <CustomerSupportForm />}

          </main>



          <Footer />

        </div>

      </div>

    </div>

  )

}


