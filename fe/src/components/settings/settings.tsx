// SettingsComponent.tsx - FIXED VERSION
'use client'
import { ThemeToggle } from '../common/ThemeToggle'
import { SidebarColorPicker, themeNameToHex, resolveThemeName } from '../../components/common/sidebar/SidebarColorPicker'
import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/slices/store'
import { setPdfThemeColor, initializePdfSettings, clearAll } from '@/slices/invoiceSlice'
import { Label } from '@/components/ui/label'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { Check, Crown, Calendar, CreditCard, FileText, AlertTriangle, Zap, Settings, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppSelector } from '@/slices/hooks'
import { useRouter } from 'next/navigation'
import { changeUserTheme, createCompanyAccount, getCurrentUser, switchAccountContext } from '@/services/service'
import { useTheme } from 'next-themes'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { setAuthUser, setFullUser } from '@/slices/authSlice'
import { getResolvedActiveCompanyId, getResolvedContextType, isSubUser, normalizeAvailableCompanies } from '@/utils/account-context'
import { usePermissions } from '@/utils/permissions'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CURRENCY_OPTIONS } from '@/services/interface/invoice'

// Focused color palette - Blue shades, Black, and Gray only
const PDF_COLOR_PRESETS = [
  // Black & Grays
  { name: 'Black', value: '#000000' },
  { name: 'Dark Gray', value: '#374151' },
  { name: 'Gray', value: '#6B7280' },
  { name: 'Light Gray', value: '#9CA3AF' },

  // Blue shades
  { name: 'Navy Blue', value: '#1e3a8a' },
  { name: 'Royal Blue', value: '#1e40af' },
  { name: 'Blue', value: '#0D9488' },
  { name: 'Sky Blue', value: '#14B8A6' },
  { name: 'Light Blue', value: '#2DD4BF' },
]

// Subscription mock data - UPDATED: Free plan is available forever
const useSubscriptionData = () => {
  const [subscription, setSubscription] = useState({
    status: 'free', // 'free', 'paid', 'trial'
    plan: 'Free',
    nextBillingDate: '',
    renewalType: 'Monthly'
  })

  return { subscription, setSubscription }
}

