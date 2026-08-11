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
import { SIDEBAR_COLORS, resolveThemeName } from './SidebarColorPicker';
import { useAppSelector, useAppDispatch } from '@/slices/hooks';
import { clearAuthUser } from '@/slices/authSlice';
import { logout, getCurrentUser } from '@/services/service';
import { toast } from 'sonner';
import { AdminUser } from '@/services/interface/AdminUser';
import {
  getMissingCompanyFields,
  shouldShowBanner,
  clearCompanyCompletionMark,
} from '@/utils/company-validation';
import { SidebarAlertBanner } from '@/components/common/SidebarAlertBanner';
import LogoutConfirmPopup from '@/components/auth/LogoutConfirmPopup';
import { formatImageUrl } from '@/utils/image-url';
import { getResolvedActiveCompanyId, getResolvedContextType, isSubUser } from '@/utils/account-context';
import { hasPermission, NAV_PERMISSION_MAP } from '@/utils/permissions';
import { AccountManagementBox } from '@/components/common/sidebar/AccountManagementBox';
import { SidebarPlanDetails } from '@/components/common/sidebar/SidebarPlanDetails';
import { getViewScope, setViewScope, ViewScope } from '@/utils/view-scope';
import { HIDDEN_NAV_ITEM_NAMES } from '@/lib/hidden-routes';
import type { UserSubscription } from '@/services/interface/User';

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

