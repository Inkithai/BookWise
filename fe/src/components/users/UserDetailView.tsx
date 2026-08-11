'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Save, X, User, Hash, Phone, Shield, Building2, CreditCard, CheckCircle2, XCircle } from 'lucide-react';
import { AdminUser } from '@/services/interface/AdminUser';
import { getAnalyticsUserById, activateUser, deactivateUser } from '@/services/service';
import { format } from 'date-fns';

interface UserDetailViewProps {
  userId: number;
}

function LabeledField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="group relative bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3.5 hover:border-primary/40 hover:shadow-sm transition-all duration-150">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
        {label}
      </p>
      <div className="text-sm font-medium text-foreground leading-snug">{value ?? <span className="text-muted-foreground/50">—</span>}</div>
    </div>
  );
}

function SectionBox({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/60">
        {icon && <span className="text-primary">{icon}</span>}
        <h3 className="font-semibold text-xs uppercase tracking-widest text-foreground">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function formatDate(dateStr?: string) {
  if (!dateStr) return 'N/A';
  try {
    return format(new Date(dateStr), 'MMM dd, yyyy HH:mm');
  } catch {
    return dateStr;
  }
}

export function UserDetailView({ userId }: UserDetailViewProps) {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountStatus, setAccountStatus] = useState<'active' | 'inactive'>('active');
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getAnalyticsUserById(userId);
        setUser(data);

        const isActive =
          data.is_active === 1 ||
          data.is_active === '1' ||
          (typeof data.is_active === 'string' && data.is_active.toLowerCase() === 'active') ||
          data.is_active_label?.toLowerCase() === 'active';
        setAccountStatus(isActive ? 'active' : 'inactive');
      } catch (err) {
        toast.error('Failed to load user details');
        router.push('/users');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId, router]);

  const handleUpdateStatus = async () => {
    if (!user) return;
    try {
      setSaving(true);
      setConfirmOpen(false);
      if (accountStatus === 'active') {
        await activateUser(user.id);
        toast.success('User activated successfully');
      } else {
        await deactivateUser(user.id);
        toast.success('User deactivated successfully');
      }
      // refresh
      const updated = await getAnalyticsUserById(userId);
      setUser(updated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update status';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground text-sm">Loading user details…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const fullName = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User';

  const isActive =
    user.is_active === 1 ||
    user.is_active === '1' ||
    (typeof user.is_active === 'string' && user.is_active.toLowerCase() === 'active') ||
    user.is_active_label?.toLowerCase() === 'active';

  const isOtpVerified =
    user.is_otp_verified === 1 ||
    user.is_otp_verified === '1' ||
    user.is_otp_verified_label?.toLowerCase() === 'verified';

  const roles = (() => {
    // Prefer string role from analytics
    if (user.role) return user.role;
    if (Array.isArray(user.roles) && user.roles.length > 0) {
      const names = user.roles
        .map((r) => {
          if (typeof r === 'object' && r !== null && 'name' in r) return (r as any).name;
          if (typeof r === 'string') return r;
          return null; // skip bare numbers
        })
        .filter(Boolean);
      if (names.length > 0) return names.join(', ');
    }
    return undefined; // will render as N/A via LabeledField
  })();

  const companyName = typeof user.company === 'string'
    ? user.company
    : user.company?.company_name || (user as any).company_name || null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Slim identity bar */}
      <div className="flex items-center gap-4 px-1 pt-1">
        {/* Avatar / initials */}
        <div className="shrink-0">
          {user.profile_img ? (
            <img
              src={user.profile_img}
              alt={fullName}
              className="h-11 w-11 rounded-full object-cover ring-2 ring-primary/30"
            />
          ) : (
            <div className="h-11 w-11 rounded-full bg-primary/10 ring-2 ring-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold text-base leading-none">
                {fullName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Name + email */}
        <div className="flex-1 min-w-0">
          <h1 className="text-4xl font-bold text-primary dark:text-white truncate leading-tight">{fullName}</h1>
          <p className="text-sm text-muted-foreground truncate mt-1">{user.email}</p>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
              isActive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {user.is_active_label || (isActive ? 'Active' : 'Inactive')}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
              isOtpVerified
                ? 'bg-teal-50 text-teal-700 border border-teal-200'
                : 'bg-muted text-muted-foreground border border-border'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isOtpVerified ? 'bg-teal-500' : 'bg-muted-foreground/40'}`} />
            OTP: {user.is_otp_verified_label || (isOtpVerified ? 'Verified' : 'N/A')}
          </span>
          {user.account_type && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/8 text-primary border border-primary/20 capitalize">
              {user.account_type}
            </span>
          )}
        </div>
      </div>

      {/* Basic Information */}
      <SectionBox title="Basic Information" icon={<User className="h-3.5 w-3.5" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LabeledField label="Host ID" value={
            <span className="inline-flex items-center gap-1 font-mono text-primary">
              <Hash className="h-3 w-3" />{user.id}
            </span>
          } />
          <LabeledField label="Username" value={user.user_name} />
          <LabeledField label="First Name" value={user.first_name} />
          <LabeledField label="Last Name" value={user.last_name} />
          <LabeledField label="Phone Number" value={
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-3 w-3 text-muted-foreground" />
              {user.phone_number || user.phone || '—'}
            </span>
          } />
          <LabeledField label="Role" value={
            roles ? (
              <span className="inline-flex items-center gap-1.5">
                <Shield className="h-3 w-3 text-muted-foreground" />
                <span className="capitalize">{roles}</span>
              </span>
            ) : undefined
          } />
        </div>
      </SectionBox>

      {/* Account & Verification */}
      <SectionBox title="Account & Verification" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LabeledField
            label="Account Status"
            value={
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-600 border border-red-200'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                {user.is_active_label || (isActive ? 'Active' : 'Inactive')}
              </span>
            }
          />
          <LabeledField
            label="OTP Verified"
            value={
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit ${
                isOtpVerified
                  ? 'bg-teal-50 text-teal-700 border border-teal-200'
                  : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isOtpVerified ? 'bg-teal-500' : 'bg-zinc-400'}`} />
                {user.is_otp_verified_label || (isOtpVerified ? 'Verified' : 'Not Verified')}
              </span>
            }
          />
          <LabeledField label="Account Type" value={
            user.account_type ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit bg-primary/8 text-primary border border-primary/20 capitalize">
                {user.account_type}
              </span>
            ) : undefined
          } />
        </div>
      </SectionBox>

      {/* Company & Plan */}
      {(companyName || user.team || user.plan) && (
        <SectionBox title="Company & Plan" icon={<Building2 className="h-3.5 w-3.5" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {companyName && <LabeledField label="Company" value={companyName} />}
            {user.company_id && <LabeledField label="Company ID" value={`#${user.company_id}`} />}
            {user.team && <LabeledField label="Team" value={user.team} />}
            {user.team_id && <LabeledField label="Team ID" value={`#${user.team_id}`} />}
            {user.plan?.name && (
              <LabeledField
                label="Plan"
                value={`${user.plan.name}${user.plan.formatted_price ? ` — ${user.plan.formatted_price}` : ''}`}
              />
            )}
            {user.plan?.currency && <LabeledField label="Currency" value={user.plan.currency} />}
          </div>
        </SectionBox>
      )}

      {/* Subscription Plan */}
      <SectionBox title="Subscription Plan" icon={<CreditCard className="h-3.5 w-3.5" />}>
        {user.plan?.name ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <LabeledField label="Plan Name" value={
              <span className="font-semibold text-primary">{user.plan.name}</span>
            } />
            {user.plan.formatted_price && (
              <LabeledField label="Price" value={user.plan.formatted_price} />
            )}
            {user.plan.currency && (
              <LabeledField label="Currency" value={user.plan.currency} />
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground/60 italic">No plan assigned</p>
        )}
      </SectionBox>

      {/* Update Account Status */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/60">
          <Shield className="h-3.5 w-3.5 text-primary" />
          <h3 className="font-semibold text-xs uppercase tracking-widest text-foreground">Update Account Status</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select
              value={accountStatus}
              onValueChange={(val) => setAccountStatus(val as 'active' | 'inactive')}
            >
              <SelectTrigger className="w-44 rounded-xl border-gray-200 dark:border-zinc-700 focus:ring-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                </SelectItem>
                <SelectItem value="inactive">
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    Inactive
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={saving}
              className="rounded-xl gap-2 px-5"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push('/users')}
              disabled={saving}
              className="rounded-xl gap-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* Confirm dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {accountStatus === 'active' ? 'Activate User' : 'Deactivate User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {accountStatus === 'active'
                ? 'Are you sure you want to activate this user? They will regain access to the system.'
                : 'Are you sure you want to deactivate this user? They will no longer be able to log in.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdateStatus}>
              {accountStatus === 'active' ? 'Activate' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
