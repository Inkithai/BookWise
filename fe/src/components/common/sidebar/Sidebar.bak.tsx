// components/common/sidebar/Sidebar.tsx - RESPONSIVE VERSION (Mobile Navbar + Desktop Sidebar)
'use client';

import React, { ReactElement, useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Building2,
  LayoutDashboard,
  Users,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  BookOpen,
  DollarSign,
  TrendingUp,
  XCircle,
  FileSearch,
  Bookmark,
  CreditCard,
  User,
  Table2,
  LucideIcon,
  Power,
  TableProperties,
  BarChart,
  Activity,
  X,
  Key,
  Settings,
  LifeBuoy,
  Award,
  ShieldCheck,
  Receipt,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { SIDEBAR_COLORS } from './SidebarColorPicker';
import { useAppSelector, useAppDispatch } from '@/slices/hooks';
import { clearAuthUser } from '@/slices/authSlice';
import { logout, getCurrentUser } from '@/services/service';
import { toast } from 'sonner';
import { getCRMTables } from '@/services/crm.service';
import { AdminUser } from '@/services/interface/AdminUser';
import {
  getMissingCompanyFields,
  shouldShowBanner,
  clearCompanyCompletionMark,
} from '@/utils/company-validation';
import { SidebarAlertBanner } from '@/components/common/SidebarAlertBanner';
import LogoutConfirmPopup from '@/components/auth/LogoutConfirmPopup';
import { formatImageUrl } from '@/utils/image-url';
import { getResolvedActiveCompanyId, getResolvedContextType } from '@/utils/account-context';
import { AccountManagementBox } from '@/components/common/sidebar/AccountManagementBox';
import { getViewScope, ViewScope } from '@/utils/view-scope';

type ThemeVariant = {
  bg: string;
  activeBg: string;
  text: string;
  border: string;
  hover: string;
};

interface IconProps {
  className?: string;
  size?: number;
}

interface NavItem {
  name: string;
  href: string;
  icon: ReactElement<IconProps>;
  subItems?: SubItem[];
}

interface SubItem {
  name: string;
  href: string;
  icon?: keyof typeof LucideIcons;
}

interface CRMTable {
  id: string;
  name: string;
  icon: keyof typeof LucideIcons;
  fields: {
    id: string;
    name: string;
    type: string;
  }[];
  recordCount: number;
  lastUpdated: string;
}

interface CRMTableResponse {
  id: number;
  name: string;
  attributes: {
    id: number;
    label: string | null;
    type: string;
  }[];
  updated_at?: string;
}

const SUBITEM_ICONS: Record<string, ReactElement<IconProps>> = {
  Bookings: <BookOpen className="" size={16} />,
  'Property P/L': <DollarSign className="" size={16} />,
  Income: <TrendingUp className="" size={16} />,
  'Booking Cancellation': <XCircle className="" size={16} />,
  Expenses: <CreditCard className="" size={16} />,
  'General Expenses': <CreditCard className="" size={16} />,
  'Booking Reports': <FileSearch className="" size={16} />,
  'Property Ledger': <Bookmark className="" size={16} />,
  Invoice: <FileText className="" size={16} />,
  'Invoice Client': <User className="" size={16} />,
  'Invoice Recipient': <Users className="" size={16} />,
  'All Tables': <TableProperties className="" size={16} />,
};

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="" size={18} />,
  },
  {
    name: 'Invoices',
    href: '/invoices',
    icon: <Receipt className="" size={18} />,
  },
  {
    name: 'Clients',
    href: '/invoice/clients',
    icon: <Users className="" size={18} />,
  },
  {
    name: 'Referrals',
    href: '/referral-dashboard',
    icon: <Award className="" size={18} />,
  },
];

const getNavItems = (
  loadingTables: boolean,
  crmTables: CRMTable[]
): NavItem[] => {
  return navItems.map((item) => {
    if (item.name === 'CRM') {
      return {
        ...item,
        subItems: loadingTables
          ? [{ name: 'Loading tables...', href: '#', icon: 'Loader2' }]
          : [
            { name: 'All Tables', href: '/crm' },
            ...crmTables.map((table) => ({
              name: table.name,
              href: `/crm/${table.id}`,
              icon: table.icon,
            })),
          ],
      };
    }
    return item;
  });
};

// Global state to prevent multiple API calls
let lastUserData: AdminUser | null = null;
let lastCheckTime = 0;
const CHECK_INTERVAL = 10000;

// SKELETON LOADER COMPONENT
const SidebarSkeleton = ({ isCollapsed, currentTheme }: any) => {
  return (
    <>
      {/* Header Skeleton */}
      <div
        className={cn(
          'h-16 px-3 flex items-center justify-between border-b',
          currentTheme.border,
          isCollapsed && 'justify-center'
        )}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-2 w-full">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-md animate-pulse" />
            <div className="flex-1 h-5 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-md animate-pulse" />
        )}
      </div>

      {/* Nav Items Skeleton */}
      <div className="flex flex-col gap-2 p-2 flex-grow">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={cn(
              'h-10 bg-gray-300 dark:bg-gray-600 rounded animate-pulse',
              isCollapsed ? 'w-10 mx-auto' : ''
            )}
          />
        ))}
      </div>

      {/* Footer Skeleton */}
      <div className={cn('border-t p-2', currentTheme.border)}>
        <div className={cn('flex items-center gap-2', isCollapsed && 'justify-center')}>
          <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse" />
          {!isCollapsed && (
            <div className="flex-1 h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
          )}
        </div>
      </div>
    </>
  );
};