interface NavGroup {
  title: string;
  items: NavItem[];
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
  { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={18} /> },
  { name: 'Invoices', href: '/invoices', icon: <Receipt size={18} /> },
  { name: 'Clients', href: '/invoice/clients', icon: <Users size={18} /> },
  { name: 'Referrals', href: '/referral-dashboard', icon: <Award size={18} /> },
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
          'h-16 px-4 flex items-center justify-between',
          isCollapsed && 'justify-center border-b border-sidebar-border'
        )}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-2 w-full">
            <div className="flex-shrink-0 w-7 h-7 bg-muted rounded-md animate-pulse" />
            <div className="flex-1 h-4 bg-muted rounded animate-pulse" />
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 bg-muted rounded-md animate-pulse" />
        )}
      </div>

      {/* Nav Items Skeleton */}
      <div className="flex flex-col gap-1 p-2 flex-grow mt-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className={cn(
              'h-9 bg-muted rounded-lg animate-pulse',
              isCollapsed ? 'w-9 mx-auto' : 'w-full'
            )}
          />
        ))}
      </div>

      {/* Footer Skeleton */}
      <div className="mt-auto p-3 border-t border-sidebar-border">
        <div className={cn('flex items-center gap-2', isCollapsed && 'justify-center')}>
          <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
          {!isCollapsed && (
            <div className="flex-1 h-3 bg-muted rounded animate-pulse" />
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

  const filterNavItemsByPermission = (items: NavItem[]): NavItem[] => {
    const identity = user ?? identityUser;
    return items.filter((item) => {
      if (HIDDEN_NAV_ITEM_NAMES.has(item.name)) return false;
      const required = NAV_PERMISSION_MAP[item.name];
      if (!required) return true;
      return hasPermission(identity, required);
    });
  };

  const getFilteredNavGroups = (): NavGroup[] => {
    const coreItems: NavItem[] = [
      { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={18} /> },
      { name: 'Invoices', href: '/invoices', icon: <Receipt size={18} /> },
      { name: 'Clients', href: '/invoice/clients', icon: <Users size={18} /> },
    ];

    const managementItems: NavItem[] = [
      { name: 'Referrals', href: '/referral-dashboard', icon: <Award size={18} /> },
      ...(isSuperAdminOrAdmin(user) ? [{ name: 'Users', href: '/users', icon: <ShieldCheck size={18} /> }] : []),
      { name: 'Settings', href: '/settings', icon: <Settings size={18} /> },
    ];

    const groups: NavGroup[] = [
      {
        title: "CORE",
        items: filterNavItemsByPermission(coreItems),
      },
      {
        title: "MANAGEMENT",
        items: filterNavItemsByPermission(managementItems),
      },
    ];

    if (isSuperAdmin(user)) {
      groups.push({
        title: "ANALYTICS",
        items: [
          { name: 'Admin Insights', href: '/analytics', icon: <BarChart size={18} /> },
          { name: 'Plans', href: '/plans', icon: <CreditCard size={18} /> },
        ],
      });
    }

    return groups.filter((g) => g.items.length > 0);
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

  const isCompanyAccountType = (u: any): boolean => {
    if (!u) return false;
    const acctType = String(u?.account_type ?? '').toLowerCase();

    // Super-admins are NEVER considered a "standalone company account"
    if (acctType === 'super-admin' || acctType === 'super admin') return false;

    // If they have ANY available companies, they are NOT a standalone company account
    const hasLinkedCompanies = Array.isArray(u?.available_companies) && u.available_companies.length > 0;
    if (hasLinkedCompanies) return false;

    // If they are explicitly 'personal', they are NOT a standalone company account
    if (acctType === 'personal') return false;

    // Only if they are 'company' type AND have no linked companies are they standalone
    if (acctType === 'company') return true;

    // Final fallback: check context. If in company context with no linked companies, it's standalone.
    const ctxType = getResolvedContextType(u);
    if (ctxType === 'company' && !hasLinkedCompanies) return true;

    return false;
  };

  const getSidebarThemeStorageKey = (
    contextType: 'personal' | 'company',
    companyId?: number | null,
    userData?: any
  ) => {
    const userId = Number(userData?.id ?? identityUser?.id ?? user?.id);
    const userScope = Number.isFinite(userId) && userId > 0 ? `user:${userId}` : 'user:unknown';
    if (contextType === 'company' && companyId) return `sidebarTheme:${userScope}:company:${companyId}`;
    return `sidebarTheme:${userScope}:personal`;
  };

  const getScopedSidebarTheme = (userData: any): string => {
    if (typeof window === 'undefined') return 'white';
    const contextType = resolveContextType(userData);
    const activeCompanyId = getResolvedActiveCompanyId(userData);
    const scopedKey = getSidebarThemeStorageKey(contextType, activeCompanyId, userData);
    const fromLocalStorage = localStorage.getItem(scopedKey);
    if (fromLocalStorage) return fromLocalStorage;
    // Do not auto-apply parent API color for sub-users.
    if (isSubUser(userData)) return 'white';
    if (userData?.theme_color) {
      return resolveThemeName(userData.theme_color);
    }
    return 'white';
  };

  // ── Header identity should route by active context ───────────────────────────
  const handleDetailsNavigation = () => {
    if (viewScope === 'all') {
      return;
    }

    const sourceUser = user ?? identityUser;

    // Guard: if user data hasn't loaded yet, don't navigate — resolveContextType(null)
    // defaults to 'personal' which can trigger a server crash during RSC rendering.
    if (!sourceUser) {
      return;
    }

    // Super admin always navigates to company details page.
    if (isSuperAdmin(sourceUser)) {
      window.location.assign('/company?mode=company');
      return;
    }

    const contextType = resolveContextType(sourceUser);
    // Standalone company accounts must always go to company mode
    if (contextType === 'personal' && !isCompanyAccountType(sourceUser)) {
      window.location.assign('/company?mode=personal');
      return;
    }
    window.location.assign('/company?mode=company');
  };

  // ── Footer profile avatar always routes to /profile ──
  const handleProfileNavigation = () => {
    router.push('/profile');
  };

  const loadUserData = useCallback(async (force = false) => {
    const now = Date.now();
    const currentIdentityId = Number(identityUser?.id ?? reduxUser?.id ?? user?.id ?? 0);
    const cachedUserId = Number(lastUserData?.id ?? 0);
    const canReuseCachedUser =
      cachedUserId > 0 &&
      currentIdentityId > 0 &&
      cachedUserId === currentIdentityId;

    if (!force && canReuseCachedUser && lastUserData && now - lastCheckTime < CHECK_INTERVAL) {
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
  }, [identityUser?.id, reduxUser?.id, user?.id]);

  useEffect(() => {
    const currentIdentityId = Number(identityUser?.id ?? reduxUser?.id ?? user?.id ?? 0);
    const cachedUserId = Number(lastUserData?.id ?? 0);
    if (currentIdentityId > 0 && cachedUserId > 0 && currentIdentityId !== cachedUserId) {
      // Prevent cross-user bleed (e.g. owner -> sub-user first load).
      lastUserData = null;
      lastCheckTime = 0;
    }
  }, [identityUser?.id, reduxUser?.id, user?.id]);

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
        : (localStorage.getItem(getSidebarThemeStorageKey('personal', null, identityUser)) || 'white');
      const savedCollapse = localStorage.getItem('sidebarCollapsed') === 'true';
      setSidebarTheme(savedTheme);
      setIsCollapsed(savedCollapse);

      // Always fetch fresh user data on mount to get current context info.
      // Redux user may be stale (e.g. set during login before context switch).
      loadUserData();
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

    // Only use Redux data as the initial seed before the API has responded.
    // Once lastUserData is populated, let loadUserData() be the sole source of truth
    // to prevent partial Redux updates (e.g. from the profile page) from
    // temporarily hiding nav items that depend on the permissions array.
    if (!lastUserData) {
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
      const customEvent = event as CustomEvent<{ theme?: string; key?: string } | string>;
      const detail = customEvent.detail;
      const newTheme = typeof detail === 'string' ? detail : detail?.theme;
      if (newTheme) {
        setSidebarTheme(newTheme);
        return;
      }
      // Fallback to reading from localStorage if theme not in event detail
      const sourceUser = identityUser ?? user;
      if (sourceUser) {
        setSidebarTheme(getScopedSidebarTheme(sourceUser));
      }
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
      setViewScope('current');
      router.push('/auth/login');
    }
  };

  // Toggle item expansion
  const toggleItemExpand = (href: string) => {
    setExpandedItems((prev) => ({ ...prev, [href]: !prev[href] }));
  };

  // Toggle sidebar collapse
  const handleToggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
  };

  // Get theme colors
  const getCurrentTheme = (): ThemeVariant => {
    const theme =
      SIDEBAR_COLORS[sidebarTheme as keyof typeof SIDEBAR_COLORS] ||
      SIDEBAR_COLORS.white;
    return resolvedTheme === 'dark' && theme.dark ? theme.dark : theme;
  };

  // Get text color based on active state
  const getTextColor = (isActive: boolean) => {
    if (sidebarTheme === 'white') {
      return isActive ? 'text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground/70 group-hover:text-sidebar-foreground';
    }
    if (sidebarTheme.includes('pastel')) return isActive ? currentTheme.text : `${currentTheme.text}/80`;
    return isActive ? 'text-white' : 'text-white/80';
  };

  // Get icon color
  const getIconColor = (isActive: boolean) => {
    if (sidebarTheme === 'white') {
      return isActive ? 'text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 group-hover:text-sidebar-foreground';
    }
    if (sidebarTheme.includes('pastel')) return getTextColor(isActive);
    return 'text-white';
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
          "flex items-center gap-2 overflow-hidden transition-all w-full p-1.5 rounded-lg",
          isAll ? "cursor-not-allowed opacity-80" : "cursor-pointer hover:bg-sidebar-accent group"
        )}
        title={isAll ? 'All accounts mode: details navigation is disabled' : isPersonal ? 'View personal details' : 'View company details'}
      >
        {isAll ? (
          <>
            <div className={cn(
              'flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-sm bg-primary/10 transition-colors',
              ""
            )}>
              <TableProperties size={15} className="text-primary" />
            </div>
            <h1 className={cn('font-semibold text-sm truncate tracking-tight transition-colors', getTextColor(true))}>
              All Accounts
            </h1>
          </>
        ) : isPersonal ? (
          <>
            {profileImage && !profileImageError ? (
              <img
                src={profileImage}
                alt={displayName}
                className="flex-shrink-0 h-7 w-7 rounded-md object-cover border border-sidebar-border shadow-sm"
                onError={() => setProfileImageError(true)}
                onLoad={() => setProfileImageError(false)}
              />
            ) : (
              <div className={cn(
                'flex-shrink-0 h-7 w-7 rounded-md flex items-center justify-center text-[10px] font-bold bg-primary/10 text-primary uppercase'
              )}>
                {initials}
              </div>
            )}
            <h1 className={cn('font-semibold text-sm truncate tracking-tight', getTextColor(true))}>
              {displayName}
            </h1>
          </>
        ) : (
          <>
            <div className={cn(
              'flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-md overflow-hidden bg-primary/5 border border-sidebar-border/50',
              ""
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
                <Building2 size={15} className="text-primary/70" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className={cn('font-semibold text-sm truncate tracking-tight leading-none mb-0.5', getTextColor(true))}>
                {companyInfo.name === null ? 'Loading...' : companyInfo.name || 'Company'}
              </h1>
              <span className="text-[10px] text-sidebar-foreground/50 truncate font-medium uppercase tracking-wider">Workspace</span>
            </div>
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
    const _isSubUser = isSubUser(user);
    if (!_isSubUser) return ownDisplayName;
    // Prefer team_owner_name (parent's company or person name, set by backend).
    const teamOwner = (user as AdminUser | null)?.team_owner_name?.trim();
    if (teamOwner) return teamOwner;
    // Secondary fallback: current_context company name (also from parent's host).
    const ctxCompany = (user as any)?.current_context?.company_name?.trim();
    if (ctxCompany) return ctxCompany;
    // Last resort: show own name until fresh API data arrives.
    return ownDisplayName;
  })();

  const subscription = (() => {
    const billingUser = (user ?? reduxAuthUser ?? identityUser) as {
      subscription?: UserSubscription | null;
    } | null;
    return billingUser?.subscription ?? null;
  })();

  if (!mounted) return null;

  const userIsSubUser = isSubUser(user ?? reduxAuthUser ?? identityUser);
  const isOwnerType =
    user?.account_type === 'personal' ||
    user?.account_type === 'company' ||
    user?.account_type === 'Company' ||
    user?.account_type === 'super-admin' ||
    user?.account_type === 'super admin';
  const showAccountManager = !userIsSubUser && isOwnerType;
  const currentTheme = getCurrentTheme();

  // ─── MOBILE NAVBAR ────────────────────────────────────────────────────────────
  const MobileNavbar = () => {
    const navGroups = getFilteredNavGroups();

    return (
      <>
        <div className={cn(
          'fixed top-0 left-0 right-0 h-14 z-50 flex items-center justify-between px-4 border-b lg:hidden backdrop-blur-md',
          currentTheme.bg,
          currentTheme.border
        )}>
          <MobileHeaderIdentity />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(true)}
            className="h-9 w-9 text-sidebar-foreground/70"
          >
            <Menu size={20} />
          </Button>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 lg:hidden"
              />
              <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className={cn(
                  'fixed top-0 right-0 h-full w-72 z-50 flex flex-col shadow-xl lg:hidden',
                  currentTheme.bg,
                  currentTheme.border
                )}
              >
                {/* Drawer Header */}
                <div className={cn('h-14 px-4 flex items-center justify-between border-b', currentTheme.border)}>
                  <span className="font-semibold text-sm text-sidebar-foreground">Menu</span>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="h-8 w-8 text-sidebar-foreground/70"
                  >
                    <X size={18} />
                  </Button>
                </div>

                {/* Alert Banner */}
                {showBanner && (
                  <div className="p-3">
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
                    className="w-full justify-between h-10 px-3 rounded-lg border border-sidebar-border bg-sidebar-accent/30 text-sidebar-foreground"
                    onClick={() => setIsAccountBoxOpen(!isAccountBoxOpen)}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                        <User size={14} />
                      </div>
                      <span className="font-semibold text-xs">Switch Account</span>
                    </div>
                  </Button>
                </div>

                <AnimatePresence>
                  {isAccountBoxOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden px-4"
                    >
                      <AccountManagementBox dense />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  <nav className="space-y-0.5">
                    {navGroups.map((group, index) => (
                      <div key={group.title} className="space-y-0.5">
                        {index > 0 && (
                          <div className="flex items-center gap-3 px-3 my-4">
                            <div className="h-[2px] flex-grow bg-gradient-to-r from-transparent to-teal-500/50" />
                            {group.title === 'MANAGEMENT' && <ShieldCheck size={18} strokeWidth={2.5} className="text-teal-500" />}
                            {group.title === 'ANALYTICS' && <Activity size={18} strokeWidth={2.5} className="text-teal-500" />}
                            <div className="h-[2px] flex-grow bg-gradient-to-l from-transparent to-teal-500/50" />
                          </div>
                        )}
                        {group.items.map((item: NavItem) => {
                          const isActive = pathname.startsWith(item.href) ||
                            (item.subItems?.some((s: SubItem) => pathname.startsWith(s.href)) || false);
                          const hasSubItems = item.subItems && item.subItems.length > 0;
                          const isExpanded = expandedItems[item.href];

                          return (
                            <div key={item.href} className="space-y-1">
                              <Button
                                asChild={!hasSubItems}
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  'w-full justify-start h-10 px-3 rounded-lg group transition-all',
                                  isActive
                                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50'
                                )}
                                onClick={hasSubItems ? (e) => { e.preventDefault(); toggleItemExpand(item.href); } : undefined}
                              >
                                {hasSubItems ? (
                                  <div className="flex items-center w-full">
                                    <div className="mr-3">
                                      {React.cloneElement(item.icon as any, {
                                        size: 18,
                                        strokeWidth: isActive ? 2.5 : 2,
                                        className: isActive ? "text-primary" : "opacity-70"
                                      })}
                                    </div>
                                    <span className="flex-grow text-left text-sm">{item.name}</span>
                                    <ChevronRight size={14} className={cn('transition-transform duration-200 opacity-50', isExpanded && 'transform rotate-90')} />
                                  </div>
                                ) : (
                                  <Link href={item.href} className="flex items-center w-full">
                                    <div className="mr-3">
                                      {React.cloneElement(item.icon as any, {
                                        size: 18,
                                        strokeWidth: isActive ? 2.5 : 2,
                                        className: isActive ? "text-primary" : "opacity-70"
                                      })}
                                    </div>
                                    <span className="text-sm">{item.name}</span>
                                  </Link>
                                )}
                              </Button>

                              {hasSubItems && isExpanded && (
                                <div className="ml-4 pl-4 border-l border-sidebar-border/50 flex flex-col gap-1 mt-1 mb-2">
                                  {item.subItems?.map((subItem: SubItem) => {
                                    const isSubActive = pathname.startsWith(subItem.href);
                                    const SubItemIcon = subItem.icon ? (LucideIcons[subItem.icon as keyof typeof LucideIcons] as LucideIcon) : Table2;
                                    return (
                                      <Button key={subItem.href} asChild variant="ghost" size="sm"
                                        className={cn(
                                          'w-full justify-start h-9 px-3 rounded-md transition-all',
                                          isSubActive
                                            ? 'bg-sidebar-accent/80 text-sidebar-accent-foreground font-medium'
                                            : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/30'
                                        )}>
                                        <Link href={subItem.href} className="flex items-center gap-2.5">
                                          {SUBITEM_ICONS[subItem.name]
                                            ? React.cloneElement(SUBITEM_ICONS[subItem.name], { className: cn('w-3.5 h-3.5', isSubActive ? "text-primary" : "opacity-60"), size: 14 })
                                            : <SubItemIcon className={cn('w-3.5 h-3.5', isSubActive ? "text-primary" : "opacity-60")} size={14} />}
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
                      </div>
                    ))}
                  </nav>
                </div>

                <SidebarPlanDetails subscription={subscription} hidden={userIsSubUser} />

                {/* Drawer Footer */}
                <div className="border-t border-sidebar-border p-4 bg-sidebar-accent/10">
                  <div className="flex items-center justify-between gap-4">
                    {/* Profile avatar — routes to /profile */}
                    <button
                      onClick={() => { setIsMobileMenuOpen(false); router.push('/profile'); }}
                      className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity min-w-0"
                    >
                      {profileImage && !profileImageError ? (
                        <img src={profileImage} alt={displayName}
                          className="h-9 w-9 rounded-full object-cover border border-sidebar-border shadow-sm"
                          onError={() => setProfileImageError(true)} onLoad={() => setProfileImageError(false)} />
                      ) : (
                        <div className={cn(
                          'h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold bg-primary/10 text-primary'
                        )}>
                          {initials}
                        </div>
                      )}
                      <div className="flex flex-col items-start min-w-0">
                        <span className="text-sm font-semibold text-sidebar-foreground truncate w-full">
                          {displayName}
                        </span>
                        <span className="text-[10px] text-sidebar-foreground/50">View Profile</span>
                      </div>
                    </button>

                    <Button variant="outline" size="sm" onClick={handleIconClick} className="h-8 border-sidebar-border text-sidebar-foreground hover:bg-destructive hover:text-white transition-colors">
                      <Power className="h-3.5 w-3.5 mr-2" />Logout
                    </Button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="h-14 lg:hidden" />
      </>
    );
  };


  // ─── DESKTOP SIDEBAR ──────────────────────────────────────────────────────────
  const DesktopSidebar = () => {
    if (!isDataLoaded) {
      return (
        <motion.aside
          initial={{ width: 74 }} animate={{ width: isCollapsed ? 74 : 260 }}
          className={cn(
            'h-screen sticky top-0 flex-col transition-all duration-300 border-r hidden lg:flex z-50',
            currentTheme.bg,
            currentTheme.text,
            currentTheme.border,
            isCollapsed ? 'w-20' : 'w-64'
          )}
        >
          <SidebarSkeleton isCollapsed={isCollapsed} currentTheme={currentTheme} />
        </motion.aside>
      );
    }

    const navGroups = getFilteredNavGroups();

    return (
      <motion.aside
        initial={{ width: isCollapsed ? 74 : 260 }}
        animate={{ width: isCollapsed ? 74 : 260 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={cn(
          'h-screen sticky top-0 flex flex-col transition-all duration-300 border-r hidden lg:flex z-50 shadow-sm shadow-black/5',
          currentTheme.bg,
          currentTheme.text,
          currentTheme.border,
          isCollapsed ? 'w-[74px]' : 'w-[260px]'
        )}
      >
        <SidebarAlertBanner
          isVisible={showBanner}
          isSidebarCollapsed={isCollapsed}
          missingFields={missingFields}
        />

        {/* Header */}
        <div className={cn(
          'h-14 px-4 flex items-center justify-between mt-2',
          isCollapsed && 'justify-center border-b border-sidebar-border/30 pb-2 mb-2'
        )}>
          {!isCollapsed && (
            <div className="flex items-center justify-between w-full gap-1 overflow-hidden">
              <HeaderIdentity />
              <Button variant="ghost" size="icon" onClick={() => setIsAccountBoxOpen(!isAccountBoxOpen)}
                className="h-7 w-7 text-sidebar-foreground/30 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all">
              </Button>
            </div>
          )}
          {isCollapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={handleDetailsNavigation} className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm hover:bg-primary/20 transition-all">
                  <Building2 size={18} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">Switch Workspace</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Accounts management box (expanded only) */}
        {!isCollapsed && showAccountManager && (
          <AnimatePresence>
            {isAccountBoxOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-y-auto max-h-[400px] px-2 pb-2"
              >
                <AccountManagementBox className="hidden" />
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Navigation */}
        <TooltipProvider delayDuration={0}>
          <div className="flex flex-col gap-0.5 px-2 py-2 flex-grow overflow-y-auto custom-scrollbar">
            {navGroups.map((group, index) => (
              <div key={group.title} className="flex flex-col gap-0.5">
                {index > 0 && (
                  <div className="flex items-center gap-4 px-6 my-2.5">
                    <div className="h-[2px] flex-grow bg-gradient-to-r from-transparent to-teal-500/40" />
                    <div className="flex-shrink-0 p-1 rounded-full bg-teal-500/10 border border-teal-500/20">
                      {group.title === 'MANAGEMENT' && <ShieldCheck size={16} strokeWidth={2.5} className="text-teal-500" />}
                      {group.title === 'ANALYTICS' && <Activity size={16} strokeWidth={2.5} className="text-teal-500" />}
                    </div>
                    <div className="h-[2px] flex-grow bg-gradient-to-l from-transparent to-teal-500/40" />
                  </div>
                )}
                <nav className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return isCollapsed ? (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>
                          <Button asChild variant="ghost" size="icon"
                            className={cn(
                              'w-11 h-11 mx-auto my-0.5 relative transition-all rounded-xl group',
                              isActive
                                ? 'bg-primary/10 text-primary shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
                                : 'text-sidebar-foreground/50 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                            )}>
                            <Link href={item.href} className="flex items-center justify-center">
                              {React.cloneElement(item.icon as any, { size: 20, strokeWidth: isActive ? 2.5 : 2 })}
                              {isActive && (
                                <motion.div layoutId="activeTabCollapsed" className="absolute left-[-4px] w-1 h-5 bg-primary rounded-r-full shadow-[2px_0_10px_rgba(var(--primary),0.6)]" />
                              )}
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-semibold">{item.name}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <div key={item.href} className="px-2">
                        <Button asChild variant="ghost" size="sm"
                          className={cn(
                            'w-full justify-start h-9 px-3 relative transition-all rounded-lg group overflow-hidden',
                            isActive
                              ? 'bg-primary/10 text-primary shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                              : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                          )}
                        >
                          <Link href={item.href} className="flex items-center w-full z-10">
                            <div className={cn("mr-3 transition-colors", isActive ? "text-primary scale-110" : "text-sidebar-foreground/35 group-hover:text-sidebar-foreground")}>
                              {React.cloneElement(item.icon as any, {
                                size: 18,
                                strokeWidth: isActive ? 2.5 : 2
                              })}
                            </div>
                            <span className={cn("flex-grow text-left text-[13px] tracking-tight font-medium transition-all")}>
                              {item.name}
                            </span>
                            {isActive && (
                              <motion.div
                                layoutId="activeTabIndicator"
                                className="absolute left-0 top-[15%] bottom-[15%] w-0.5 bg-primary rounded-r-full shadow-[2px_0_12px_rgba(var(--primary),0.8)]"
                              />
                            )}
                          </Link>
                        </Button>
                      </div>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </TooltipProvider>

        <SidebarPlanDetails subscription={subscription} isCollapsed={isCollapsed} hidden={userIsSubUser} />

        {/* Footer */}
        <div className="mt-auto p-2 border-t border-sidebar-border">
          <div className={cn('flex items-center justify-between gap-1', isCollapsed ? 'flex-col' : 'px-2')}>
            {/* Profile avatar — routes to /profile */}
            {!isCollapsed && (
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  onClick={handleProfileNavigation}
                  className="flex-shrink-0 group relative"
                  title="View profile"
                >
                  {profileImage && !profileImageError ? (
                    <img src={profileImage} alt={ownDisplayName}
                      className="h-8 w-8 rounded-full object-cover border border-sidebar-border group-hover:ring-2 group-hover:ring-primary/20 transition-all"
                      onError={() => setProfileImageError(true)} onLoad={() => setProfileImageError(false)} />
                  ) : (
                    <div className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold bg-primary/10 text-primary'
                    )}>
                      {initials}
                    </div>
                  )}
                </button>
                <div className="flex flex-col min-w-0">
                  <span className={cn('text-xs font-semibold truncate tracking-tight leading-none', getTextColor(false))}>
                    {ownDisplayName}
                  </span>
                </div>
              </div>
            )}

            {isCollapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleProfileNavigation}
                    className="cursor-pointer hover:opacity-80 transition-opacity mb-2"
                    title="View profile"
                  >
                    {profileImage && !profileImageError ? (
                      <img src={profileImage} alt={ownDisplayName}
                        className="h-8 w-8 rounded-full object-cover border border-sidebar-border mx-auto shadow-sm"
                        onError={() => setProfileImageError(true)} onLoad={() => setProfileImageError(false)} />
                    ) : (
                      <div className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold mx-auto bg-primary/10 text-primary'
                      )}>
                        {initials}
                      </div>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{ownDisplayName}</TooltipContent>
              </Tooltip>
            )}

            <div className={cn("flex items-center gap-0.5", isCollapsed && "flex-col")}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon"
                    className="h-8 w-8 text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={handleIconClick}>
                    <Power className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side={isCollapsed ? "right" : "top"}>Logout</TooltipContent>
              </Tooltip>

              {!isCollapsed && (
                <Button variant="ghost" size="icon"
                  onClick={handleToggleSidebar}
                  className="h-8 w-8 text-sidebar-foreground/40 hover:bg-sidebar-accent"
                >
                  <ChevronLeft size={16} />
                </Button>
              )}
              {isCollapsed && (
                <Button variant="ghost" size="icon"
                  onClick={handleToggleSidebar}
                  className="h-8 w-8 text-sidebar-foreground/40 hover:bg-sidebar-accent"
                >
                  <ChevronRight size={16} />
                </Button>
              )}
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