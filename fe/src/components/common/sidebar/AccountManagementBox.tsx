'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Loader2, Plus, Trash2, RefreshCw } from 'lucide-react';
import { createCompanyAccount, deleteCompany, getCurrentUser, switchAccountContext, toggleCompanyStatus } from '@/services/service';
import { CURRENCY_OPTIONS } from '@/services/interface/invoice';
import { getResolvedActiveCompanyId, getResolvedContextType, isSubUser, normalizeAvailableCompanies } from '@/utils/account-context';
import { getViewScope, setViewScope, ViewScope } from '@/utils/view-scope';
import { Switch } from '@/components/ui/switch';

type LinkedCompany = { id: number; company_name: string; is_active: boolean };

export function AccountManagementBox({
  className,
  dense = false,
  onAfterSwitch,
}: {
  className?: string;
  dense?: boolean;
  onAfterSwitch?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [switchingCompanyId, setSwitchingCompanyId] = useState<number | null>(null);
  const [togglingCompanyId, setTogglingCompanyId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deletingCompanyId, setDeletingCompanyId] = useState<number | null>(null);

  const [currentContextType, setCurrentContextType] = useState<'personal' | 'company'>('personal');
  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(null);
  const [personalLabel, setPersonalLabel] = useState<string>('Personal');
  const [linkedCompanies, setLinkedCompanies] = useState<LinkedCompany[]>([]);
  const [expandedAccountKey, setExpandedAccountKey] = useState<string | null>(null);
  const [viewScope, setViewScopeState] = useState<ViewScope>("current");
  const [accountType, setAccountType] = useState<string>('personal');

  const isPersonalAccount = accountType.toLowerCase() === 'personal' || accountType.toLowerCase() === 'super-admin' || accountType.toLowerCase() === 'super admin';
  const [userIsSubUser, setUserIsSubUser] = useState(false);
  const canCreateCompanies = currentContextType === 'personal' && isPersonalAccount && !userIsSubUser;

  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [addCompanyLoading, setAddCompanyLoading] = useState(false);
  const [addCompanySetup, setAddCompanySetup] = useState({
    company_name: '',
    business_email: '',
    company_address: '',
    company_currency: 'LKR',
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const me = await getCurrentUser();
      const userData = (me as any)?.data ?? me;
      if (!userData) return;

      const ctxType = getResolvedContextType(userData);
      setCurrentContextType(ctxType);
      setActiveCompanyId(getResolvedActiveCompanyId(userData));
      setAccountType(userData?.account_type ?? 'personal');
      setUserIsSubUser(isSubUser(userData));

      const label =
        `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim() ||
        userData?.email ||
        'Personal';
      setPersonalLabel(label);

      const companies = normalizeAvailableCompanies(
        Array.isArray(userData?.available_companies) ? userData.available_companies : []
      ).map((c) => ({
        id: c.id,
        company_name: c.company_name,
        is_active: c.is_active ?? true,
      }));
      setLinkedCompanies((prev) => {
        // Some responses right after create/switch can be temporarily partial.
        // In that case, keep previously known companies to avoid sidebar flicker/loss.
        if (ctxType === 'company' && prev.length > 0 && companies.length > 0 && companies.length < prev.length) {
          const merged = new Map<number, LinkedCompany>();
          prev.forEach((company) => merged.set(company.id, company));
          companies.forEach((company) => merged.set(company.id, company));
          return Array.from(merged.values());
        }

        if (ctxType === 'company' && prev.length > 0 && companies.length === 0) {
          return prev;
        }

        return companies;
      });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  const waitForContext = useCallback(
    async (target: { type: 'personal' | 'company'; companyId?: number | null }) => {
      for (let i = 0; i < 10; i++) {
        const me = await getCurrentUser().catch(() => null);
        const userData = (me as any)?.data ?? me;
        if (!userData) continue;
        const ctxType = getResolvedContextType(userData);
        const companyId = getResolvedActiveCompanyId(userData);
        const ok =
          target.type === 'personal'
            ? ctxType === 'personal'
            : ctxType === 'company' && companyId === (target.companyId ?? null);
        if (ok) return;
        await new Promise((r) => setTimeout(r, 140));
      }
    },
    []
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    setViewScopeState(getViewScope());
    const onScopeChange = (event: Event) => {
      const detail = (event as CustomEvent<{ scope?: ViewScope }>).detail;
      if (detail?.scope === "all" || detail?.scope === "current") {
        setViewScopeState(detail.scope);
        return;
      }
      setViewScopeState(getViewScope());
    };
    window.addEventListener("viewScopeChanged", onScopeChange);
    return () => window.removeEventListener("viewScopeChanged", onScopeChange);
  }, []);

  const handleSwitchToPersonal = async () => {
    try {
      setSwitchingCompanyId(-1);
      toast.info('Switching to personal account...');
      await switchAccountContext({ type: 'personal' });
      setViewScope('current');
      
      // Delay for premium animation feel
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (e: any) {
      setSwitchingCompanyId(null);
      toast.error(e?.response?.data?.message || 'Failed to switch context');
    }
  };

  const handleSwitchToCompany = async (companyId: number) => {
    try {
      setSwitchingCompanyId(companyId);
      toast.info('Switching to company account...');
      await switchAccountContext({ type: 'company', company_id: companyId });
      setViewScope('current');
      
      // Delay for premium animation feel
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (e: any) {
      setSwitchingCompanyId(null);
      toast.error(e?.response?.data?.message || 'Failed to switch company');
    }
  };

  const handleToggleCompany = async (companyId: number, nextActive: boolean) => {
    try {
      setTogglingCompanyId(companyId);
      await toggleCompanyStatus({ company_id: companyId, is_active: nextActive });
      await refresh();
      toast.success(nextActive ? 'Company activated' : 'Company deactivated');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update company status');
    } finally {
      setTogglingCompanyId(null);
    }
  };

  const handleDeleteCompany = async (companyId: number) => {
    try {
      setDeletingCompanyId(companyId);
      await deleteCompany({ company_id: companyId });
      await refresh();
      toast.success('Company deleted');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to delete company');
    } finally {
      setDeletingCompanyId(null);
      setDeleteConfirmId(null);
    }
  };

  const handleAddCompany = async () => {
    if (!addCompanySetup.company_name.trim()) return toast.error('Business name is required');
    if (!addCompanySetup.business_email.trim()) return toast.error('Business email is required');
    try {
      setAddCompanyLoading(true);
      toast.info('Creating company profile...');
      const created = await createCompanyAccount({
        company_name: addCompanySetup.company_name.trim(),
        business_email: addCompanySetup.business_email.trim(),
        company_currency: 'LKR',
        company_address: addCompanySetup.company_address.trim() || undefined,
      });
      const createdCompanyIdRaw = Number(
        (created as any)?.data?.current_context?.company_id ??
        (created as any)?.data?.active_company_id ??
        (created as any)?.data?.available_companies?.[0]?.id ??
        (created as any)?.data?.available_companies?.[0]?.company_id
      );
      const createdCompanyId =
        Number.isFinite(createdCompanyIdRaw) && createdCompanyIdRaw > 0 ? createdCompanyIdRaw : null;
      if (createdCompanyId) {
        await switchAccountContext({ type: 'company', company_id: createdCompanyId });
      }
      setAddCompanyOpen(false);
      setAddCompanySetup({ company_name: '', business_email: '', company_address: '', company_currency: 'LKR' });
      await refresh();
      toast.success('Company profile created');
      window.location.href = '/company?mode=company&setup_roles=1';
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to create company');
    } finally {
      setAddCompanyLoading(false);
    }
  };

  const headerSubtitle = useMemo(() => {
    if (currentContextType === 'company' && activeCompanyId) {
      const name = linkedCompanies.find((c) => c.id === activeCompanyId)?.company_name;
      return name ? `Current: ${name}` : 'Current: Company';
    }
    return `Current: ${personalLabel}`;
  }, [activeCompanyId, currentContextType, linkedCompanies, personalLabel]);

  const shouldShow = !userIsSubUser;

  if (!shouldShow) return null;

  return (
    <>
      {switchingCompanyId !== null && (
        <div className="fixed inset-0 z-[40] flex items-center justify-center bg-background/60 backdrop-blur-sm transition-all duration-300">
          <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-card border border-border shadow-2xl scale-110">
            <div className="relative">
              <RefreshCw className="w-10 h-10 text-primary animate-spin" />
              <div className="absolute inset-0 blur-lg bg-primary/20 animate-pulse rounded-full" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-foreground">Switching Account...</h3>
              <p className="text-sm text-muted-foreground mt-1">Updating your workspace context</p>
            </div>
          </div>
        </div>
      )}

      <div className={cn(
        'rounded-xl border border-border/60 bg-muted/30 shadow-sm transition-all duration-200',
        dense ? 'p-2.5' : 'p-4',
        className
      )}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-foreground/90 uppercase tracking-wider">Account Manager</h3>
            <p className="text-[10px] text-muted-foreground/80 truncate leading-tight">{headerSubtitle}</p>
          </div>
          {canCreateCompanies && linkedCompanies.length > 0 ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    type="button" 
                    size="icon" 
                    variant="outline" 
                    className="h-7 w-7 rounded-md bg-background hover:bg-primary hover:text-primary-foreground transition-colors" 
                    onClick={() => setAddCompanyOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Create Company</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <div className="h-7 w-7" /> // Spacer
          )}
        </div>

        {/* Global Scope Switcher — only for personal accounts with linked companies */}
        {isPersonalAccount && linkedCompanies.length > 0 && (
        <div className="mb-4 rounded-lg bg-background/50 border border-border/40 px-3 py-2.5 flex items-center justify-between gap-3 group hover:border-primary/30 transition-colors">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-foreground truncate">All-Accounts View</p>
            <p className="text-[10px] text-muted-foreground/80 truncate leading-tight">Unified data across all profiles</p>
          </div>
          <Switch
            checked={viewScope === "all"}
            className="scale-75 origin-right"
            onCheckedChange={(checked) => {
              const next = checked ? "all" : "current";
              setViewScope(next);
              setViewScopeState(next);
              setTimeout(() => { window.location.reload(); }, 100);
            }}
          />
        </div>
        )}

        <div className="space-y-1">
          {/* Personal Account Row */}
          {(() => {
            const isCurrent = currentContextType === 'personal' && !activeCompanyId;
            return (
              <div 
                className={cn(
                  "group relative flex items-center gap-3 p-2 rounded-lg transition-all duration-200",
                  isCurrent 
                    ? "bg-primary/10 ring-1 ring-primary/20" 
                    : "hover:bg-muted/50 cursor-pointer"
                )}
                onClick={isCurrent || switchingCompanyId !== null ? undefined : handleSwitchToPersonal}
              >
                <div className="relative shrink-0">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2",
                    isCurrent 
                      ? "bg-primary text-primary-foreground border-primary" 
                      : "bg-muted border-border text-muted-foreground"
                  )}>
                    {personalLabel.charAt(0).toUpperCase()}
                  </div>
                  {isCurrent && (
                    <div className="absolute -right-0.5 -bottom-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-background" />
                  )}
                </div>
                
                <div className="min-w-0 flex-1">
                  <p className={cn("text-xs font-bold truncate", isCurrent ? "text-primary" : "text-foreground")}>
                    {personalLabel}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{isPersonalAccount ? 'Personal Account' : 'Company Account'}</p>
                </div>

                {switchingCompanyId === -1 && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                )}
                
                {!isCurrent && switchingCompanyId === null && (
                  <span className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                    Switch
                  </span>
                )}
              </div>
            );
          })()}

          {/* Companies Section */}
          <div className="pt-3 pb-1">
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Companies</span>
              <div className="h-px flex-1 bg-border/40" />
            </div>
            
            <div className="space-y-1 overflow-y-auto max-h-[280px]">
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-2.5 w-24 bg-muted rounded" />
                      <div className="h-2 w-16 bg-muted rounded" />
                    </div>
                  </div>
                ))
              ) : linkedCompanies.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-[10px] text-muted-foreground italic">No companies connected</p>
                  {canCreateCompanies && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 h-7 text-[10px]"
                      onClick={() => setAddCompanyOpen(true)}
                    >
                      Create Company Profile
                    </Button>
                  )}
                </div>
              ) : (
                linkedCompanies.map((company) => {
                  const isCurrent = currentContextType === 'company' && activeCompanyId === company.id;
                  const isSwitching = switchingCompanyId === company.id;
                  
                  return (
                    <div 
                      key={company.id}
                      className={cn(
                        "group relative flex items-center gap-3 p-2 rounded-lg transition-all duration-200",
                        isCurrent 
                          ? "bg-primary/10 ring-1 ring-primary/20" 
                          : company.is_active 
                            ? "hover:bg-muted/50 cursor-pointer" 
                            : "opacity-60"
                      )}
                      onClick={isCurrent || !company.is_active || switchingCompanyId !== null ? undefined : () => handleSwitchToCompany(company.id)}
                    >
                      <div className="relative shrink-0">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 overflow-hidden",
                          isCurrent 
                            ? "bg-primary/20 border-primary text-primary" 
                            : "bg-muted border-border text-muted-foreground"
                        )}>
                          {company.company_name.charAt(0).toUpperCase()}
                        </div>
                        {isCurrent && (
                          <div className="absolute -right-0.5 -bottom-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-background" />
                        )}
                        {!company.is_active && !isCurrent && (
                          <div className="absolute inset-0 bg-background/40 flex items-center justify-center rounded-full">
                            <Trash2 className="w-4 h-4 text-muted-foreground/60" />
                          </div>
                        )}
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-xs font-bold truncate", isCurrent ? "text-primary" : "text-foreground")}>
                          {company.company_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          {company.is_active ? 'Business Profile' : 'Inactive'}
                        </p>
                      </div>

                      {isSwitching && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                      )}

                      {!isCurrent && company.is_active && switchingCompanyId === null && (
                        <span className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                          Switch
                        </span>
                      )}

                      {/* Management Actions (Secondary) */}
                      {!isCurrent && canCreateCompanies && (
                        <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm p-1 rounded-md shadow-sm">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-destructive hover:bg-destructive/10"
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(company.id); }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-amber-600 hover:bg-amber-50"
                            onClick={(e) => { e.stopPropagation(); handleToggleCompany(company.id, !company.is_active); }}
                          >
                            <RefreshCw className={cn("h-3 w-3", togglingCompanyId === company.id && "animate-spin")} />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={canCreateCompanies && addCompanyOpen} onOpenChange={(open) => setAddCompanyOpen(open)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Add Company Account</DialogTitle>
            <DialogDescription>Business name and email are required.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Business Name *</label>
                <Input
                  value={addCompanySetup.company_name}
                  onChange={(e) => setAddCompanySetup((p) => ({ ...p, company_name: e.target.value }))}
                  placeholder="Enter business name"
                  disabled={addCompanyLoading}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Business Email *</label>
                <Input
                  type="email"
                  value={addCompanySetup.business_email}
                  onChange={(e) => setAddCompanySetup((p) => ({ ...p, business_email: e.target.value }))}
                  placeholder="company@email.com"
                  disabled={addCompanyLoading}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Business Address</label>
              <Textarea
                value={addCompanySetup.company_address}
                onChange={(e) => setAddCompanySetup((p) => ({ ...p, company_address: e.target.value }))}
                placeholder="Business address (optional)"
                rows={2}
                disabled={addCompanyLoading}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Currency *</label>
              <Select
                value={addCompanySetup.company_currency || 'LKR'}
                onValueChange={(v) => setAddCompanySetup((p) => ({ ...p, company_currency: v }))}
                disabled={addCompanyLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.symbol} {c.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddCompanyOpen(false)} disabled={addCompanyLoading}>
              Cancel
            </Button>
            <Button type="button" onClick={handleAddCompany} disabled={addCompanyLoading}>
              {addCompanyLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Company'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => {
          if (!open && !deletingCompanyId) setDeleteConfirmId(null);
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Company Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">
                {linkedCompanies.find((c) => c.id === deleteConfirmId)?.company_name ?? 'this company'}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteConfirmId(null)} disabled={deletingCompanyId !== null}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingCompanyId !== null}
              onClick={() => deleteConfirmId && handleDeleteCompany(deleteConfirmId)}
            >
              {deletingCompanyId !== null ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Company'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