export default function Sidebar() {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [viewScope, setViewScope] = useState<ViewScope>('current');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [sidebarTheme, setSidebarTheme] = useState('white');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [crmTables, setCrmTables] = useState<CRMTable[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);
  const [isAccountBoxOpen, setIsAccountBoxOpen] = useState(false);
  const router = useRouter();

  const isSuperAdminOrAdmin = (user: AdminUser | null) => {
    if (!user || !user.roles) return false;
    const accountType = String((user as any)?.account_type || '').toLowerCase();
    if (accountType === 'super-admin' || accountType === 'super admin' || accountType === 'admin') {
      return true;
    }
    return user.roles.some((role) => {
      if (typeof role === 'string') {
        const r = role.toLowerCase();
        return r === 'super admin' || r === 'super-admin' || r === 'superadmin' || r === 'admin';
      }
      if (typeof role === 'object' && 'name' in role) {
        const r = role.name.toLowerCase();
        return r === 'super admin' || r === 'super-admin' || r === 'superadmin' || r === 'admin';
      }
      return false;
    });
  };

  const isSuperAdmin = (user: AdminUser | null) => {
    if (!user || !user.roles) return false;
    const accountType = String((user as any)?.account_type || '').toLowerCase();
    if (accountType === 'super-admin' || accountType === 'super admin') {
      return true;
    }
    return user.roles.some((role) => {
      if (typeof role === 'string') {
        const r = role.toLowerCase();
        return r === 'super admin' || r === 'super-admin' || r === 'superadmin';
      }
      if (typeof role === 'object' && 'name' in role) {
        const r = role.name.toLowerCase();
        return r === 'super admin' || r === 'super-admin' || r === 'superadmin';
      }
      return false;
    });
  };

  const getFilteredNavItems = (): NavItem[] => {
    const dashboard = navItems.find(i => i.name === 'Dashboard');
    const invoices = navItems.find(i => i.name === 'Invoices');
    const clients = navItems.find(i => i.name === 'Clients');
    const referrals = navItems.find(i => i.name === 'Referrals');

    const result: NavItem[] = [];
    if (dashboard) result.push(dashboard);
    if (invoices) result.push(invoices);
    if (clients) result.push(clients);
    if (referrals) result.push(referrals);

    // Users
    if (isSuperAdminOrAdmin(user)) {
      result.push({
        name: 'Users',
        href: '/users',
        icon: <ShieldCheck className="" size={18} />
      });
    }

    // Settings
    result.push({
      name: 'Settings',
      href: '/settings',
      icon: <Settings className="" size={18} />
    });

    // Analytics (At the end as requested)
    if (isSuperAdmin(user)) {
      result.push({
        name: 'Analytics',
        href: '/analytics',
        icon: <BarChart className="" size={18} />
      });
    }

    return result;
  };

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const reduxUser = useAppSelector((state) => state.auth.user);
  const reduxAuthUser = useAppSelector((state) => state.auth.authUser);
  const dispatch = useAppDispatch();

  const identityUser = useMemo((): AdminUser | null => {
    const primary = reduxUser as unknown as AdminUser | null;
    if (primary && typeof primary === 'object' && 'id' in primary && (primary as AdminUser).id) {
      return primary;
    }
    const fallback = reduxAuthUser as unknown as AdminUser | null;
    if (fallback && typeof fallback === 'object' && 'id' in fallback && (fallback as AdminUser).id) {
      return fallback;
    }
    return null;
  }, [reduxUser, reduxAuthUser]);

  const [companyInfo, setCompanyInfo] = useState<{
    name: string | null;
    logo: string | null;
  }>({ name: null, logo: null });

  const [user, setUser] = useState<AdminUser | null>(
    reduxUser ? (reduxUser as unknown as AdminUser) : null
  );

  const [showBanner, setShowBanner] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(!!reduxUser && !!reduxUser.id);

  const resolveContextType = (u: any): 'personal' | 'company' => {
    return getResolvedContextType(u);
  };

  const getSidebarThemeStorageKey = (
    contextType: 'personal' | 'company',
    companyId?: number | null
  ) => {
    if (contextType === 'company' && companyId) return `sidebarTheme:company:${companyId}`;
    return 'sidebarTheme:personal';
  };

  const getScopedSidebarTheme = (userData: any): string => {
    if (typeof window === 'undefined') return 'white';
    const contextType = resolveContextType(userData);
    const activeCompanyId = getResolvedActiveCompanyId(userData);
    const scopedKey = getSidebarThemeStorageKey(contextType, activeCompanyId);
    return (
      localStorage.getItem(scopedKey) ||
      localStorage.getItem('sidebarTheme') ||
      'white'
    );
  };

  // ── Header identity should route by active context ───────────────────────────
  const handleDetailsNavigation = () => {
    if (viewScope === 'all') {
      return;
    }

    const sourceUser = user ?? identityUser;
    const contextType = resolveContextType(sourceUser);
    if (contextType === 'personal') {
      router.push('/company?mode=personal');
      return;
    }
    router.push('/company?mode=company');
  };

  // ── Footer profile avatar always routes to /profile ──
  const handleProfileNavigation = () => {
    router.push('/profile');
  };

  const loadUserData = useCallback(async (force = false) => {
    const now = Date.now();

    if (!force && lastUserData && now - lastCheckTime < CHECK_INTERVAL) {
      updateUI(lastUserData);
      return;
    }

    try {
      let userData: AdminUser | null = null;
      try {
        const response = await getCurrentUser();
        userData = response.data || response;
      } catch (apiError) {
        setIsDataLoaded(true);
        return;
      }

      if (!userData) {
        setShowBanner(false);
        setIsDataLoaded(true);
        return;
      }

      lastUserData = userData;
      lastCheckTime = now;
      updateUI(userData);
    } catch (error) {
      setShowBanner(false);
      setIsDataLoaded(true);
    }
  }, []);

  const resolveHeaderCompanyInfo = (userData: AdminUser) => {
    const contextType = getResolvedContextType(userData as any);
    const activeCompanyIdRaw = Number(
      (userData as any)?.current_context?.company_id ??
      (userData as any)?.active_company_id
    );
    const activeCompanyId =
      Number.isFinite(activeCompanyIdRaw) && activeCompanyIdRaw > 0
        ? activeCompanyIdRaw
        : null;
    const mappedCompanies = Array.isArray((userData as any)?.available_companies)
      ? (userData as any).available_companies
      : [];
    const activeCompany = activeCompanyId
      ? mappedCompanies.find((c: any) => {
        const companyId = Number(c?.id ?? c?.company_id);
        return Number.isFinite(companyId) && companyId === activeCompanyId;
      })
      : null;

    if (contextType === "personal") {
      return {
        name: null,
        logo: null,
      };
    }

    return {
      name:
        (userData as any)?.current_context?.company_name ||
        activeCompany?.company_name ||
        activeCompany?.name ||
        userData.company?.company_name ||
        '',
      logo:
        formatImageUrl(activeCompany?.company_logo) ||
        formatImageUrl(userData.company?.company_logo) ||
        null,
    };
  };

  const updateUI = (userData: AdminUser) => {
    setCompanyInfo(resolveHeaderCompanyInfo(userData));

    setUser(userData);
    setSidebarTheme(getScopedSidebarTheme(userData));

    const accountType = resolveContextType(userData);

    if (accountType === 'personal') {
      // Personal accounts: no banner, the /company page shows the personal form
      setShowBanner(false);
      setMissingFields([]);
    } else if (accountType === 'company') {
      const shouldShow = shouldShowBanner(userData);
      setShowBanner(shouldShow);
      if (shouldShow) {
        setMissingFields(getMissingCompanyFields(userData));
      }
    } else {
      setShowBanner(false);
    }

    setIsDataLoaded(true);
  };

  useEffect(() => {
    const initialize = () => {
      setMounted(true);

      const savedTheme = identityUser
        ? getScopedSidebarTheme(identityUser)
        : (localStorage.getItem('sidebarTheme:personal') || localStorage.getItem('sidebarTheme') || 'white');
      const savedCollapse = localStorage.getItem('sidebarCollapsed') === 'true';
      setSidebarTheme(savedTheme);
      setIsCollapsed(savedCollapse);

      // Fetch on mount only when redux user is not available yet.
      if (!reduxUser?.id) {
        loadUserData();
      } else {
        setIsDataLoaded(true);
      }
    };

    initialize();
  }, [loadUserData, reduxUser?.id, identityUser]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const apply = () => setViewScope(getViewScope());
    apply();
    window.addEventListener('viewScopeChanged', apply as any);
    return () => window.removeEventListener('viewScopeChanged', apply as any);
  }, []);

  useEffect(() => {
    if (!identityUser || !identityUser.id) return;

    setUser(identityUser);
    setCompanyInfo(resolveHeaderCompanyInfo(identityUser));
    setSidebarTheme(getScopedSidebarTheme(identityUser));
    setIsDataLoaded(true);

    const accountType = resolveContextType(identityUser);
    if (accountType === 'personal') {
      setShowBanner(false);
      setMissingFields([]);
    } else if (accountType === 'company') {
      const shouldShow = shouldShowBanner(identityUser);
      setShowBanner(shouldShow);
      if (shouldShow) {
        setMissingFields(getMissingCompanyFields(identityUser));
      }
    }
  }, [identityUser]);

  useEffect(() => {
    const initialExpanded: Record<string, boolean> = {};
    navItems.forEach((item) => {
      if (item.subItems) {
        initialExpanded[item.href] = item.subItems.some((subItem) =>
          pathname.startsWith(subItem.href)
        );
      }
    });
    setExpandedItems(initialExpanded);
  }, [pathname]);

  useEffect(() => {
    const loadTables = async () => {
      try {
        setLoadingTables(true);
        const response = await getCRMTables();
        setCrmTables(
          response.data.map((table: CRMTableResponse) => ({
            id: table.id.toString(),
            name: table.name,
            icon: 'Table2' as keyof typeof LucideIcons,
            fields: table.attributes.map(
              (attr: { id: number; label: string | null; type: string }) => ({
                id: attr.id.toString(),
                name: attr.label || `field_${attr.id}`,
                type: attr.type,
              })
            ),
            recordCount: 0,
            lastUpdated: table.updated_at ?? new Date().toISOString(),
          }))
        );
      } catch (error) {
        console.error('Failed to fetch CRM tables:', error);
      } finally {
        setLoadingTables(false);
      }
    };
    loadTables();
  }, []);

  useEffect(() => {
    const handleCompanyUpdate = () => { lastUserData = null; loadUserData(true); };
    window.addEventListener('companyUpdated', handleCompanyUpdate);
    return () => window.removeEventListener('companyUpdated', handleCompanyUpdate);
  }, [loadUserData]);

  useEffect(() => {
    const handleProfileUpdate = () => { lastUserData = null; loadUserData(true); };
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [loadUserData]);

  useEffect(() => {
    const handleSidebarThemeChange = (event: Event) => {
      const sourceUser = identityUser ?? user;
      if (sourceUser) {
        setSidebarTheme(getScopedSidebarTheme(sourceUser));
        return;
      }
      const customEvent = event as CustomEvent<{ theme?: string } | string>;
      const detail = customEvent.detail;
      const newTheme = typeof detail === 'string' ? detail : detail?.theme;
      if (newTheme) setSidebarTheme(newTheme);
    };
    window.addEventListener('sidebarThemeChanged', handleSidebarThemeChange);
    return () => window.removeEventListener('sidebarThemeChanged', handleSidebarThemeChange);
  }, [identityUser, user]);

  useEffect(() => { setIsMobileMenuOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  const handleIconClick = () => setIsLogoutModalOpen(true);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch(clearAuthUser());
      clearCompanyCompletionMark();
      router.push('/auth/login');
    }
  };

  const toggleItemExpand = (href: string) => {
    setExpandedItems((prev) => ({ ...prev, [href]: !prev[href] }));
  };

  const handleToggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
  };

  const getCurrentTheme = (): ThemeVariant => {
    const theme = SIDEBAR_COLORS[sidebarTheme as keyof typeof SIDEBAR_COLORS] || SIDEBAR_COLORS.white;
    return resolvedTheme === 'dark' && theme.dark ? theme.dark : theme;
  };

  const getTextColor = (isActive: boolean) => {
    if (resolvedTheme === 'dark') return isActive ? 'text-white' : 'text-gray-300';
    if (sidebarTheme.includes('pastel')) return isActive ? currentTheme.text : `${currentTheme.text}/80`;
    return isActive ? 'text-black' : 'text-gray-800';
  };

  const getIconColor = (isActive: boolean) => {
    if (resolvedTheme === 'dark') return 'text-white';
    if (sidebarTheme.includes('pastel')) return getTextColor(isActive);
    return 'text-black';
  };

  // ─── Header Identity ──────────────────────────────────────────────────────────
  // Always navigates to /company — the form inside detects account_type and renders
  // the personal or company variant automatically.

  const HeaderIdentity = () => {
    const isPersonal = resolveContextType(user) === 'personal';
    const isAll = viewScope === 'all';

    return (
      <button
        onClick={handleDetailsNavigation}
        disabled={isAll}
        className={cn(
          "flex items-center gap-2 overflow-hidden transition-opacity w-full",
          isAll ? "cursor-not-allowed opacity-80" : "cursor-pointer hover:opacity-80"
        )}
        title={isAll ? 'All accounts mode: details navigation is disabled' : isPersonal ? 'View personal details' : 'View company details'}
      >
        {isAll ? (
          <>
            <div className={cn(
              'flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-md overflow-hidden',
              currentTheme.activeBg
            )}>
              <TableProperties size={18} className={getIconColor(true)} />
            </div>
            <h1 className={cn('font-semibold text-lg truncate', getTextColor(true))}>
              All Accounts
            </h1>
          </>
        ) : isPersonal ? (
          // Personal: show avatar + full name
          <>
            {profileImage && !profileImageError ? (
              <img
                src={profileImage}
                alt={displayName}
                className="flex-shrink-0 h-8 w-8 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600"
                onError={() => setProfileImageError(true)}
                onLoad={() => setProfileImageError(false)}
              />
            ) : (
              <div className={cn(
                'flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium',
                resolvedTheme === 'dark' ? 'bg-teal-800 text-white' : 'bg-teal-200 text-teal-800'
              )}>
                {initials}
              </div>
            )}
            <h1 className={cn('font-semibold text-lg truncate', getTextColor(true))}>
              {displayName}
            </h1>
          </>
        ) : (
          // Company: show logo + company name
          <>
            <div className={cn(
              'flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-md overflow-hidden',
              currentTheme.activeBg
            )}>
              {companyInfo.logo && !logoError ? (
                <img
                  src={companyInfo.logo}
                  alt={`${companyInfo.name} logo`}
                  className="w-full h-full object-cover"
                  onError={() => setLogoError(true)}
                  onLoad={() => setLogoError(false)}
                />
              ) : (
                <Building2 size={18} className={getIconColor(true)} />
              )}
            </div>
            <h1 className={cn('font-semibold text-lg truncate', getTextColor(true))}>
              {companyInfo.name === null ? 'Loading...' : companyInfo.name || 'Company'}
            </h1>
          </>
        )}
      </button>
    );
  };

  // ─── Collapsed Header Identity ────────────────────────────────────────────────

  const CollapsedHeaderIdentity = () => {
    const isPersonal = resolveContextType(user) === 'personal';
    const isAll = viewScope === 'all';

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleDetailsNavigation}
            disabled={isAll}
            className={cn(
              isAll ? 'cursor-not-allowed opacity-80 transition-opacity' : 'cursor-pointer hover:opacity-80 transition-opacity',
              !isPersonal && cn('flex items-center justify-center w-8 h-8 rounded-md overflow-hidden', currentTheme.activeBg)
            )}
            title={isAll ? 'All accounts mode: details navigation is disabled' : isPersonal ? 'View personal details' : 'View company details'}
          >
            {isAll ? (
              <div className={cn('flex items-center justify-center w-8 h-8 rounded-md overflow-hidden', currentTheme.activeBg)}>
                <TableProperties size={18} className={getIconColor(true)} />
              </div>
            ) : isPersonal ? (
              profileImage && !profileImageError ? (
                <img
                  src={profileImage}
                  alt={displayName}
                  className="h-8 w-8 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600 mx-auto"
                  onError={() => setProfileImageError(true)}
                  onLoad={() => setProfileImageError(false)}
                />
              ) : (
                <div className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium mx-auto',
                  resolvedTheme === 'dark' ? 'bg-teal-800 text-white' : 'bg-teal-200 text-teal-800'
                )}>
                  {initials}
                </div>
              )
            ) : (
              companyInfo.logo && !logoError ? (
                <img
                  src={companyInfo.logo}
                  alt={`${companyInfo.name} logo`}
                  className="w-full h-full object-cover"
                  onError={() => setLogoError(true)}
                  onLoad={() => setLogoError(false)}
                />
              ) : (
                <Building2 size={18} className={getIconColor(true)} />
              )
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {isAll
            ? 'All Accounts — Showing all details'
            : isPersonal
              ? `${displayName} — View personal details`
              : `${companyInfo.name || 'Company'} — View company details`}
        </TooltipContent>
      </Tooltip>
    );
  };

  // ─── Mobile Header Identity ───────────────────────────────────────────────────

  const MobileHeaderIdentity = () => {
    const isPersonal = resolveContextType(user) === 'personal';
    const isAll = viewScope === 'all';

    return (
      <button
        onClick={() => {
          if (isAll) {
            setIsMobileMenuOpen(false);
            return;
          }
          setIsMobileMenuOpen(false);
          handleDetailsNavigation();
        }}
        className={cn(
          "flex items-center gap-3 transition-opacity",
          isAll ? "cursor-not-allowed opacity-80" : "cursor-pointer hover:opacity-80"
        )}
        title={isAll ? 'All accounts mode: details navigation is disabled' : isPersonal ? 'View personal details' : 'View company details'}
      >
        {isAll ? (
          <>
            <div className={cn(
              'flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-md overflow-hidden',
              currentTheme.activeBg
            )}>
              <TableProperties size={18} className={getIconColor(true)} />
            </div>
            <span className={cn('font-semibold text-base truncate max-w-[150px]', getTextColor(true))}>
              All Accounts
            </span>
          </>
        ) : isPersonal ? (
          <>
            {profileImage && !profileImageError ? (
              <img
                src={profileImage}
                alt={displayName}
                className="flex-shrink-0 h-8 w-8 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600"
                onError={() => setProfileImageError(true)}
                onLoad={() => setProfileImageError(false)}
              />
            ) : (
              <div className={cn(
                'flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium',
                resolvedTheme === 'dark' ? 'bg-teal-800 text-white' : 'bg-teal-200 text-teal-800'
              )}>
                {initials}
              </div>
            )}
            <span className={cn('font-semibold text-base truncate max-w-[150px]', getTextColor(true))}>
              {displayName}
            </span>
          </>
        ) : (
          <>
            <div className={cn(
              'flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-md overflow-hidden',
              currentTheme.activeBg
            )}>
              {companyInfo.logo && !logoError ? (
                <img
                  src={companyInfo.logo}
                  alt={`${companyInfo.name} logo`}
                  className="w-full h-full object-cover"
                  onError={() => setLogoError(true)}
                  onLoad={() => setLogoError(false)}
                />
              ) : (
                <Building2 size={18} className={getIconColor(true)} />
              )}
            </div>
            <span className={cn('font-semibold text-base truncate max-w-[150px]', getTextColor(true))}>
              {companyInfo.name || 'Company'}
            </span>
          </>
        )}
      </button>
    );
  };

  const getInitials = (): string => {
    const first = (user?.first_name || '').charAt(0).toUpperCase();
    const last = (user?.last_name || '').charAt(0).toUpperCase();
    return first + last || 'U';
  };

  const getProfileImage = (): string | null => {
    if (!user?.profile_img) return null;
    const formattedUrl = formatImageUrl(user.profile_img);
    return formattedUrl || null;
  };

  const initials = getInitials();
  const profileImage = getProfileImage();
  const ownDisplayName = user?.first_name ? `${user.first_name} ${user.last_name}` : 'User';
  const displayName = (() => {
    const teamOwner = (user as AdminUser | null)?.team_owner_name?.trim();
    // For SSO and local subusers, roles can still include "admin".
    // Use capability flag instead: subusers cannot manage company profile.
    const isSubUser = (user as AdminUser | null)?.can_manage_company_profile === false;
    const showTeamOwner = !!teamOwner && isSubUser;
    return showTeamOwner ? teamOwner! : ownDisplayName;
  })();

  if (!mounted) return null;

  const currentNavItems = getFilteredNavItems();
  const currentTheme = getCurrentTheme();

  // ─── MOBILE NAVBAR ────────────────────────────────────────────────────────────
  const MobileNavbar = () => (
    <>
      <div className={cn(
        'fixed top-0 left-0 right-0 h-16 z-50 flex items-center justify-between px-4 border-b lg:hidden',
        currentTheme.bg, currentTheme.border
      )}>
        <MobileHeaderIdentity />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(true)}
          className={cn('h-10 w-10', resolvedTheme === 'dark' ? 'text-white hover:bg-white/10' : 'text-black hover:bg-gray-100')}
        >
          <Menu size={24} />
        </Button>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={cn(
                'fixed top-0 right-0 h-full w-80 z-50 flex flex-col shadow-2xl lg:hidden',
                currentTheme.bg, currentTheme.border
              )}
            >
              {/* Drawer Header */}
              <div className={cn('h-16 px-4 flex items-center justify-between border-b', currentTheme.border)}>
                <Button
                  variant="ghost" size="icon"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn('h-8 w-8', resolvedTheme === 'dark' ? 'text-white hover:bg-white/10' : 'text-black hover:bg-gray-100')}
                >
                  <X size={20} />
                </Button>
              </div>

              {/* Alert Banner */}
              {showBanner && (
                <div className="px-4 py-2">
                  <SidebarAlertBanner
                    isVisible={showBanner}
                    isSidebarCollapsed={false}
                    missingFields={missingFields}
                  />
                </div>
              )}

              {/* Mobile Account Box Toggle */}
              <div className="px-4 py-2">
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-between h-12 px-4 rounded-xl border border-border/40 bg-muted/20",
                    resolvedTheme === 'dark' ? 'text-white' : 'text-black'
                  )}
                  onClick={() => setIsAccountBoxOpen(!isAccountBoxOpen)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <User size={16} />
                    </div>
                    <span className="font-bold text-sm">Switch Account</span>
                  </div>
                  <ChevronDown size={18} className={cn("transition-transform duration-200", isAccountBoxOpen ? "rotate-180" : "")} />
                </Button>
              </div>

              <AnimatePresence>
                {isAccountBoxOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden px-4"
                  >
                    <AccountManagementBox dense />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex-1 overflow-y-auto p-4">
                <nav className="space-y-2">
                  {currentNavItems.map((item) => {
                    const isActive = pathname.startsWith(item.href) ||
                      (item.subItems?.some((s) => pathname.startsWith(s.href)) || false);
                    const hasSubItems = item.subItems && item.subItems.length > 0;
                    const isExpanded = expandedItems[item.href];
                    const textColor = getTextColor(isActive);
                    const iconColor = getIconColor(isActive);

                    return (
                      <div key={item.href} className="space-y-1">
                        <Button
                          asChild={!hasSubItems}
                          variant="ghost"
                          size="sm"
                          className={cn(
                            'w-full justify-start h-10 px-3 relative transition-colors rounded-md group mb-1',
                            isActive
                              ? 'bg-primary text-primary-foreground shadow-sm font-medium'
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                          )}
                          onClick={hasSubItems ? (e) => { e.preventDefault(); toggleItemExpand(item.href); } : undefined}
                        >
                          {hasSubItems ? (
                            <div className="flex items-center w-full relative z-10">
                              <div className="mr-3">
                                {React.cloneElement(item.icon, { size: 18 })}
                              </div>
                              <span className="flex-grow text-left text-sm">{item.name}</span>
                              <ChevronRight size={14} className={cn('transition-transform duration-200', isExpanded && 'transform rotate-90')} />
                            </div>
                          ) : (
                            <Link href={item.href} className="flex items-center w-full relative z-10">
                              <div className="mr-3">
                                {React.cloneElement(item.icon, { size: 18 })}
                              </div>
                              <span className="text-sm">{item.name}</span>
                            </Link>
                          )}
                        </Button>

                        {hasSubItems && isExpanded && (
                          <div className={cn('ml-8 pl-2 space-y-1 border-l-2', currentTheme.border)}>
                            {item.subItems?.map((subItem) => {
                              const isSubActive = pathname.startsWith(subItem.href);
                              const SubItemIcon = subItem.icon ? (LucideIcons[subItem.icon] as LucideIcon) : Table2;
                              return (
                                <Button key={subItem.href} asChild variant="ghost" size="sm"
                                  className={cn(
                                    'w-full justify-start h-9 px-3 rounded-md my-0.5 transition-colors',
                                    isSubActive ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                                  )}>
                                  <Link href={subItem.href} className="flex items-center gap-3">
                                    <div className={cn(
                                      'w-1 h-1 rounded-full',
                                      isSubActive ? 'bg-primary' : 'bg-muted-foreground/30'
                                    )} />
                                    <span className="text-xs">{subItem.name}</span>
                                  </Link>
                                </Button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </nav>
              </div>

              {/* Drawer Footer */}
              <div className={cn('border-t p-4', currentTheme.border)}>
                <div className="flex items-center justify-between gap-4">
                  {/* Profile avatar — routes to /profile */}
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); router.push('/profile'); }}
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity min-w-0"
                  >
                    {profileImage && !profileImageError ? (
                      <img src={profileImage} alt={displayName}
                        className="h-8 w-8 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600"
                        onError={() => setProfileImageError(true)} onLoad={() => setProfileImageError(false)} />
                    ) : (
                      <div className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium',
                        resolvedTheme === 'dark' ? 'bg-teal-800 text-white' : 'bg-teal-200 text-teal-800'
                      )}>
                        {initials}
                      </div>
                    )}
                    <span className={cn('text-sm truncate max-w-[120px] block', getTextColor(false))}>
                      {displayName}
                    </span>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={handleIconClick} className="flex items-center gap-2">
                      <Power className="h-4 w-4" />Logout
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="h-16 lg:hidden" />
    </>
  );

  // ─── DESKTOP SIDEBAR ──────────────────────────────────────────────────────────
  const DesktopSidebar = () => {
    if (!isDataLoaded) {
      return (
        <motion.aside
          initial={{ width: isCollapsed ? 64 : 250 }}
          animate={{ width: isCollapsed ? 64 : 250 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className={cn(
            'h-screen sticky top-0 flex-col transition-colors duration-300 border-r hidden lg:flex',
            currentTheme.bg, currentTheme.text, currentTheme.border,
            isCollapsed ? 'w-16' : 'w-64'
          )}
        >
          <SidebarSkeleton isCollapsed={isCollapsed} currentTheme={currentTheme} />
        </motion.aside>
      );
    }

    return (
      <motion.aside
        initial={{ width: isCollapsed ? 64 : 250 }}
        animate={{ width: isCollapsed ? 64 : 250 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={cn(
          'h-screen sticky top-0 flex-col transition-colors duration-300 border-r hidden lg:flex z-50',
          currentTheme.bg, currentTheme.text, currentTheme.border,
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <SidebarAlertBanner
          isVisible={showBanner}
          isSidebarCollapsed={isCollapsed}
          missingFields={missingFields}
        />

        {/* Header */}
        <div className={cn(
          'h-16 px-3 flex items-center justify-between border-b',
          currentTheme.border, isCollapsed && 'justify-center'
        )}>
          {!isCollapsed && (
            <div className="flex items-center justify-between w-full gap-2 overflow-hidden">
              <HeaderIdentity />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsAccountBoxOpen(!isAccountBoxOpen)}
                className={cn(
                  "h-8 w-8 shrink-0 transition-transform duration-200",
                  isAccountBoxOpen ? "rotate-180" : "rotate-0",
                  resolvedTheme === 'dark' ? 'text-white hover:bg-white/10' : 'text-black hover:bg-gray-100'
                )}
              >
                <ChevronDown size={18} />
              </Button>
            </div>
          )}

          {/* When collapsed, only show hamburger/menu icon, not profile image */}
          {isCollapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDetailsNavigation}
                  className={cn(
                    'h-8 w-8',
                    resolvedTheme === 'dark' ? 'text-white hover:bg-white/10' : 'text-black hover:bg-gray-100'
                  )}
                >
                  <Menu size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {resolveContextType(user) === 'personal' ? `${displayName} — View personal details` : `${companyInfo.name || 'Company'} — View company details`}
              </TooltipContent>
            </Tooltip>
          )}

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost" size="icon"
              onClick={handleToggleSidebar}
              className={cn('h-8 w-8 rounded-full',
                resolvedTheme === 'dark' ? 'text-white hover:bg-white/10' : 'text-black hover:bg-gray-100')}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </Button>
          </div>
        </div>

        {/* Accounts management box (expanded only) */}
        {!isCollapsed && (
          <AnimatePresence>
            {isAccountBoxOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden px-2 pb-2"
              >
                <AccountManagementBox />
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Navigation */}
        <TooltipProvider delayDuration={0}>
          <div className="flex flex-col gap-1 p-2 flex-grow overflow-y-auto" style={{ maxHeight: 'calc(100vh - 64px - 60px)' }}>
            <nav>
              {currentNavItems.map((item) => {
                const isActive = pathname.startsWith(item.href) ||
                  (item.subItems?.some((s) => pathname.startsWith(s.href)) || false);
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isExpanded = expandedItems[item.href];
                const textColor = getTextColor(isActive);
                const iconColor = getIconColor(isActive);

                return isCollapsed ? (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Button asChild variant="ghost" size="icon"
                        className={cn(
                          'w-10 h-10 my-0.5 relative transition-colors rounded-md group',
                          isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )}>
                        <Link href={item.href} className="flex items-center justify-center">
                          {React.cloneElement(item.icon, { size: 18 })}
                          {isActive && (
                            <motion.div
                              layoutId="activeTabCollapsed"
                              className="absolute left-0 w-1 h-5 bg-white rounded-r-full"
                            />
                          )}
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.name}</TooltipContent>
                  </Tooltip>
                ) : (
                  <div key={item.href} className="flex flex-col">
                    <Button
                      asChild={!hasSubItems}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'w-full justify-start h-10 px-3 my-0.5 relative transition-all rounded-md group',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm font-medium'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        hasSubItems && 'pr-2'
                      )}
                      onClick={hasSubItems ? (e) => { e.preventDefault(); toggleItemExpand(item.href); } : undefined}
                    >
                      <div className="flex items-center w-full relative z-10">
                        <Link href={item.href} className="flex items-center flex-grow"
                          onClick={(e) => { if (hasSubItems) { e.preventDefault(); toggleItemExpand(item.href); } }}>
                          <div className="mr-3">
                            {React.cloneElement(item.icon, { size: 18 })}
                          </div>
                          <span className="flex-grow text-left text-sm">{item.name}</span>
                        </Link>
                        {hasSubItems && (
                          <ChevronRight size={14} className={cn('transition-transform duration-200', isExpanded && 'transform rotate-90')} />
                        )}
                        {isActive && !hasSubItems && (
                          <motion.div
                            layoutId="activeTabGlow"
                            className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full"
                          />
                        )}
                      </div>
                    </Button>

                    {hasSubItems && isExpanded && !isCollapsed && (
                      <div className={cn('ml-8 pl-2 border-l-2', currentTheme.border)}>
                        {item.subItems?.map((subItem) => {
                          const isSubActive = pathname.startsWith(subItem.href);
                          const SubItemIcon = subItem.icon ? (LucideIcons[subItem.icon] as LucideIcon) : Table2;
                          return (
                            <Button key={subItem.href} asChild variant={isSubActive ? 'secondary' : 'ghost'} size="sm"
                              className={cn('justify-start h-8 px-3 my-1 relative w-full transition-colors', isSubActive ? currentTheme.activeBg : '')}>
                              <Link href={subItem.href} className="flex items-center gap-2">
                                {SUBITEM_ICONS[subItem.name]
                                  ? React.cloneElement(SUBITEM_ICONS[subItem.name], { className: cn('w-4 h-4', getIconColor(isSubActive)), size: 16 })
                                  : <SubItemIcon className={cn('w-4 h-4', getIconColor(isSubActive))} size={16} />}
                                <span className={getTextColor(isSubActive)}>{subItem.name}</span>
                                {isSubActive && (
                                  <div className={cn('absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 rounded-r-full',
                                    resolvedTheme === 'dark' ? 'bg-white' : 'bg-black')} />
                                )}
                              </Link>
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </TooltipProvider>

        {/* Footer */}
        <div className={cn('border-t p-2', currentTheme.border)}>
          <div className={cn('flex items-center justify-between', isCollapsed ? 'justify-center' : 'px-2')}>
            {/* Profile avatar — routes to /profile */}
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleProfileNavigation}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  title="View profile"
                >
                  {profileImage && !profileImageError ? (
                    <img src={profileImage} alt={ownDisplayName}
                      className="h-8 w-8 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600"
                      onError={() => setProfileImageError(true)} onLoad={() => setProfileImageError(false)} />
                  ) : (
                    <div className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium',
                      resolvedTheme === 'dark' ? 'bg-teal-800 text-white' : 'bg-teal-200 text-teal-800'
                    )}>
                      {initials}
                    </div>
                  )}
                </button>
                <span className={cn('text-sm truncate max-w-[120px] block', getTextColor(false))}>
                  {ownDisplayName}
                </span>
              </div>
            )}

            {isCollapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleProfileNavigation}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    title="View profile"
                  >
                    {profileImage && !profileImageError ? (
                      <img src={profileImage} alt={ownDisplayName}
                        className="h-8 w-8 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600 mx-auto"
                        onError={() => setProfileImageError(true)} onLoad={() => setProfileImageError(false)} />
                    ) : (
                      <div className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium mx-auto',
                        resolvedTheme === 'dark' ? 'bg-teal-800 text-white' : 'bg-teal-200 text-teal-800'
                      )}>
                        {initials}
                      </div>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{ownDisplayName}</TooltipContent>
              </Tooltip>
            )}

            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon"
                    className={cn('h-8 w-8', resolvedTheme === 'dark' ? 'text-white hover:bg-white/10' : 'text-black hover:bg-gray-100')}
                    onClick={handleIconClick}>
                    <Power className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Logout</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </motion.aside>
    );
  };

  return (
    <>
      <MobileNavbar />
      <DesktopSidebar />
      <LogoutConfirmPopup
        open={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onLogout={handleLogout}
      />
    </>
  );
}