export function SettingsComponent() {
  const dispatch = useDispatch<AppDispatch>()
  const router = useRouter()
  const pdfThemeColor = useSelector((state: RootState) => state.invoice.pdfThemeColor)
  const [sidebarTheme, setSidebarTheme] = useState('white')
  const [sidebarThemeDraft, setSidebarThemeDraft] = useState('white')
  const [sidebarThemeSaving, setSidebarThemeSaving] = useState(false)
  const [pdfThemeColorDraft, setPdfThemeColorDraft] = useState(pdfThemeColor)
  const [pdfThemeColorSaving, setPdfThemeColorSaving] = useState(false)
  const [customColor, setCustomColor] = useState(pdfThemeColor)
  const [mounted, setMounted] = useState(false)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const { subscription, setSubscription } = useSubscriptionData()
  const { isFirstLogin, authUser } = useAppSelector((state) => state.auth)
  const { theme } = useTheme();
  const textColor = theme === 'dark' ? 'text-white' : 'text-primary';
  const reduxUser = useAppSelector((state) => state.auth.user);
  const effectiveUser = authUser || reduxUser;
  const isAdmin = reduxUser?.roles && (reduxUser.roles.includes('admin') || reduxUser.roles.includes('super-admin'));
  const [userIsSubUser, setUserIsSubUser] = useState(false);
  const { can: canPerm } = usePermissions();
  const canChangeCompany = isAdmin || (userIsSubUser && canPerm('company.change'));
  const [accountSwitchLoading, setAccountSwitchLoading] = useState(false)
  const [accountSwitchLabel, setAccountSwitchLabel] = useState('Applying account context...')
  const [accountModeReady, setAccountModeReady] = useState(false)
  const [currentContextType, setCurrentContextType] = useState<'personal' | 'company'>('personal')
  const [accountType, setAccountType] = useState<string>('personal')
  const isPersonalAccount = accountType.toLowerCase() === 'personal'
  const [accountCompanies, setAccountCompanies] = useState<Array<{ id: number; company_name: string }>>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null)
  const [companySetupOpen, setCompanySetupOpen] = useState(false)
  const [companySetup, setCompanySetup] = useState({
    company_name: '',
    business_email: '',
    company_address: '',
    company_currency: 'LKR',
  })


  const getSidebarThemeStorageKey = (
    contextType: 'personal' | 'company',
    companyId?: number | null,
    userData?: any
  ) => {
    const userId = Number(userData?.id ?? effectiveUser?.id)
    const userScope = Number.isFinite(userId) && userId > 0 ? `user:${userId}` : 'user:unknown'
    if (contextType === 'company' && companyId) return `sidebarTheme:${userScope}:company:${companyId}`
    return `sidebarTheme:${userScope}:personal`
  }

  const getPdfThemeStorageKey = (
    contextType: 'personal' | 'company',
    companyId?: number | null
  ) => {
    if (contextType === 'company' && companyId) return `pdfThemeColor:company:${companyId}`
    return 'pdfThemeColor:personal'
  }

  const getScopedSidebarTheme = (
    contextType: 'personal' | 'company',
    companyId?: number | null,
    userData?: any
  ) => {
    const scopedKey = getSidebarThemeStorageKey(contextType, companyId, userData)
    const fromLocalStorage = localStorage.getItem(scopedKey)
    if (fromLocalStorage) return fromLocalStorage
    // Sub-users should not inherit parent sidebar color by default.
    if (isSubUser(userData)) return 'white'
    if (userData?.theme_color) {
      return resolveThemeName(userData.theme_color)
    }
    return 'white'
  }

  const getScopedPdfThemeColor = (
    contextType: 'personal' | 'company',
    companyId: number | null,
    userData?: any
  ) => {
    // API value takes priority — it inherits from the host for sub-users,
    // so sub-users always get the parent's invoice color.
    // Only fall back to localStorage if the API doesn't return a value.
    if (userData?.invoice_theme_color) {
      return userData.invoice_theme_color
    }
    const scopedKey = getPdfThemeStorageKey(contextType, companyId)
    return (
      localStorage.getItem(scopedKey) ||
      localStorage.getItem('pdfThemeColor') ||
      '#0F766E'
    )
  }

  const parseCompanyId = (v: any): number | null => {
    const id = Number(v)
    return Number.isFinite(id) && id > 0 ? id : null
  }

  const waitForContext = async (target: { type: 'personal' | 'company'; companyId?: number | null }) => {
    for (let i = 0; i < 4; i++) {
      const me = await getCurrentUser()
      const userData = (me as any)?.data ?? me
      const ctxType = getResolvedContextType(userData)
      const activeCompanyId = getResolvedActiveCompanyId(userData)
      const companyMatches = target.type === 'personal' ? true : activeCompanyId === (target.companyId ?? null)
      if (ctxType === target.type && companyMatches) return userData
      await new Promise((resolve) => setTimeout(resolve, 140))
    }
    return null
  }

  const refreshContextState = async (providedUserData?: any) => {
    let finalUserData = providedUserData
    if (!finalUserData) {
      const me = await getCurrentUser()
      finalUserData = (me as any)?.data ?? me
    }

    const userDataObj = finalUserData
    if (!userDataObj) return null

    dispatch(setAuthUser(userDataObj))
    dispatch(setFullUser(userDataObj))

    const contextType = getResolvedContextType(userDataObj)
    setCurrentContextType(contextType)
    setAccountType(userDataObj?.account_type ?? 'personal')
    setUserIsSubUser(isSubUser(userDataObj))

    const normalizedCompanies = normalizeAvailableCompanies(
      Array.isArray(userDataObj?.available_companies) ? userDataObj.available_companies : []
    ).map((c) => ({ id: c.id, company_name: c.company_name }))
    setAccountCompanies(normalizedCompanies)

    const activeCompanyId = getResolvedActiveCompanyId(userDataObj)
    if (activeCompanyId) setSelectedCompanyId(activeCompanyId)
    else setSelectedCompanyId(normalizedCompanies[0]?.id ?? null)

    const scopedSidebar = getScopedSidebarTheme(contextType, activeCompanyId, userDataObj)
    setSidebarTheme(scopedSidebar)
    setSidebarThemeDraft(scopedSidebar)
    const scopedPdfColor = getScopedPdfThemeColor(contextType, activeCompanyId, userDataObj)
    dispatch(setPdfThemeColor(scopedPdfColor))
    setPdfThemeColorDraft(scopedPdfColor)
    setCustomColor(scopedPdfColor)
    // Sync API value to localStorage so the initial useEffect doesn't load stale data
    const pdfStorageKey = getPdfThemeStorageKey(contextType, activeCompanyId)
    localStorage.setItem(pdfStorageKey, scopedPdfColor)
    if (contextType === 'personal') {
      localStorage.setItem('pdfThemeColor', scopedPdfColor)
    }

    setAccountModeReady(true)
    return userDataObj
  }

  useEffect(() => {
    setMounted(true)
    // Initialize PDF template from localStorage (needed for selectedPdfTemplate)
    dispatch(initializePdfSettings())

    const initialSidebar =
      localStorage.getItem(getSidebarThemeStorageKey('personal', null, effectiveUser)) ||
      'white'
    setSidebarTheme(initialSidebar)
    setSidebarThemeDraft(initialSidebar)
    // Use API invoice_theme_color if available (sub-users inherit from parent),
    // otherwise fall back to localStorage then default.
    const apiPdfColor = effectiveUser?.invoice_theme_color
    const personalPdfColor = apiPdfColor
      || localStorage.getItem('pdfThemeColor:personal')
      || localStorage.getItem('pdfThemeColor')
      || '#0F766E'
    dispatch(setPdfThemeColor(personalPdfColor))
    setPdfThemeColorDraft(personalPdfColor)
    setCustomColor(personalPdfColor)
  }, [dispatch])

  useEffect(() => {
    setPdfThemeColorDraft(pdfThemeColor)
    setCustomColor(pdfThemeColor)
  }, [pdfThemeColor])

  useEffect(() => {
    if (!mounted || !effectiveUser) return
    refreshContextState().catch(() => setAccountModeReady(true))
  }, [mounted, effectiveUser?.id])


  const saveSidebarTheme = async (theme: string) => {
    const activeCompanyId =
      currentContextType === 'company'
        ? (getResolvedActiveCompanyId(effectiveUser) ?? selectedCompanyId)
        : null
    const scopedKey = getSidebarThemeStorageKey(currentContextType, activeCompanyId, effectiveUser)
    localStorage.setItem(scopedKey, theme)
    window.dispatchEvent(
      new CustomEvent('sidebarThemeChanged', {
        detail: { theme, key: scopedKey },
      })
    )
    const themeColor = await changeUserTheme({ theme_color: themeNameToHex(theme) })
    if (themeColor?.success) toast.success(themeColor.message)
  }

  const handleSidebarThemeDraftChange = (theme: string) => {
    setSidebarThemeDraft(theme)
  }

  const handleSidebarThemeSave = async () => {
    if (sidebarThemeDraft === sidebarTheme) return
    try {
      setSidebarThemeSaving(true)
      await saveSidebarTheme(sidebarThemeDraft)
      setSidebarTheme(sidebarThemeDraft)
      // Helps pages/components that only read localStorage on mount.
      router.refresh()
      toast.success('Sidebar color saved')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to save sidebar color')
    } finally {
      setSidebarThemeSaving(false)
    }
  }

  const savePdfColor = async (color: string) => {
    const activeCompanyId =
      currentContextType === 'company'
        ? (getResolvedActiveCompanyId(effectiveUser) ?? selectedCompanyId)
        : null
    const scopedKey = getPdfThemeStorageKey(currentContextType, activeCompanyId)
    localStorage.setItem(scopedKey, color)
    // Only update global key for personal context — company PDF colors must stay scoped
    if (currentContextType === 'personal') {
      localStorage.setItem('pdfThemeColor', color)
    }
    dispatch(setPdfThemeColor(color))
    await changeUserTheme({ invoice_theme_color: color })
  }

  const handlePdfDraftColorChange = (color: string) => {
    setPdfThemeColorDraft(color)
    setCustomColor(color)
  }

  const handlePdfThemeSave = async () => {
    if (pdfThemeColorDraft === pdfThemeColor) return
    try {
      setPdfThemeColorSaving(true)
      await savePdfColor(pdfThemeColorDraft)
      router.refresh()
      toast.success('PDF theme color saved')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to save PDF theme color')
    } finally {
      setPdfThemeColorSaving(false)
    }
  }


  const handleUpgradePlan = () => {
    router.push('/settings?tab=upgrade-plan')
  }

  const handleChangePlan = () => {
    router.push('/settings?tab=upgrade-plan')
  }

  const handleManagePayment = () => {
    toast.info('Payment management feature coming soon!')
  }

  const handleViewBillingHistory = () => {
    toast.info('Billing history feature coming soon!')
  }

  const handleSwitchToPersonal = async () => {
    try {
      setAccountSwitchLoading(true)
      setAccountSwitchLabel('Switching to personal account...')
      toast.info('Switching to personal context...')
      await switchAccountContext({ type: 'personal' })
      const confirmedUser = await waitForContext({ type: 'personal' })
      setAccountSwitchLabel('Refreshing account data...')
      await refreshContextState(confirmedUser)
      toast.success('Switched to personal context')
      dispatch(clearAll())
      window.dispatchEvent(new CustomEvent('account-context-changed', { detail: { type: 'personal' } }))
      router.push('/dashboard')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to switch context')
    } finally {
      setAccountSwitchLoading(false)
    }
  }

  const handleSwitchToCompany = async () => {
    if (userIsSubUser) {
      toast.error('Sub-users cannot create company profiles.');
      return;
    }
    if (currentContextType === 'company') {
      toast.error('Company accounts cannot create company profiles.');
      return;
    }
    try {
      setAccountSwitchLoading(true)
      const companyId = selectedCompanyId ?? accountCompanies[0]?.id
      if (!companyId) {
        setCompanySetupOpen(true)
        toast.info('Create company profile to continue')
        return
      }
      setAccountSwitchLabel('Switching to company account...')
      toast.info('Switching to company context...')
      await switchAccountContext({ type: 'company', company_id: companyId })
      const confirmedUser = await waitForContext({ type: 'company', companyId })
      setAccountSwitchLabel('Loading company details...')
      await refreshContextState(confirmedUser)
      toast.success('Switched to company context')
      dispatch(clearAll())
      window.dispatchEvent(new CustomEvent('account-context-changed', { detail: { type: 'company', companyId } }))
      router.push('/company?mode=company')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to switch context')
    } finally {
      setAccountSwitchLoading(false)
    }
  }


  const handleCreateCompanyAndSwitch = async () => {
    if (userIsSubUser) {
      toast.error('Sub-users cannot create company profiles.');
      return;
    }
    if (currentContextType === 'company') {
      toast.error('Company accounts cannot create company profiles.');
      return;
    }
    if (!companySetup.company_name.trim()) return toast.error('Business name is required')
    if (!companySetup.business_email.trim()) return toast.error('Business email is required')

    try {
      setAccountSwitchLoading(true)
      setAccountSwitchLabel('Creating company profile...')
      toast.info('Creating company profile...')
      const created = await createCompanyAccount({
        company_name: companySetup.company_name.trim(),
        business_email: companySetup.business_email.trim(),
        company_currency: 'LKR',
        company_address: companySetup.company_address.trim() || undefined,
      })

      // Refresh the available companies list so the new company appears in the switcher.
      // No auto-switch — user will manually switch to the new company.
      setAccountSwitchLabel('Refreshing account data...')
      const me = await getCurrentUser()
      const freshUser = (me as any)?.data ?? me
      await refreshContextState(freshUser)

      setCompanySetupOpen(false)
      toast.success('Company profile created! You can now switch to it using the account switcher.')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create company account')
    } finally {
      setAccountSwitchLoading(false)
    }
  }

  if (!effectiveUser || !mounted) return (<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin"></div>
      <p className="text-slate-600">Loading...</p>
    </div>
  </div>)

  return (
    <TooltipProvider>
      {accountSwitchLoading && (
        <div className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-sm flex items-center justify-center">
          <div className="rounded-xl bg-background border border-border shadow-xl px-6 py-5 min-w-[280px]">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9">
                <img src="/logo.png" alt="Loading" className="w-9 h-9 rounded-md object-contain animate-pulse" />
                <Loader2 className="absolute -right-2 -bottom-2 w-4 h-4 animate-spin text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Switching...</p>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-6">
        {/* The redundant heading has been removed. */}


        {canChangeCompany && (
          <>
            {/* Subscription Card - UPDATED: Simplified for Free plan */}
            {/* <div className="border rounded-lg p-6 bg-card border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold text-foreground ${textColor}`}>Subscription & Billing</h3>
                <Badge variant="secondary" className="bg-gray-100 dark:text-black border-gray-200 text-primary">
                  Free Plan
                </Badge>
              </div>


              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-muted-foreground">You're on the Free plan</span>
                  </div>
                </div>

                <div className="text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Free forever - no expiration</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>All basic features included</span>
                  </div>
                </div>

                <Button onClick={handleUpgradePlan} className="bg-primary dark:text-black hover:bg-teal-300 text-white">
                  Upgrade Plan
                </Button>
              </div>


              {subscription.status === 'paid' && (
                <div className="space-y-4 mt-4 pt-4 border-t">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-green-600" />
                      <span className="font-medium">Current Plan: {subscription.plan}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>Next billing: {subscription.nextBillingDate ? new Date(subscription.nextBillingDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <span>Renewal: {subscription.renewalType}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleChangePlan} variant="outline" size="sm">
                      Change Plan
                    </Button>
                    <Button onClick={handleManagePayment} variant="outline" size="sm">
                      Manage Payment
                    </Button>
                    <Button onClick={handleViewBillingHistory} variant="ghost" size="sm" className="text-muted-foreground">
                      Billing History
                    </Button>
                  </div>
                </div>
              )}
            </div> */}
          </>
        )}


        {/* new plan */}

        {canChangeCompany && (
          <>
            {/* Subscription Card - UPDATED: Simplified for Free plan */}
            <div className="border rounded-lg p-6 bg-card border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold text-foreground ${textColor}`}>Subscription & Billing</h3>
                <Badge variant="secondary" className="bg-gray-100 capitalize dark:text-black border-gray-200 text-primary">
                  {effectiveUser?.subscription?.plan_name ?? 'Free'} Plan
                </Badge>
              </div>

              {/* Always show Free plan info (no trial period) */}
              {/* free plan 30 day */}
              {effectiveUser?.subscription?.plan_name === 'Free' &&

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-muted-foreground">You're on the Free plan</span>
                    </div>
                  </div>

                  <div className="text-sm">

                    {effectiveUser?.subscription?.plan_type === 'trial' && <div className="flex items-center gap-2 mb-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Free for 30 days</span>
                    </div>
                    }

                    <div className="flex items-center gap-2 mb-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>All basic features included</span>
                    </div>

                    {effectiveUser?.subscription?.plan_type === 'trial' && <div className="flex items-center gap-2 mb-3">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Remaining days : {Math.floor(effectiveUser?.subscription?.available_days as number)}</span>
                    </div>}

                  </div>

                  <Button onClick={handleUpgradePlan} className="bg-primary dark:text-black hover:bg-teal-300 text-white">
                    Upgrade Plan
                  </Button>
                </div>
              }


              {/* Paid plan info (if user upgrades in the future) */}
              {effectiveUser && (
                <div className="space-y-4 mt-4 pt-4 border-t">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-green-600" />
                      {/* <span className="font-medium">Current Plan: {subscription.plan}</span> */}
                      <span className="font-medium">Current Plan: {effectiveUser?.subscription?.plan_name ?? 'Free'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {effectiveUser?.subscription?.plan_name !== 'Free' && <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>
                        Next billing:  {effectiveUser?.subscription?.next_payment_at
                          ? new Date(effectiveUser?.subscription.next_payment_at).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </div>
                    }

                    {effectiveUser?.subscription?.plan_name !== 'Free' &&
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <span>Renewal: {effectiveUser?.subscription?.plan_type ?? 'Na'}</span>
                      </div>
                    }

                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleChangePlan} variant="outline" size="sm">
                      Change Plan
                    </Button>
                    {/* <Button onClick={handleManagePayment} variant="outline" size="sm">
                      Manage Payment
                    </Button>
                    <Button onClick={handleViewBillingHistory} variant="ghost" size="sm" className="text-muted-foreground">
                      Billing History
                    </Button> */}
                  </div>
                </div>
              )}



              {/* Subscription Overview */}
              {effectiveUser && <div className="border rounded-lg p-6 bg-card border-border mt-6">
                <h3 className={`text-lg font-semibold mb-4 ${textColor}`}>Subscription Overview</h3>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="capitalize">{effectiveUser?.subscription?.status ?? 'N/A'}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Plan Type:</span>
                    <span className="capitalize">{effectiveUser?.subscription?.plan_type ?? 'N/A'}</span>
                  </div>


                  <div className="flex justify-between">
                    <span>Plan Name:</span>
                    <span>{effectiveUser?.subscription?.plan_name ?? 'N/A'}</span>
                  </div>

                  {effectiveUser?.subscription?.plan_type == 'trial' && <div className="flex justify-between">
                    <span>Trial Ends:</span>
                    <span>
                      {effectiveUser?.subscription?.trial_ends_at
                        ? new Date(effectiveUser?.subscription.trial_ends_at).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </div>
                  }

                  {effectiveUser?.subscription?.plan_name !== 'Free' && <>

                    <div className="flex justify-between">
                      <span>Next Payment Date:</span>
                      <span>
                        {effectiveUser?.subscription?.next_payment_at
                          ? new Date(effectiveUser?.subscription.next_payment_at).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span>£{effectiveUser?.subscription?.amount ?? '0.00'}</span>
                    </div>
                  </>}


                </div>
              </div>


              }



            </div>
          </>
        )}


        <Accordion type="single" defaultValue="sidebar" collapsible className="w-full space-y-4">
          {/* Sidebar Color Section - Available for all users including sub-users */}
          <AccordionItem value="sidebar" className="border rounded-lg px-4 bg-card border-border">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Settings className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <h3 className={`text-sm font-semibold text-foreground ${textColor}`}>Sidebar Color</h3>
                  <p className="text-xs text-muted-foreground">Customize sidebar appearance</p>
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent className="pb-4 pt-2">
              <SidebarColorPicker
                isCollapsed={false}
                sidebarTheme={sidebarThemeDraft}
                onThemeChange={handleSidebarThemeDraftChange}
                isInSettings={true}
              />
              <div className="mt-4 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSidebarThemeDraft(sidebarTheme)}
                  disabled={sidebarThemeSaving || sidebarThemeDraft === sidebarTheme}
                >
                  Reset
                </Button>
                <Button
                  type="button"
                  onClick={handleSidebarThemeSave}
                  disabled={sidebarThemeSaving || sidebarThemeDraft === sidebarTheme}
                >
                  {sidebarThemeSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          {canChangeCompany && (
            <>
              {/* Invoice PDF Theme Color Section */}
              <AccordionItem value="pdf" className="border rounded-lg px-4 bg-card border-border">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className={`text-sm font-semibold text-foreground ${textColor}`}>Invoice PDF Theme Color</h3>
                      <p className="text-xs text-muted-foreground">Choose accent color for invoice PDFs</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 pt-2">
                  <div className="space-y-4">
                    {/* Color Grid - Small Squares with Tooltips in One Line */}
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground mb-3 block">
                        Select Color
                      </Label>
                      <div className="flex flex-wrap gap-3">
                        {PDF_COLOR_PRESETS.map((preset) => (
                          <Tooltip key={preset.value} delayDuration={0}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handlePdfDraftColorChange(preset.value)}
                                className={`
                              relative h-11 w-11 rounded-md border-2 transition-all
                              hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                              ${pdfThemeColorDraft === preset.value
                                    ? 'border-primary ring-2 ring-primary ring-offset-2 scale-105'
                                    : 'border-border hover:border-primary/50'
                                  }
                            `}
                                style={{ backgroundColor: preset.value }}
                                aria-label={preset.name}
                              >
                                {pdfThemeColorDraft === preset.value && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <Check className="w-5 h-5 text-white drop-shadow-lg" strokeWidth={3} />
                                  </div>
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-popover border-border">
                              <p className="text-xs font-medium">{preset.name}</p>
                              <p className="text-xs text-muted-foreground">{preset.value}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>

                    {/* Custom Color Picker - Compact */}
                    <div className="space-y-2 pt-2 border-t">
                      <Label className="text-xs font-medium text-muted-foreground">
                        Custom Color (Optional)
                      </Label>
                      <div className="flex items-center gap-3">
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <div className="relative">
                              <input
                                type="color"
                                value={customColor}
                                onChange={(e) => handlePdfDraftColorChange(e.target.value)}
                                className="h-11 w-11 rounded-md cursor-pointer border-2 border-border hover:border-primary/50 transition-colors"
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="bg-popover border-border">
                            <p className="text-xs">Click to choose custom color</p>
                          </TooltipContent>
                        </Tooltip>
                        <input
                          type="text"
                          value={customColor}
                          onChange={(e) => {
                            const color = e.target.value
                            if (/^#[0-9A-F]{6}$/i.test(color)) {
                              handlePdfDraftColorChange(color)
                            }
                            setCustomColor(color)
                          }}
                          placeholder="#000000"
                          className="flex-1 h-11 px-3 rounded-md border-2 border-border bg-background text-foreground font-mono text-sm uppercase focus:border-primary focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="space-y-2 pt-2">
                      <Label className="text-xs font-medium text-muted-foreground">
                        Preview
                      </Label>
                      <div className="border-2 border-border rounded-lg p-3 bg-background">
                        <div
                          className="rounded-md overflow-hidden shadow-md border border-border"
                        >
                          <div
                            className="px-4 py-3 text-white transition-colors"
                            style={{ backgroundColor: pdfThemeColorDraft }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold">INVOICE</p>
                                <p className="text-[11px] text-white/90">#INV-1024</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-medium">Your Business Name</p>
                                <p className="text-[11px] text-white/90">you@business.com</p>
                              </div>
                            </div>
                          </div>
                          <div className="px-4 py-3 text-xs text-muted-foreground bg-card">
                            <div className="flex items-center justify-between">
                              <span>Invoice To: Demo Client Ltd.</span>
                              <span>Total: £1,200.00</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          This preview shows how the PDF header color appears to users
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setPdfThemeColorDraft(pdfThemeColor)
                          setCustomColor(pdfThemeColor)
                        }}
                        disabled={pdfThemeColorSaving || pdfThemeColorDraft === pdfThemeColor}
                      >
                        Reset
                      </Button>
                      <Button
                        type="button"
                        onClick={handlePdfThemeSave}
                        disabled={pdfThemeColorSaving || pdfThemeColorDraft === pdfThemeColor}
                      >
                        {pdfThemeColorSaving ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

            </>
          )}
        </Accordion>


      </div>
      <Dialog open={companySetupOpen} onOpenChange={setCompanySetupOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Create Company Profile</DialogTitle>
            <DialogDescription>
              Business name and business email are required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Business Name *</Label>
                <Input
                  value={companySetup.company_name}
                  onChange={(e) => setCompanySetup((prev) => ({ ...prev, company_name: e.target.value }))}
                  placeholder="Enter business name"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Business Email *</Label>
                <Input
                  type="email"
                  value={companySetup.business_email}
                  onChange={(e) => setCompanySetup((prev) => ({ ...prev, business_email: e.target.value }))}
                  placeholder="company@email.com"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Business Address</Label>
              <Textarea
                value={companySetup.company_address}
                onChange={(e) => setCompanySetup((prev) => ({ ...prev, company_address: e.target.value }))}
                placeholder="Business address"
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Currency *</Label>
              <Select
                value={companySetup.company_currency || 'LKR'}
                onValueChange={(value) => setCompanySetup((prev) => ({ ...prev, company_currency: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.symbol} {currency.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCompanySetupOpen(false)} disabled={accountSwitchLoading}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateCompanyAndSwitch} disabled={accountSwitchLoading}>
              {accountSwitchLoading ? 'Creating...' : 'Create & Open Company Details'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}