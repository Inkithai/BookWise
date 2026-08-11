'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  AVAILABLE_PERMISSIONS,
  assignPermissionsToRole,
  changeCompanyDetails,
  createCompanyAccount,
  deleteCompany,
  getAccountContexts,
  getCurrentUser,
  getRoleWithPermissions,
  http,
  removeCompanyLogo,
  roleService,
  switchAccountContext,
  toggleCompanyStatus,
  validateImageFile
} from '@/services/service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Upload, X, Loader2, Building2, BanknoteIcon, Share2,
  FileText, CreditCard, Lock, Loader, User, AlertTriangle, Plus, Trash2,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/slices/store';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/slices/store';
import { setAuthUser, setFullUser } from '@/slices/authSlice';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTheme } from 'next-themes';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { CURRENCY_OPTIONS } from '@/services/interface/invoice';
import { useRouter, useSearchParams } from 'next/navigation';
import { getResolvedContextType, isSubUser, normalizeAvailableCompanies } from '@/utils/account-context';
import { canManageCompanyProfile as canManageCompanyProfileUtil, hasPermission, usePermissions } from '@/utils/permissions';
import { canAddAnotherBusiness, canUseFeature } from '@/lib/plan-access';
import { UPGRADE_PLAN_PATH } from '@/lib/subscription-routes';
import { formatImageUrl } from '@/utils/image-url';
import { saveBankDetailsToSync } from '@/utils/bank-details-sync';
import axios from 'axios';

// ─── Account Type ─────────────────────────────────────────────────────────────

type AccountType = 'company' | 'personal' | null;

// ─── Schemas ──────────────────────────────────────────────────────────────────

const companyFormSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  business_registration_number: z.string().optional().or(z.literal('')),
  years_in_business: z.coerce.number().min(0).optional(),
  office_hours: z.string().optional().or(z.literal('')),
  company_address: z.string().optional().or(z.literal('')),
  company_address_nr: z.string().optional().or(z.literal('')),
  company_address_street: z.string().optional().or(z.literal('')),
  company_address_city: z.string().optional().or(z.literal('')),
  company_address_town: z.string().optional().or(z.literal('')),
  company_address_postcode: z.string().optional().or(z.literal('')),
  company_address_county: z.string().optional().or(z.literal('')),
  company_address_country: z.string().optional().or(z.literal('')),
  business_email: z.string().email("Invalid email").optional().or(z.literal('')),
  account_name: z.string().optional().or(z.literal('')),
  account_number: z.string().optional().or(z.literal('')),
  sort_code: z.string().optional().or(z.literal('')),
  company_logo: z.instanceof(File).optional().or(z.literal('')).or(z.null()),
  partnerships: z.string().optional().or(z.literal('')),
  service_areas: z.string().optional().or(z.literal('')),
  company_currency: z.string().optional().or(z.literal('')),
  company_website: z.string().url("Invalid URL").optional().or(z.literal('')),
  social_media_links_facebook: z.string().url("Invalid URL").optional().or(z.literal('')),
  social_media_links_instagram: z.string().url("Invalid URL").optional().or(z.literal('')),
  social_media_links_linkedin: z.string().url("Invalid URL").optional().or(z.literal('')),
  social_media_links_twitter: z.string().url("Invalid URL").optional().or(z.literal('')),
  business_highlights: z.string().optional().or(z.literal('')),
  mission_statement: z.string().optional().or(z.literal('')),
  about_the_company: z.string().optional().or(z.literal('')),
  stripe_secret_key: z.string().optional().or(z.literal('')),
  stripe_published_key: z.string().optional().or(z.literal('')),
  vat_no: z.string().optional().or(z.literal('')),
  stripe_fee_percentage: z.coerce.number().max(100).optional(),
  stripe_fixed_fee: z.coerce.number().optional(),
  invoice_format: z.string().optional().or(z.literal('')),
});

const personalFormSchema = z.object({
  company_name: z.string().min(1, "Name is required"),
  company_currency: z.string().optional().or(z.literal('')),
  company_logo: z.instanceof(File).optional().or(z.literal('')).or(z.null()),
  account_name: z.string().optional().or(z.literal('')),
  account_number: z.string().optional().or(z.literal('')),
  sort_code: z.string().optional().or(z.literal('')),
  stripe_secret_key: z.string().optional().or(z.literal('')),
  stripe_published_key: z.string().optional().or(z.literal('')),
  social_media_links_facebook: z.string().url("Invalid URL").optional().or(z.literal('')),
  social_media_links_instagram: z.string().url("Invalid URL").optional().or(z.literal('')),
  social_media_links_linkedin: z.string().url("Invalid URL").optional().or(z.literal('')),
  social_media_links_twitter: z.string().url("Invalid URL").optional().or(z.literal('')),
  stripe_fee_percentage: z.coerce.number().max(100).optional(),
  stripe_fixed_fee: z.coerce.number().optional(),
  invoice_format: z.string().optional().or(z.literal('')),
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;
type PersonalFormValues = z.infer<typeof personalFormSchema>;

// ─── Payload interface ────────────────────────────────────────────────────────

interface CompanyPayload {
  company_name: string;
  business_registration_number?: string;
  years_in_business?: number;
  office_hours?: string;
  account_name?: string;
  company_address?: string;
  company_address_nr?: string;
  company_address_street?: string;
  company_address_city?: string;
  company_address_town?: string;
  company_address_postcode?: string;
  company_address_county?: string;
  company_address_country?: string;
  business_email?: string;
  account_number?: string;
  sort_code?: string;
  partnerships?: string;
  service_areas?: string;
  company_currency?: string;
  company_website?: string;
  social_media_links_facebook?: string;
  social_media_links_instagram?: string;
  social_media_links_linkedin?: string;
  social_media_links_twitter?: string;
  business_highlights?: string;
  mission_statement?: string;
  about_the_company?: string;
  stripe_secret_key?: string;
  stripe_published_key?: string;
  vat_no?: string;
  company_logo?: File;
  profile_img?: File;
  stripe_fixed_fee?: number;
  stripe_fee_percentage?: number;
  invoice_format?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const userHasAdminRole = (roles: string[] | undefined): boolean => {
  if (!roles || !Array.isArray(roles)) return false;
  return roles.some(
    r => typeof r === 'string' && ['admin', 'super-admin'].includes(r.toLowerCase())
  );
};

const resolveCompanyContextId = (userData: any): number | null => {
  const raw =
    userData?.current_context?.company_id ??
    userData?.active_company_id ??
    userData?.available_companies?.[0]?.id ??
    userData?.available_companies?.[0]?.company_id;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
};

// ─── Stripe Disconnect Dialog ─────────────────────────────────────────────────

function StripeDisconnectDialog({
  open,
  onOpenChange,
  disconnecting,
  onDisconnectAccount,
  onDisconnectPermanently,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disconnecting: boolean;
  onDisconnectAccount: () => void;
  onDisconnectPermanently: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!disconnecting) onOpenChange(o); }}>
      <DialogContent className="w-[95vw] max-w-lg rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            Disconnect Stripe Account
          </DialogTitle>
          <DialogDescription className="pt-1">
            Choose how you want to disconnect your Stripe account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Option 1 — Disconnect Account */}
          <div className="p-4 border border-border rounded-lg space-y-1">
            <p className="text-sm font-semibold text-foreground">Disconnect Account</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Unlinks your Stripe account from the platform. You can reconnect at any time. Your Stripe account and its data remain intact.
            </p>
          </div>

          {/* Option 2 — Disconnect Permanently */}
          <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30 rounded-lg space-y-1">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">Disconnect Permanently</p>
            <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
              Permanently removes all Stripe data and configuration. This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={disconnecting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={onDisconnectAccount}
            disabled={disconnecting}
            className="w-full sm:w-auto border-orange-300 text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
          >
            {disconnecting ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Disconnecting...</>
            ) : (
              'Disconnect Account'
            )}
          </Button>
          <Button
            variant="destructive"
            onClick={onDisconnectPermanently}
            disabled={disconnecting}
            className="w-full sm:w-auto"
          >
            {disconnecting ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Disconnecting...</>
            ) : (
              'Disconnect Permanently'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Shared Stripe Connect Block ──────────────────────────────────────────────

function StripeConnectCard({
  sectionRef,
  textColor,
  stripePaymentStatus,
  connecting,
  disconnecting,
  onConnect,
  onDisconnect,
  onDisconnectPermanently,          // ← new prop
  readOnly,
}: {
  sectionRef: React.RefObject<HTMLDivElement | null>;
  textColor: string;
  stripePaymentStatus: string | null;
  connecting: boolean;
  disconnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onDisconnectPermanently: () => void;  // ← new prop type
  readOnly?: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  // Soft disconnect — closes dialog then delegates to parent
  const handleDisconnectAccount = () => {
    setDialogOpen(false);
    onDisconnect();
  };

  // Permanent disconnect — closes dialog then delegates to parent
  const handleDisconnectPermanently = () => {
    setDialogOpen(false);
    onDisconnectPermanently();
  };

  return (
    <>
      <Card ref={sectionRef}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${textColor}`}>
            <CreditCard className={`h-5 w-5 ${textColor}`} />
            Payment Integration (Stripe)
          </CardTitle>
          <CardDescription>Connect to your Stripe account to enable payments</CardDescription>
        </CardHeader>
        <CardContent>
          {!stripePaymentStatus && <Loader />}

          {stripePaymentStatus === 'connected' && (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3">
              <span>Stripe Account Linked</span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => setDialogOpen(true)}
                  disabled={disconnecting}
                  className="text-green-700 underline hover:text-green-900 text-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                </button>
              )}
            </div>
          )}

          {stripePaymentStatus === 'disconnected' && !readOnly && (
            <button
              type="button"
              onClick={onConnect}
              disabled={connecting}
              className="flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 bg-[#635bff] hover:bg-[#0F766E] text-white font-medium text-sm py-2 px-4 rounded-sm transition-colors"
            >
              <CreditCard className="w-5 h-5" />
              Reconnect with Stripe
            </button>
          )}

          {stripePaymentStatus === 'permanently_disconnected' && !readOnly && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Stripe account deleted permanently. Connect a new account to accept payments.</span>
              </div>
              <button
                type="button"
                onClick={onConnect}
                disabled={connecting}
                className="flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 bg-[#635bff] hover:bg-[#0F766E] text-white font-medium text-sm py-2 px-4 rounded-sm transition-colors"
              >
                <CreditCard className="w-5 h-5" />
                Connect with Stripe
              </button>
            </div>
          )}

          {(stripePaymentStatus === 'not_connected' || stripePaymentStatus === 'incomplete') && !readOnly && (
            <button
              type="button"
              onClick={onConnect}
              disabled={connecting}
              className="flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 bg-[#635bff] hover:bg-[#0F766E] text-white font-medium text-sm py-2 px-4 rounded-sm transition-colors"
            >
              <CreditCard className="w-5 h-5" />
              Connect with Stripe
            </button>
          )}

          {(stripePaymentStatus === 'not_connected' || stripePaymentStatus === 'incomplete' || stripePaymentStatus === 'disconnected') && readOnly && (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 text-gray-600 rounded-lg px-4 py-3 text-sm">
              <CreditCard className="h-4 w-4 shrink-0" />
              <span>Stripe is not connected on this account.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog rendered outside Card to avoid nesting issues */}
      <StripeDisconnectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        disconnecting={disconnecting}
        onDisconnectAccount={handleDisconnectAccount}
        onDisconnectPermanently={handleDisconnectPermanently}
      />
    </>
  );
}

// ─── Personal Form ────────────────────────────────────────────────────────────

function PersonalDetailsForm({
  form,
  isSubmitting,
  logoPreview,
  onLogoChange,
  onRemoveLogo,
  stripePaymentStatus,
  connecting,
  disconnecting,
  onConnect,
  onDisconnect,
  onDisconnectPermanently,          // ← new prop
  sectionRef,
  textColor,
  onSubmit,
  readOnly,
}: {
  form: ReturnType<typeof useForm<PersonalFormValues>>;
  isSubmitting: boolean;
  logoPreview: string | null;
  onLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveLogo: () => void;
  stripePaymentStatus: string | null;
  connecting: boolean;
  disconnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onDisconnectPermanently: () => void;  // ← new prop type
  sectionRef: React.RefObject<HTMLDivElement | null>;
  textColor: string;
  onSubmit: (values: PersonalFormValues) => Promise<void>;
  readOnly?: boolean;
}) {
  const logoInputRef = useRef<HTMLInputElement>(null);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {readOnly && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              You can view these details, but only the primary account holder can edit them.
            </AlertDescription>
          </Alert>
        )}
        <fieldset disabled={readOnly || isSubmitting} className="space-y-6 border-0 p-0 m-0 disabled:opacity-70">

          {/* Branding Photo */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${textColor}`}>
                <User className={`h-5 w-5 ${textColor}`} />
                Branding
              </CardTitle>
              <CardDescription>Upload your logo and establish your brand identity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <div className="relative">
                    <img src={logoPreview} alt="Profile" className="h-24 w-24 object-cover rounded-full border border-border" />
                    <Button type="button" variant="destructive" size="sm" className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={onRemoveLogo} disabled={isSubmitting}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="h-24 w-24 border-2 border-dashed rounded-full flex items-center justify-center text-muted-foreground bg-muted/50">
                    <Upload className="h-6 w-6" />
                  </div>
                )}
                <div className="flex-1">
                  <input ref={logoInputRef} type="file" accept="image/jpeg,image/jpg,image/png" onChange={onLogoChange} className="hidden" />
                  <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={isSubmitting}>
                    <Upload className="h-4 w-4 mr-2" /> Choose Photo
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">JPEG or PNG, maximum 2MB</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${textColor}`}>
                <FileText className={`h-5 w-5 ${textColor}`} />
                Basic Information
              </CardTitle>
              <CardDescription>Your name, and currency</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="company_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} disabled={isSubmitting} placeholder="Your full name" className="bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="company_currency" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Currency</FormLabel>
                    <FormControl>
                      <Select value={field.value || ''} onValueChange={field.onChange} disabled={isSubmitting}>
                        <SelectTrigger className="h-10 text-sm bg-background text-foreground border-border w-full">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-border max-h-[200px]">
                          {CURRENCY_OPTIONS.map((c) => (
                            <SelectItem key={c.value} value={c.value} className="text-foreground hover:bg-muted">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{c.symbol}</span>
                                <span>{c.value}</span>
                                <span className="text-xs text-muted-foreground ml-auto">{c.label.split(' - ')[1]}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* <FormField control={form.control} name="invoice_format" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-foreground">Invoice Number Format</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} disabled={isSubmitting} placeholder="e.g., INV-{YYYY}-{0001}" className="bg-background" />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use placeholders: {`{YYYY}`} for year, {`{MM}`} for month, {`{0001}`} for sequential number
                    </p>
                  </FormItem>
                )} /> */}
              </div>
            </CardContent>
          </Card>

          {/* Bank Details */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${textColor}`}>
                <BanknoteIcon className={`h-5 w-5 ${textColor}`} />
                Bank Details
              </CardTitle>
              <CardDescription>Your personal bank account information (optional)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {([
                  { name: 'account_name' as const, label: 'Account Name', placeholder: 'Account holder name' },
                  { name: 'account_number' as const, label: 'Account Number', placeholder: 'Account number', inputMode: 'numeric' as const },
                  { name: 'sort_code' as const, label: 'Sort Code', placeholder: '00-11-22', inputMode: 'numeric' as const },
                ]).map(({ name, label, placeholder, inputMode }) => (
                  <FormField key={name} control={form.control} name={name} render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">{label}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} disabled={isSubmitting} placeholder={placeholder} inputMode={inputMode} className="bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Stripe Connect */}
          <StripeConnectCard
            sectionRef={sectionRef}
            textColor={textColor}
            stripePaymentStatus={stripePaymentStatus}
            connecting={connecting}
            disconnecting={disconnecting}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
            onDisconnectPermanently={onDisconnectPermanently}
            readOnly={readOnly}
          />

          {/* Stripe Fee Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${textColor}`}>
                <CreditCard className={`h-5 w-5 ${textColor}`} />
                Stripe Fee Configuration (Optional)
              </CardTitle>
              <CardDescription>Configure how much Stripe fee should be added to customer payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="stripe_fee_percentage" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Stripe Fee Percentage (%)</FormLabel>
                    <FormControl>
                      <Input type="number" max="100" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value)} disabled={isSubmitting} placeholder="e.g. 2.9" className="bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="stripe_fixed_fee" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Stripe Fixed Fee</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value)} disabled={isSubmitting} placeholder="e.g. 0" className="bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Example: If invoice is 100 and fee is 2.9% + 0, system can calculate how much to charge customer so you receive exactly 100.
              </p>
            </CardContent>
          </Card>

          {/* Social Media */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${textColor}`}>
                <Share2 className={`h-5 w-5 ${textColor}`} />
                Social Media Links
              </CardTitle>
              <CardDescription>Add your personal social media profiles (optional)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {([
                  { name: 'social_media_links_facebook' as const, label: 'Facebook', placeholder: 'https://facebook.com/yourprofile' },
                  { name: 'social_media_links_instagram' as const, label: 'Instagram', placeholder: 'https://instagram.com/yourprofile' },
                  { name: 'social_media_links_linkedin' as const, label: 'LinkedIn', placeholder: 'https://linkedin.com/in/yourprofile' },
                  { name: 'social_media_links_twitter' as const, label: 'Twitter', placeholder: 'https://twitter.com/yourprofile' },
                ]).map(({ name, label, placeholder }) => (
                  <FormField key={name} control={form.control} name={name} render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">{label}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} disabled={isSubmitting} placeholder={placeholder} type="url" inputMode="url" className="bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                ))}
              </div>
            </CardContent>
          </Card>

          {!readOnly && (
            <div className="sticky bottom-4 bg-background/95 backdrop-blur-sm rounded-lg p-4 flex justify-end gap-2 pt-6 mt-8 z-10 shadow-lg border">
              <Button type="submit" disabled={isSubmitting} className="min-w-32" size="lg">
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Personal Details'}
              </Button>
            </div>
          )}
        </fieldset>
      </form>
    </Form>
  );
}

// ─── Main CompanyForm Component ───────────────────────────────────────────────

export function CompanyForm() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStageLabel, setSubmitStageLabel] = useState('Saving company details...');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>(null);
  const [stripePaymentStatus, setStripePaymentStatus] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [companyProfileReadOnly, setCompanyProfileReadOnly] = useState(false);
  const [hasCompanyProfile, setHasCompanyProfile] = useState(false);
  const [linkedCompanies, setLinkedCompanies] = useState<Array<{ id: number; company_name: string; is_active: boolean }>>([]);
  const [switchingToCompany, setSwitchingToCompany] = useState<number | null>(null);
  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [togglingCompanyId, setTogglingCompanyId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deletingCompanyId, setDeletingCompanyId] = useState<number | null>(null);
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [addCompanyLoading, setAddCompanyLoading] = useState(false);
  const [addCompanySetup, setAddCompanySetup] = useState({ company_name: '', business_email: '', company_address: '', company_currency: 'LKR' });
  const [roleSetupOpen, setRoleSetupOpen] = useState(false);
  const [roleSetupLoading, setRoleSetupLoading] = useState(false);
  const [rolesSearch, setRolesSearch] = useState('');
  const [rolesList, setRolesList] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedRoleName, setSelectedRoleName] = useState('');
  const [currentRolePermissions, setCurrentRolePermissions] = useState<string[]>([]);
  const [pendingPermissionChanges, setPendingPermissionChanges] = useState<Record<string, boolean>>({});
  const [permissionsSearch, setPermissionsSearch] = useState('');
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [creatingRole, setCreatingRole] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const { theme } = useTheme();
  const textColor = theme === 'dark' ? 'text-white' : 'text-primary';
  const sectionRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const { canManage } = usePermissions();
  const [userIsSubUser, setUserIsSubUser] = useState(false);
  const canCreateCompanies = accountType === 'personal' && !userIsSubUser;

  const extractRoleIdFromAction = (action: string): number => {
    const match = action.match(/data-id="(\d+)"/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const groupedPermissions = AVAILABLE_PERMISSIONS.reduce<Record<string, Array<{ name: string; description: string; enabled: boolean }>>>(
    (acc, permission) => {
      const isEnabledFromServer = currentRolePermissions.includes(permission.name);
      const enabled = pendingPermissionChanges[permission.name] !== undefined
        ? pendingPermissionChanges[permission.name]
        : isEnabledFromServer;

      if (!acc[permission.category]) acc[permission.category] = [];
      acc[permission.category].push({
        name: permission.name,
        description: permission.description,
        enabled,
      });
      return acc;
    },
    {}
  );

  const filteredPermissionCategories = Object.entries(groupedPermissions).filter(([category, permissions]) => {
    const q = permissionsSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      category.toLowerCase().includes(q) ||
      permissions.some((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
    );
  });

  const hasPendingPermissionChanges = Object.keys(pendingPermissionChanges).length > 0;

  const loadRolesForPopup = async (preferRoleId?: number) => {
    setRoleSetupLoading(true);
    try {
      const res = await roleService.getRoles({ search: rolesSearch || undefined, draw: 1, start: 0, length: 100 });
      const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
      const mapped = rows
        .map((row: any) => {
          const id = Number(row?.id) || extractRoleIdFromAction(String(row?.action ?? ''));
          if (!Number.isFinite(id) || id <= 0) return null;
          return { id, name: row?.name || `Role ${id}` };
        })
        .filter(Boolean) as Array<{ id: number; name: string }>;

      setRolesList(mapped);

      const targetRole =
        (preferRoleId ? mapped.find((r) => r.id === preferRoleId) : null) ||
        (selectedRoleId ? mapped.find((r) => r.id === selectedRoleId) : null) ||
        mapped[0] ||
        null;

      setSelectedRoleId(targetRole?.id ?? null);
      setSelectedRoleName(targetRole?.name ?? '');
      setPendingPermissionChanges({});
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load company roles');
    } finally {
      setRoleSetupLoading(false);
    }
  };

  const loadPermissionsForRole = async (roleId: number) => {
    setRoleSetupLoading(true);
    try {
      const response = await getRoleWithPermissions(roleId);
      const perms = Array.isArray(response?.data?.permissions) ? response.data.permissions : [];
      setCurrentRolePermissions(perms);
      setPendingPermissionChanges({});
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load role permissions');
      setCurrentRolePermissions([]);
    } finally {
      setRoleSetupLoading(false);
    }
  };

  const handleCreateRoleInPopup = async () => {
    const name = newRoleName.trim();
    if (!name) {
      toast.error('Role name is required');
      return;
    }
    // Frontend duplicate check
    if (rolesList.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
      toast.error(`A role named "${name}" already exists`);
      return;
    }
    try {
      setCreatingRole(true);
      const created = await roleService.createRole({ name });
      const createdId = Number(created?.data?.data?.id);
      setNewRoleName('');
      toast.success('Role created');
      await loadRolesForPopup(Number.isFinite(createdId) ? createdId : undefined);
    } catch (error: any) {
      const errData = error?.response?.data;
      const validationErrors = errData?.errors;
      if (validationErrors && typeof validationErrors === 'object') {
        const messages = Object.values(validationErrors).flat().join(' ');
        toast.error(messages || 'Failed to create role');
      } else {
        toast.error(errData?.message || 'Failed to create role');
      }
    } finally {
      setCreatingRole(false);
    }
  };

  const handleSaveRolePermissions = async () => {
    if (!selectedRoleId) return;
    try {
      setSavingPermissions(true);
      const finalPermissions = AVAILABLE_PERMISSIONS
        .filter((permission) => {
          if (pendingPermissionChanges[permission.name] !== undefined) {
            return pendingPermissionChanges[permission.name];
          }
          return currentRolePermissions.includes(permission.name);
        })
        .map((permission) => permission.name);

      await assignPermissionsToRole(selectedRoleId, { permissions: finalPermissions });
      setCurrentRolePermissions(finalPermissions);
      setPendingPermissionChanges({});
      toast.success(`Permissions updated for "${selectedRoleName}"`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update permissions');
    } finally {
      setSavingPermissions(false);
    }
  };

  // ── Stripe handlers ──────────────────────────────────────────────────────

  const handleConnectLink = async () => {
    if (accountType === 'company' && companyProfileReadOnly) {
      toast.error('Only the primary account holder can connect Stripe for this company.');
      return;
    }
    if (!canUseFeature(user, 'accept_online_payments')) {
      toast.error('Accept online payments is available on Business Premium and Enterprise. Upgrade your plan to connect Stripe.');
      router.push(UPGRADE_PLAN_PATH);
      return;
    }
    if (stripePaymentStatus === 'connected') return;
    setConnecting(true);
    try {
      const res = await http.post('admin/stripe/connect');
      const redirectLink = res.data?.link || res.data?.url;
      if (redirectLink) {
        location.href = redirectLink;
        return;
      }
      toast.error('Stripe connect link was not returned. Please try again.');
    } catch (e) {
      const data = axios.isAxiosError(e) ? e.response?.data as { message?: string; error?: string } | undefined : undefined;
      const apiMessage = data?.message || data?.error;
      toast.error(apiMessage || "Failed to connect to Stripe. Please try again.");
    } finally {
      setConnecting(false);
    }
  };

  // ── Soft disconnect — unlinks account, reconnectable ────────────────────
  const handleDisconnectStripe = async () => {
    if (accountType === 'company' && companyProfileReadOnly) {
      toast.error('Only the primary account holder can disconnect Stripe for this company.');
      return;
    }
    if (stripePaymentStatus === 'not_connected' || stripePaymentStatus === 'permanently_disconnected') return;
    setDisconnecting(true);
    try {
      await http.delete('admin/stripe/disconnect');
      toast.success("Stripe account unlinked successfully. You can reconnect at any time.");
      // Re-fetch to sync status from backend
      const refreshed = await getCurrentUser();
      const me = (refreshed as any)?.data ?? refreshed;
      if (me?.stripe?.status) setStripePaymentStatus(me.stripe.status);
      else setStripePaymentStatus('disconnected');
      if (me) { dispatch(setAuthUser(me)); dispatch(setFullUser(me)); }
    } catch (e) {
      toast.error("Failed to disconnect Stripe account. Please try again.");
    } finally {
      setDisconnecting(false);
    }
  };

  // ── Permanent disconnect — removes all Stripe data ───────────────────────
  const handleDisconnectStripePermanently = async () => {
    if (stripePaymentStatus === 'not_connected' || stripePaymentStatus === 'permanently_disconnected') return;
    setDisconnecting(true);
    try {
      const res = await http.delete('admin/stripe/disconnect-permanently');
      toast.success(res.data?.message || "Stripe account permanently deleted and disconnected.");
      // Re-fetch to sync status from backend
      const refreshed = await getCurrentUser();
      const me = (refreshed as any)?.data ?? refreshed;
      if (me?.stripe?.status) setStripePaymentStatus(me.stripe.status);
      else setStripePaymentStatus('permanently_disconnected');
      if (me) { dispatch(setAuthUser(me)); dispatch(setFullUser(me)); }
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message;
      if (status === 400) {
        toast.warning(msg || 'No Stripe account connected to delete.');
      } else if (status === 500) {
        toast.error(msg || 'Stripe API failed to delete the account. Please try again later.');
      } else {
        toast.error(msg || 'Failed to permanently disconnect Stripe. Please try again.');
      }
    } finally {
      setDisconnecting(false);
    }
  };

  // ── Scroll to stripe on ?stripe param ───────────────────────────────────

  useEffect(() => {
    if (searchParams.get('stripe') && sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  // ── Admin check ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated || !user) { setHasAdminAccess(false); setIsLoading(false); return; }
    setHasAdminAccess(userHasAdminRole(user.roles));
    setIsLoading(false);
  }, [isAuthenticated, user]);

  // ── Forms ────────────────────────────────────────────────────────────────

  const companyForm = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema) as any,
    defaultValues: {
      company_name: '', company_address: '', business_email: '',
      business_registration_number: '', years_in_business: 0, office_hours: '',
      company_address_nr: '', company_address_street: '', company_address_city: '',
      company_address_town: '', company_address_postcode: '', company_address_county: '', company_address_country: '',
      account_name: '', account_number: '', sort_code: '', partnerships: '',
      service_areas: '', company_currency: '', company_website: '',
      social_media_links_facebook: '', social_media_links_instagram: '',
      social_media_links_linkedin: '', social_media_links_twitter: '',
      business_highlights: '', mission_statement: '', about_the_company: '',
      stripe_secret_key: '', stripe_published_key: '', company_logo: undefined,
      vat_no: '', stripe_fee_percentage: 0, stripe_fixed_fee: 0, invoice_format: '',
    },
  });

  const personalForm = useForm<PersonalFormValues>({
    resolver: zodResolver(personalFormSchema) as any,
    defaultValues: {
      company_name: '', company_currency: '', company_logo: undefined,
      account_name: '', account_number: '', sort_code: '',
      stripe_secret_key: '', stripe_published_key: '',
      social_media_links_facebook: '', social_media_links_instagram: '',
      social_media_links_linkedin: '', social_media_links_twitter: '',
      stripe_fee_percentage: 0, stripe_fixed_fee: 0, invoice_format: '',
    },
  });

  // ── Load data ────────────────────────────────────────────────────────────

  const loadCompanyData = async (forceCompany = false) => {
    if (!isAuthenticated) return;
    // Sub-users (hasAdminAccess = false) can still VIEW company data in read-only mode.
    console.log('[CompanyForm] loadCompanyData start', {
      forceCompany,
      urlMode: searchParams.get('mode'),
      isAuthenticated,
      hasAdminAccess,
      accountType,
    });
    try {
      const rawResponse = await http.get('admin/auth/me', {
        // Always bust cache — dev proxies and browsers cache /auth/me aggressively,
        // causing stale Stripe status, bank details and logo after saves/redirects.
        params: { _t: Date.now() },
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
      });
      const userData = rawResponse.data;
      if (!userData?.data) { toast.error('Failed to load user data'); return; }
      const u = userData.data;

      console.log('[CompanyForm] fetched user data from /auth/me', {
        userDataKeys: Object.keys(u),
        uCompanyKeys: u.company ? Object.keys(u.company) : null,
        uCompanyAddress: u.company?.company_address,
        uCompanyAddressNr: u.company?.company_address_nr,
        uCompanyAddressStreet: u.company?.company_address_street,
        uCompanyAddressCity: u.company?.company_address_city,
        uCompanyAddressTown: u.company?.company_address_town,
        uCompanyAddressPostcode: u.company?.company_address_postcode,
        uCompanyAddressCounty: u.company?.company_address_county,
        uCompanyAddressCountry: u.company?.company_address_country,
        uCompanyName: u.company?.company_name,
        uBusinessEmail: u.company?.business_email,
      });

      setStripePaymentStatus(u.stripe?.status || 'not_connected');

      const forceCompanyMode = forceCompany || searchParams.get('mode') === 'company';
      const contextType = getResolvedContextType(u);
      const profileExists = Boolean(
        u?.company?.company_name ||
        u?.company_id ||
        u?.active_company_id ||
        (Array.isArray(u?.available_companies) && u.available_companies.length > 0)
      );
      setHasCompanyProfile(profileExists);

      const rawCompanies = Array.isArray(u?.available_companies) ? u.available_companies : [];
      setLinkedCompanies(
        normalizeAvailableCompanies(rawCompanies).map((c) => ({
          id: c.id,
          company_name: c.company_name,
          is_active: c.is_active ?? false,
        }))
      );

      const activeId = Number(u?.current_context?.company_id ?? u?.active_company_id);
      const activeCompany = Number.isFinite(activeId) && activeId > 0
        ? rawCompanies.find((c: any) => Number(c?.id ?? c?.company_id) === activeId)
        : null;

      const userIsSub = isSubUser(u);
      // Sub-users always operate under their parent's company profile.
      // Force company mode so the full company form is shown (not personal),
      // regardless of the sub-user's own account_type value.
      const effectiveForceCompany = forceCompanyMode || userIsSub;

      const savedType: AccountType = effectiveForceCompany
        ? 'company'
        : (contextType === 'company' || contextType === 'personal')
          ? contextType
          : profileExists ? 'company' : 'personal';
      setAccountType(savedType);
      setUserIsSubUser(userIsSub);
      console.log('[CompanyForm] resolved company state', {
        contextType,
        profileExists,
        activeId,
        activeCompany,
        userIsSub,
        forceCompanyMode,
        effectiveForceCompany,
        savedType,
        availableCompaniesCount: rawCompanies.length,
      });
      if (savedType !== 'personal' && addCompanyOpen) {
        setAddCompanyOpen(false);
      }
      // Read-only if in company context AND user cannot edit:
      //   - Owners/admins (can_manage_company_profile = true) → always editable
      //   - ALL sub-users → always read-only (view only), regardless of permissions
      const canEditCompanyDetails = canManageCompanyProfileUtil(u) && !isSubUser(u);
      setCompanyProfileReadOnly(savedType === 'company' && !canEditCompanyDetails);

      // ── Resolve the richest company data source ───────────────────────────
      // targetCompany: from available_companies (basic fields) or u.company (full parent profile)
      // companySource: u.company is ALWAYS the parent's full profile (set by backend for sub-users)
      const targetCompany = savedType === 'company' ? (activeCompany || u.company) : null;
      // u.company is populated from the host owner's HostUserDetail records — authoritative for sub-users
      const companySource = u.company || targetCompany;

      const rawYears = companySource?.years_in_business ?? targetCompany?.years_in_business;
      const yearsInBusiness = rawYears != null
        ? (typeof rawYears === 'string' ? parseInt(rawYears, 10) || 0 : rawYears)
        : 0;

      const shared = {
        company_name:
          savedType === 'personal'
            ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || ''
            : companySource?.company_name ||
            targetCompany?.company_name ||
            targetCompany?.name ||
            u?.current_context?.company_name ||
            '',
        company_currency: companySource?.company_currency || targetCompany?.company_currency || '',
        // Bank: u.bank is resolved by backend from parent's records for sub-users
        account_name: companySource?.account_name || targetCompany?.account_name || u.bank?.account_name || '',
        account_number: companySource?.account_number || targetCompany?.account_number || u.bank?.account_number || '',
        sort_code: companySource?.sort_code || targetCompany?.sort_code || u.bank?.sort_code || '',
        stripe_secret_key: targetCompany?.stripe_secret_key || u.stripe?.secret_key || '',
        stripe_published_key: targetCompany?.stripe_published_key || u.stripe?.publish_key || '',
        // Social links: u.social_links is resolved by backend from parent's records for sub-users
        social_media_links_facebook: u.social_links?.facebook || companySource?.social_links?.facebook || companySource?.social_media_links_facebook || targetCompany?.social_media_links_facebook || '',
        social_media_links_instagram: u.social_links?.instagram || companySource?.social_links?.instagram || companySource?.social_media_links_instagram || targetCompany?.social_media_links_instagram || '',
        social_media_links_linkedin: u.social_links?.linkedin || companySource?.social_links?.linkedin || companySource?.social_media_links_linkedin || targetCompany?.social_media_links_linkedin || '',
        social_media_links_twitter: u.social_links?.twitter || companySource?.social_links?.twitter || companySource?.social_media_links_twitter || targetCompany?.social_media_links_twitter || '',
        stripe_fee_percentage: targetCompany?.stripe?.stripe_fee_percentage ?? u.stripe?.stripe_fee_percentage ?? 0,
        stripe_fixed_fee: targetCompany?.stripe?.stripe_fixed_fee ?? u.stripe?.stripe_fixed_fee ?? 0,
      };
      console.log('[CompanyForm] companySource / targetCompany', {
        companySourceKeys: companySource ? Object.keys(companySource) : null,
        targetCompanyKeys: targetCompany ? Object.keys(targetCompany) : null,
        companySourceAddress: companySource?.company_address,
        targetCompanyAddress: targetCompany?.company_address,
        companySourceLegal: companySource?.company_name,
        targetCompanyLegal: targetCompany?.company_name,
      });

      companyForm.reset({
        ...shared,
        company_address: companySource?.company_address ?? '',
        company_address_nr: companySource?.company_address_nr ?? '',
        company_address_street: companySource?.company_address_street ?? '',
        company_address_city: companySource?.company_address_city ?? '',
        company_address_town: companySource?.company_address_town ?? '',
        company_address_postcode: companySource?.company_address_postcode ?? '',
        company_address_county: companySource?.company_address_county ?? '',
        company_address_country: companySource?.company_address_country ?? '',
        business_email: companySource?.business_email ?? '',
        business_registration_number: companySource?.business_registration_number || '',
        years_in_business: yearsInBusiness,
        office_hours: companySource?.office_hours || '',
        partnerships: companySource?.partnerships || '',
        service_areas: companySource?.service_areas || '',
        company_website: companySource?.company_website || '',
        business_highlights: companySource?.business_highlights || '',
        mission_statement: companySource?.mission_statement || '',
        about_the_company: companySource?.about_the_company || '',
        vat_no: companySource?.vat_no || '',
        invoice_format: companySource?.invoice_format || '',
        company_logo: undefined,
      });

      personalForm.reset({ ...shared, company_logo: undefined });
      console.log('[CompanyForm] form values after reset', {
        companyAddress: companySource?.company_address,
        companyAddressNr: companySource?.company_address_nr,
        companyAddressStreet: companySource?.company_address_street,
        companyAddressCity: companySource?.company_address_city,
        companyAddressTown: companySource?.company_address_town,
        companyAddressPostcode: companySource?.company_address_postcode,
        companyAddressCounty: companySource?.company_address_county,
        companyAddressCountry: companySource?.company_address_country,
        businessEmail: companySource?.business_email,
        companyName: shared.company_name,
      });

      // Sync bank details to localStorage when loading existing data
      // This ensures the InvoiceForm can detect bank details even if the user hasn't re-saved recently
      if (shared.account_name && shared.account_number && shared.sort_code) {
        saveBankDetailsToSync({
          account_name: shared.account_name,
          account_number: shared.account_number,
          sort_code: shared.sort_code,
        });
      }

      // Logo: try u.company first (richest source), then activeCompany from available_companies
      const logoSource = savedType === 'personal'
        ? u.profile_img
        : (companySource?.company_logo || targetCompany?.company_logo || null);
      if (logoSource) {
        const formattedLogo = formatImageUrl(logoSource);
        if (formattedLogo) {
          setLogoPreview(`${formattedLogo}?t=${Date.now()}`);
        } else {
          setLogoPreview(null);
        }
      } else {
        setLogoPreview(null);
      }

      setFormKey((prev) => prev + 1);
      // Keep Redux store in sync so sidebar, other pages and Stripe button
      // all reflect the freshly loaded data without requiring a full page reload.
      dispatch(setAuthUser(u));
      dispatch(setFullUser(u));
    } catch (err) {
      console.error('Failed to load details:', err);
      toast.error('Failed to load details');
    }
  };

  useEffect(() => {
    loadCompanyData();
  }, [isAuthenticated, hasAdminAccess, searchParams]);

  useEffect(() => {
    const handleContextChange = () => {
      loadCompanyData(true);
    };
    window.addEventListener('account-context-changed', handleContextChange);
    return () => window.removeEventListener('account-context-changed', handleContextChange);
  }, [loadCompanyData]);

  // ── Logo (shared) ────────────────────────────────────────────────────────

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (accountType === 'company' && companyProfileReadOnly) {
      toast.error('Only the primary account holder can change the company logo.');
      e.target.value = '';
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImageFile(file);
    if (!validation.valid) { toast.error(validation.error); e.target.value = ''; return; }
    setLogoFile(file);
    companyForm.setValue('company_logo', file);
    personalForm.setValue('company_logo', file);
    if (logoPreview?.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
    setLogoPreview(URL.createObjectURL(file));
  };

  const removeLogo = async () => {
    if (accountType === 'company' && companyProfileReadOnly) {
      toast.error('Only the primary account holder can remove the company logo.');
      return;
    }
    const isServerLogo = logoPreview && !logoPreview.startsWith('blob:');
    if (isServerLogo) {
      try {
        setIsSubmitting(true);
        await removeCompanyLogo();
        setLogoPreview(null); setLogoFile(null);
        companyForm.setValue('company_logo', null);
        personalForm.setValue('company_logo', null);
        // Refresh Redux store so sidebar/avatar updates immediately
        const refreshed = await getCurrentUser();
        const me = (refreshed as any)?.data ?? refreshed;
        if (me) { dispatch(setAuthUser(me)); dispatch(setFullUser(me)); }
        toast.success('Logo removed successfully');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to remove logo');
      } finally { setIsSubmitting(false); }
    } else {
      if (logoPreview?.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
      setLogoFile(null); setLogoPreview(null);
      companyForm.setValue('company_logo', null);
      personalForm.setValue('company_logo', null);
    }
  };

  useEffect(() => {
    return () => { if (logoPreview?.startsWith('blob:')) URL.revokeObjectURL(logoPreview); };
  }, [logoPreview]);

  useEffect(() => {
    if (accountType === 'company' && searchParams.get('setup_roles') === '1') {
      setRoleSetupOpen(true);
    }
  }, [accountType, searchParams]);

  useEffect(() => {
    if (roleSetupOpen) {
      loadRolesForPopup();
    }
  }, [roleSetupOpen, rolesSearch]);

  useEffect(() => {
    if (roleSetupOpen && selectedRoleId) {
      const role = rolesList.find((r) => r.id === selectedRoleId);
      if (role) setSelectedRoleName(role.name);
      loadPermissionsForRole(selectedRoleId);
    }
  }, [roleSetupOpen, selectedRoleId]);

  // Mobile scroll progress indicator
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
      setScrollProgress(progress);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Helpers to refresh linked companies list ──────────────────────────────

  const refreshLinkedCompanies = async () => {
    const refreshed = await http.get('admin/auth/me', { params: { _t: Date.now() }, headers: { 'Cache-Control': 'no-cache' } });
    const data = refreshed?.data?.data;
    const companies = normalizeAvailableCompanies(
      Array.isArray(data?.available_companies) ? data.available_companies : []
    ).map((c) => ({
      id: c.id,
      company_name: c.company_name,
      is_active: c.is_active ?? false,
    }));
    setLinkedCompanies(companies);
  };

  // ── Toggle activate/deactivate ────────────────────────────────────────────

  const handleToggleCompany = async (companyId: number, nextActive: boolean) => {
    try {
      setTogglingCompanyId(companyId);
      await toggleCompanyStatus({ company_id: companyId, is_active: nextActive });
      await refreshLinkedCompanies();
      toast.success(nextActive ? 'Company activated' : 'Company deactivated');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update company status');
    } finally {
      setTogglingCompanyId(null);
    }
  };

  // ── Delete company ────────────────────────────────────────────────────────

  const handleDeleteCompany = async (companyId: number) => {
    try {
      setDeletingCompanyId(companyId);
      await deleteCompany({ company_id: companyId });
      await refreshLinkedCompanies();
      toast.success('Company deleted successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete company');
    } finally {
      setDeletingCompanyId(null);
      setDeleteConfirmId(null);
    }
  };

  // ── Add new company ───────────────────────────────────────────────────────

  const handleAddCompany = async () => {
    if (!canCreateCompanies) {
      toast.error('Company accounts cannot create other companies.');
      return;
    }
    const ownedCount = (user?.available_companies ?? []).filter(
      (c) => c.account_type === 'company',
    ).length;
    if (!canAddAnotherBusiness(user, ownedCount)) {
      toast.error('Multiple businesses require Business Premium or Enterprise. Upgrade your plan to add another company.');
      router.push(UPGRADE_PLAN_PATH);
      return;
    }
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
      const parseId = (v: any) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };
      const createdId = parseId(
        created?.data?.current_context?.company_id ??
        created?.data?.active_company_id ??
        created?.data?.available_companies?.[0]?.id
      );
      if (createdId) await switchAccountContext({ type: 'company', company_id: createdId });
      toast.success('Company created. Opening company details...');
      setAddCompanyOpen(false);
      setAddCompanySetup({ company_name: '', business_email: '', company_address: '', company_currency: 'LKR' });
      window.location.assign('/company?mode=company&setup_roles=1');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create company');
    } finally {
      setAddCompanyLoading(false);
    }
  };

  // ── View linked company (switch context, reload form) ─────────────────────

  const handleViewCompany = async (companyId: number) => {
    try {
      setSwitchingToCompany(companyId);
      await switchAccountContext({ type: 'company', company_id: companyId });

      // Poll until backend confirms context switched, then hard-reload for fresh state
      let attempts = 0;
      while (attempts < 6) {
        await new Promise((r) => setTimeout(r, 350));
        const check = await http.get('admin/auth/me', {
          params: { _t: Date.now() },
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
        });
        const confirmedId = Number(
          check?.data?.data?.current_context?.company_id ?? check?.data?.data?.active_company_id
        );
        if (confirmedId === companyId) break;
        attempts++;
      }

      // Hard reload — guarantees fresh Redux, form, and API data
      window.location.href = `/company?mode=company&_c=${companyId}`;
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to switch company');
      setSwitchingToCompany(null);
    }
  };

  // ── Shared submit logic ──────────────────────────────────────────────────

  const buildAndSend = async (values: CompanyFormValues | PersonalFormValues) => {
    const trim = (v?: string) => v?.trim() ?? '';
    const payload: CompanyPayload = { company_name: values.company_name.trim() };
    const assignIfNonEmpty = <K extends keyof CompanyPayload>(key: K, value?: string) => {
      const v = trim(value);
      if (v) payload[key] = v as CompanyPayload[K];
    };
    const assignIfFiniteNumber = <K extends keyof CompanyPayload>(key: K, value?: number) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        payload[key] = value as CompanyPayload[K];
      }
    };

    assignIfNonEmpty('company_currency', values.company_currency);
    // Always include bank fields so users can clear saved values by submitting empty strings.
    payload.account_name = trim(values.account_name);
    payload.account_number = trim(values.account_number);
    payload.sort_code = trim(values.sort_code);
    assignIfNonEmpty('stripe_secret_key', values.stripe_secret_key);
    assignIfNonEmpty('stripe_published_key', values.stripe_published_key);
    // Always include social link fields — empty string tells backend to clear stored value.
    payload.social_media_links_facebook = trim(values.social_media_links_facebook);
    payload.social_media_links_instagram = trim(values.social_media_links_instagram);
    payload.social_media_links_linkedin = trim(values.social_media_links_linkedin);
    payload.social_media_links_twitter = trim(values.social_media_links_twitter);
    assignIfFiniteNumber('stripe_fee_percentage', values.stripe_fee_percentage);
    assignIfFiniteNumber('stripe_fixed_fee', values.stripe_fixed_fee);

    if ('business_registration_number' in values) {
      const cv = values as CompanyFormValues;
      payload.business_registration_number = trim(cv.business_registration_number);
      payload.years_in_business = cv.years_in_business;
      payload.office_hours = trim(cv.office_hours);
      payload.company_address = trim(cv.company_address);
      payload.company_address_nr = trim(cv.company_address_nr);
      payload.company_address_street = trim(cv.company_address_street);
      payload.company_address_city = trim(cv.company_address_city);
      payload.company_address_town = trim(cv.company_address_town);
      payload.company_address_postcode = trim(cv.company_address_postcode);
      payload.company_address_county = trim(cv.company_address_county);
      payload.company_address_country = trim(cv.company_address_country);
      payload.business_email = trim(cv.business_email);
      payload.partnerships = trim(cv.partnerships);
      payload.service_areas = trim(cv.service_areas);
      payload.company_website = trim(cv.company_website);
      payload.business_highlights = trim(cv.business_highlights);
      payload.mission_statement = trim(cv.mission_statement);
      payload.about_the_company = trim(cv.about_the_company);
      payload.vat_no = trim(cv.vat_no);
      payload.invoice_format = trim(cv.invoice_format);
      assignIfNonEmpty('business_registration_number', cv.business_registration_number);
      assignIfFiniteNumber('years_in_business', cv.years_in_business);
      assignIfNonEmpty('office_hours', cv.office_hours);
      assignIfNonEmpty('company_address', cv.company_address);
      assignIfNonEmpty('business_email', cv.business_email);
      assignIfNonEmpty('partnerships', cv.partnerships);
      assignIfNonEmpty('service_areas', cv.service_areas);
      assignIfNonEmpty('company_website', cv.company_website);
      assignIfNonEmpty('business_highlights', cv.business_highlights);
      assignIfNonEmpty('mission_statement', cv.mission_statement);
      assignIfNonEmpty('about_the_company', cv.about_the_company);
      assignIfNonEmpty('vat_no', cv.vat_no);
      assignIfNonEmpty('invoice_format', cv.invoice_format);
    }

    const formLogo = (values as any)?.company_logo;
    const resolvedLogoFile =
      logoFile instanceof File
        ? logoFile
        : formLogo instanceof File
          ? formLogo
          : null;

    if (resolvedLogoFile) {
      if (accountType === 'personal') {
        payload.profile_img = resolvedLogoFile;
      } else {
        payload.company_logo = resolvedLogoFile;
      }
    }

    await changeCompanyDetails(payload);

    // Sync bank details to localStorage for automatic cross-page sync (Stripe-like behavior)
    if (payload.account_name && payload.account_number && payload.sort_code) {
      saveBankDetailsToSync({
        account_name: payload.account_name,
        account_number: payload.account_number,
        sort_code: payload.sort_code,
      });
    }

    localStorage.setItem('company_currency', values.company_currency?.trim() || 'LKR');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('companyUpdated'));
    }

    try {
      const updated = await getCurrentUser();
      const me = (updated as any)?.data ?? updated;
      console.log('[CompanyForm] buildAndSend - fetched fresh user after save', {
        meCompanyKeys: me?.company ? Object.keys(me.company) : null,
        meCompanyAddress: me?.company?.company_address,
        meCompanyAddressNr: me?.company?.company_address_nr,
        meCompanyAddressStreet: me?.company?.company_address_street,
        meCompanyAddressCity: me?.company?.company_address_city,
        meCompanyAddressTown: me?.company?.company_address_town,
        meCompanyAddressPostcode: me?.company?.company_address_postcode,
        meCompanyAddressCounty: me?.company?.company_address_county,
        meCompanyAddressCountry: me?.company?.company_address_country,
      });
      // Personal accounts store the image as profile_img; company accounts use company_logo
      const formattedLogo = formatImageUrl(
        accountType === 'personal'
          ? me?.profile_img
          : me?.company?.company_logo
      );
      if (formattedLogo) {
        setLogoPreview(`${formattedLogo}?t=${Date.now()}`);
      } else if (!logoFile) {
        setLogoPreview(null);
      }
      setLogoFile(null);
      return me ?? null;
    } catch (_) {
      setLogoFile(null);
      return null;
    }
  };

  const onCompanySubmit = async (values: CompanyFormValues) => {
    if (companyProfileReadOnly) {
      toast.error('Only the primary account holder can update shared company details.');
      return;
    }
    if (!hasAdminAccess) { toast.error('No permission to edit company details'); return; }
    setIsSubmitting(true);
    setSubmitStageLabel('Saving company details...');
    const loadingToastId = toast.loading('Saving company details...');
    try {
      let createdCompanyId: number | null = null;
      if (!hasCompanyProfile) {
        setSubmitStageLabel('Creating company profile...');
        toast.info('Creating company profile...');
        const created = await createCompanyAccount({
          company_name: values.company_name.trim(),
          business_email: (values.business_email || '').trim(),
          company_currency: (values.company_currency || 'LKR').trim(),
          company_address: values.company_address?.trim() || undefined,
        });
        createdCompanyId = resolveCompanyContextId(created?.data);
        setHasCompanyProfile(true);
      }

      const updatedUser = await buildAndSend(values);
      const latestMe = updatedUser ?? ((await getCurrentUser() as any)?.data ?? null);
      console.log('[CompanyForm] onCompanySubmit after save', {
        buildAndSendReturned: updatedUser ? 'yes' : 'no',
        latestMeCompanyAddress: latestMe?.company?.company_address,
        latestMeCompanyAddressNr: latestMe?.company?.company_address_nr,
        latestMeCompanyAddressStreet: latestMe?.company?.company_address_street,
        latestMeCompanyAddressCity: latestMe?.company?.company_address_city,
        latestMeCompanyAddressTown: latestMe?.company?.company_address_town,
        latestMeCompanyAddressPostcode: latestMe?.company?.company_address_postcode,
        latestMeCompanyAddressCounty: latestMe?.company?.company_address_county,
        latestMeCompanyAddressCountry: latestMe?.company?.company_address_country,
      });
      if (latestMe) {
        dispatch(setAuthUser(latestMe));
        dispatch(setFullUser(latestMe));
      }
      toast.success('Company details saved successfully.', { id: loadingToastId });
      // Only switch context after first-time company creation.
      // Normal updates (including logo upload) must stay in current account context.
      if (createdCompanyId) {
        setSubmitStageLabel('Switching to new company context...');
        toast.info('Switching to new company context...');
        await switchAccountContext({ type: 'company', company_id: createdCompanyId });
        const switched = await getCurrentUser();
        const switchedMe = (switched as any)?.data ?? switched;
        if (switchedMe) {
          dispatch(setAuthUser(switchedMe));
          dispatch(setFullUser(switchedMe));
        }
      }
    }
    catch (err) { toast.error(err instanceof Error ? err.message : 'An error occurred', { id: loadingToastId }); }
    finally { setIsSubmitting(false); }
  };

  const onPersonalSubmit = async (values: PersonalFormValues) => {
    if (!hasAdminAccess) { toast.error('No permission to edit details'); return; }
    setIsSubmitting(true);
    try {
      const updatedUser = await buildAndSend(values);
      const latestMe = updatedUser ?? ((await getCurrentUser() as any)?.data ?? null);
      if (latestMe) {
        dispatch(setAuthUser(latestMe));
        dispatch(setFullUser(latestMe));
      }
      toast.success('Personal details updated successfully!');
    }
    catch (err) { toast.error(err instanceof Error ? err.message : 'An error occurred'); }
    finally { setIsSubmitting(false); }
  };

  // ── Guards ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <p>Please login to view details</p>
        </CardContent>
      </Card>
    );
  }

  // Sub-users are allowed to VIEW the page in read-only mode.
  // The companyProfileReadOnly flag (set during loadCompanyData) controls editability.

  if (accountType === null) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {isSubmitting && (
        <div className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-sm flex items-center justify-center">
          <div className="rounded-xl bg-background border border-border shadow-xl px-6 py-5 min-w-[280px]">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">{submitStageLabel}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Please wait while we switch your account...</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {switchingToCompany !== null && (
        <div className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-sm flex items-center justify-center">
          <div className="rounded-xl bg-background border border-border shadow-xl px-6 py-5 min-w-[280px]">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 shrink-0">
                <img src="/logo.png" alt="Loading" className="w-9 h-9 rounded-md object-contain animate-pulse" />
                <div className="absolute -right-2 -bottom-2 w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Switching...</p>
                <p className="text-xs text-muted-foreground mt-0.5">Loading company details, please wait.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className={`text-2xl font-bold ${textColor}`}>
          {accountType === 'personal' ? 'Personal Details' : 'Company Details'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {accountType === 'personal'
            ? 'Manage your personal information and settings'
            : 'Manage your company information and settings'}
        </p>
      </div>

      {/* Mobile progress indicator - Fixed position */}
      <div className="fixed top-16 left-0 right-0 md:hidden bg-background/95 backdrop-blur-sm py-3 border-b z-50 shadow-sm">
        <div className="flex justify-between text-xs text-muted-foreground px-4">
          <span>📋 Info</span>
          <span>🏦 Bank</span>
          <span>💳 Stripe</span>
          <span>📱 Social</span>
          <span>💾 Save</span>
        </div>
        <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden mx-4">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${scrollProgress}%` }} />
        </div>
      </div>

      {/* ── Personal ── */}
      {accountType === 'personal' && (
        <PersonalDetailsForm
          key={`personal-${formKey}`}
          form={personalForm}
          isSubmitting={isSubmitting}
          logoPreview={logoPreview}
          onLogoChange={handleLogoChange}
          onRemoveLogo={removeLogo}
          stripePaymentStatus={stripePaymentStatus}
          connecting={connecting}
          disconnecting={disconnecting}
          onConnect={handleConnectLink}
          onDisconnect={handleDisconnectStripe}
          onDisconnectPermanently={handleDisconnectStripePermanently}
          sectionRef={sectionRef}
          textColor={textColor}
          onSubmit={onPersonalSubmit}
          readOnly={!canManage}
        />
      )}

      {/* ── Company ── */}
      {accountType === 'company' && (
        <Form key={`company-${formKey}`} {...companyForm}>
          <form onSubmit={companyForm.handleSubmit(onCompanySubmit)} className="space-y-6">
            {companyProfileReadOnly && (
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  You can view this company&apos;s details, but only the primary account holder can edit them.
                </AlertDescription>
              </Alert>
            )}
            <fieldset disabled={companyProfileReadOnly || isSubmitting} className="space-y-6 min-w-0 border-0 p-0 m-0 disabled:opacity-70">

              {/* Branding */}
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${textColor}`}>
                    <Building2 className={`h-5 w-5 ${textColor}`} />
                    Company Branding
                  </CardTitle>
                  <CardDescription>Upload your company logo and establish your brand identity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {logoPreview ? (
                      <div className="relative">
                        <img src={logoPreview} alt="Company logo" className="h-24 w-24 object-cover rounded-lg border border-border" />
                        <Button type="button" variant="destructive" size="sm" className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                          onClick={removeLogo} disabled={isSubmitting}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="h-24 w-24 sm:h-20 sm:w-20 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground bg-muted/50">
                        <Upload className="h-6 w-6" />
                      </div>
                    )}
                    <div className="flex-1 w-full">
                      <Input type="file" accept="image/jpeg,image/jpg,image/png" onChange={handleLogoChange} className="hidden" disabled={isSubmitting} id="logo-upload" />
                      <label htmlFor="logo-upload" className="inline-block">
                        <Button type="button" variant="outline" onClick={() => document.getElementById('logo-upload')?.click()} className="w-full sm:w-auto min-h-[48px]">
                          <Upload className="h-4 w-4 mr-2" /> Choose Logo
                        </Button>
                      </label>
                      <p className="text-xs text-muted-foreground mt-1.5">JPEG or PNG, maximum 2MB</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Company Information */}
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${textColor}`}>
                    <FileText className={`h-5 w-5 ${textColor}`} />
                    Company Information
                  </CardTitle>
                  <CardDescription>Add Company Name, Company Address, and Business Email</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={companyForm.control} name="company_name" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Company Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ''} disabled={isSubmitting} placeholder="Enter company name" className="bg-background" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={companyForm.control} name="business_email" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Business Email <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ''} type="email" inputMode="email" disabled={isSubmitting} placeholder="contact@company.com" className="bg-background" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="mt-4">
                    <FormLabel className="text-foreground font-medium">Company Address</FormLabel>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <FormField control={companyForm.control} name="company_address_nr" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">No.</FormLabel>
                          <FormControl><Input {...field} disabled={isSubmitting} placeholder="123" className="bg-background" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={companyForm.control} name="company_address_street" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Street</FormLabel>
                          <FormControl><Input {...field} disabled={isSubmitting} placeholder="Main Street" className="bg-background" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={companyForm.control} name="company_address_city" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">City</FormLabel>
                          <FormControl><Input {...field} disabled={isSubmitting} placeholder="London" className="bg-background" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={companyForm.control} name="company_address_town" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Town</FormLabel>
                          <FormControl><Input {...field} disabled={isSubmitting} placeholder="Westminster" className="bg-background" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={companyForm.control} name="company_address_postcode" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Postcode</FormLabel>
                          <FormControl><Input {...field} disabled={isSubmitting} placeholder="SW1A 0AA" className="bg-background" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={companyForm.control} name="company_address_county" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">County</FormLabel>
                          <FormControl><Input {...field} disabled={isSubmitting} placeholder="Greater London" className="bg-background" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={companyForm.control} name="company_address_country" render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-foreground">Country</FormLabel>
                          <FormControl><Input {...field} disabled={isSubmitting} placeholder="United Kingdom" className="bg-background" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Details */}
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${textColor}`}>
                    <FileText className={`h-5 w-5 ${textColor}`} />
                    Additional Details
                  </CardTitle>
                  <CardDescription>Provide additional information about your company (all optional)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {([
                      { name: 'business_registration_number' as const, label: 'Business Registration Number', placeholder: 'Enter registration number' },
                      { name: 'office_hours' as const, label: 'Office Hours', placeholder: 'e.g., Mon-Fri 9am-5pm' },
                      { name: 'vat_no' as const, label: 'VAT Number', placeholder: 'Enter VAT number' },
                      { name: 'invoice_format' as const, label: 'Invoice Number Format', placeholder: 'e.g., INV-{YYYY}-{0001}' },
                      { name: 'partnerships' as const, label: 'Partnerships', placeholder: 'e.g., Partner1, Partner2' },
                      { name: 'service_areas' as const, label: 'Service Areas', placeholder: 'e.g., Area1, Area2' },
                      { name: 'company_website' as const, label: 'Company Website', placeholder: 'https://www.company.com', type: 'url' as const, inputMode: 'url' as const },
                    ]).map(({ name, label, placeholder, type, inputMode }) => (
                      <FormField key={name} control={companyForm.control} name={name} render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">{label}</FormLabel>
                          <FormControl><Input {...field} value={field.value ?? ''} disabled={isSubmitting} placeholder={placeholder} type={type || 'text'} inputMode={inputMode as any} className="bg-background" /></FormControl>
                          <FormMessage />
                          {name === 'invoice_format' && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Use placeholders: {`{YYYY}`} for year, {`{MM}`} for month, {`{0001}`} for sequential number
                            </p>
                          )}
                        </FormItem>
                      )} />
                    ))}

                    <FormField control={companyForm.control} name="years_in_business" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Years in Business</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} disabled={isSubmitting} placeholder="0" className="bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={companyForm.control} name="company_currency" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Currency</FormLabel>
                        <FormControl>
                          <Select value={field.value || ''} onValueChange={field.onChange} disabled={isSubmitting}>
                            <SelectTrigger className="h-10 text-sm bg-background text-foreground border-border w-full">
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                            <SelectContent className="bg-background border-border max-h-[200px]">
                              {CURRENCY_OPTIONS.map((c) => (
                                <SelectItem key={c.value} value={c.value} className="text-foreground hover:bg-muted">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{c.symbol}</span>
                                    <span>{c.value}</span>
                                    <span className="text-xs text-muted-foreground ml-auto">{c.label.split(' - ')[1]}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="mt-4 space-y-4">
                    {([
                      { name: 'business_highlights' as const, label: 'Business Highlights', placeholder: 'Key achievements and highlights', rows: 3 },
                      { name: 'mission_statement' as const, label: 'Mission Statement', placeholder: 'Company mission and values', rows: 3 },
                      { name: 'about_the_company' as const, label: 'About the Company', placeholder: 'Detailed company description', rows: 4 },
                    ]).map(({ name, label, placeholder, rows }) => (
                      <FormField key={name} control={companyForm.control} name={name} render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">{label}</FormLabel>
                          <FormControl><Textarea {...field} value={field.value ?? ''} rows={rows} disabled={isSubmitting} placeholder={placeholder} className="bg-background resize-none" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Bank Details */}
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${textColor}`}>
                    <BanknoteIcon className={`h-5 w-5 ${textColor}`} />
                    Bank Details
                  </CardTitle>
                  <CardDescription>Configure your company bank account information (optional)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {([
                      { name: 'account_name' as const, label: 'Account Name', placeholder: 'Account holder name' },
                      { name: 'account_number' as const, label: 'Account Number', placeholder: 'Account number', inputMode: 'numeric' as const },
                      { name: 'sort_code' as const, label: 'Sort Code', placeholder: '00-11-22', inputMode: 'numeric' as const },
                    ]).map(({ name, label, placeholder, inputMode }) => (
                      <FormField key={name} control={companyForm.control} name={name} render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">{label}</FormLabel>
                          <FormControl><Input {...field} value={field.value ?? ''} disabled={isSubmitting} placeholder={placeholder} inputMode={inputMode} className="bg-background" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Stripe Connect */}
              <StripeConnectCard
                sectionRef={sectionRef}
                textColor={textColor}
                stripePaymentStatus={stripePaymentStatus}
                connecting={connecting}
                disconnecting={disconnecting}
                onConnect={handleConnectLink}
                onDisconnect={handleDisconnectStripe}
                onDisconnectPermanently={handleDisconnectStripePermanently}
                readOnly={companyProfileReadOnly}
              />

              {/* Stripe Fee Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${textColor}`}>
                    <CreditCard className={`h-5 w-5 ${textColor}`} />
                    Stripe Fee Configuration (Optional)
                  </CardTitle>
                  <CardDescription>Configure how much Stripe fee should be added to customer payments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={companyForm.control} name="stripe_fee_percentage" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Stripe Fee Percentage (%)</FormLabel>
                        <FormControl>
                          <Input type="number" max="100" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value)} disabled={isSubmitting} placeholder="e.g. 2.9" className="bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={companyForm.control} name="stripe_fixed_fee" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Stripe Fixed Fee</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value)} disabled={isSubmitting} placeholder="e.g. 0" className="bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Example: If invoice is 100 and fee is 2.9% + 0, system can calculate how much to charge customer so you receive exactly 100.
                  </p>
                </CardContent>
              </Card>

              {/* Social Media */}
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${textColor}`}>
                    <Share2 className={`h-5 w-5 ${textColor}`} />
                    Social Media Links
                  </CardTitle>
                  <CardDescription>Add your company social media profiles (optional)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {([
                      { name: 'social_media_links_facebook' as const, label: 'Facebook', placeholder: 'https://facebook.com/company' },
                      { name: 'social_media_links_instagram' as const, label: 'Instagram', placeholder: 'https://instagram.com/company' },
                      { name: 'social_media_links_linkedin' as const, label: 'LinkedIn', placeholder: 'https://linkedin.com/company/company' },
                      { name: 'social_media_links_twitter' as const, label: 'Twitter', placeholder: 'https://twitter.com/company' },
                    ]).map(({ name, label, placeholder }) => (
                      <FormField key={name} control={companyForm.control} name={name} render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">{label}</FormLabel>
                          <FormControl><Input {...field} value={field.value ?? ''} disabled={isSubmitting} placeholder={placeholder} type="url" inputMode="url" className="bg-background" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Submit */}
              <div className="sticky bottom-4 bg-background/95 backdrop-blur-sm rounded-lg p-4 flex justify-end gap-2 pt-6 mt-8 z-10 shadow-lg border">
                <Button type="submit" disabled={isSubmitting || companyProfileReadOnly} className="min-w-32" size="lg">
                  {isSubmitting
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                    : 'Save Company Details'
                  }
                </Button>
              </div>
            </fieldset>
          </form>
        </Form>
      )}

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open && !deletingCompanyId) setDeleteConfirmId(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Company Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">
                {linkedCompanies.find(c => c.id === deleteConfirmId)?.company_name ?? 'this company'}
              </span>
              ? This is a soft delete — contact support to restore it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteConfirmId(null)} disabled={deletingCompanyId !== null}>
              Cancel
            </Button>
            <Button
              type="button" variant="destructive" disabled={deletingCompanyId !== null}
              onClick={() => deleteConfirmId && handleDeleteCompany(deleteConfirmId)}
            >
              {deletingCompanyId !== null
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</>
                : 'Delete Company'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Company Role/Permission Setup Dialog ── */}
      <Dialog
        open={roleSetupOpen}
        onOpenChange={(open) => {
          setRoleSetupOpen(open);
          if (!open && searchParams.get('setup_roles') === '1') {
            router.replace('/company?mode=company');
          }
        }}
      >
        <DialogContent className="w-[95vw] sm:w-auto sm:max-w-[90vw] md:max-w-[800px] lg:max-w-[900px] max-h-[85vh] overflow-hidden flex flex-col p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Company Roles & Permissions</DialogTitle>
            <DialogDescription>
              Configure roles for this company account. These roles/permissions are scoped only to this company.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 flex-1 min-h-0">
            <div className="border rounded-lg p-3 space-y-3 overflow-auto">
              <div className="space-y-2">
                <label className="text-xs font-medium">Search Roles</label>
                <Input
                  value={rolesSearch}
                  onChange={(e) => setRolesSearch(e.target.value)}
                  placeholder="Search roles..."
                  className="h-8"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Create Role</label>
                <div className="flex items-center gap-2">
                  <Input
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="Role name"
                    className="h-8"
                    disabled={creatingRole}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateRoleInPopup}
                    disabled={creatingRole}
                  >
                    {creatingRole ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Add'}
                  </Button>
                </div>
              </div>

              <div className="pt-1 border-t">
                <p className="text-xs text-muted-foreground mb-2">Roles</p>
                {roleSetupLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
                  </div>
                ) : rolesList.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No roles found.</p>
                ) : (
                  <div className="space-y-1">
                    {rolesList.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setSelectedRoleId(role.id)}
                        className={`w-full text-left text-sm rounded-md px-2 py-1.5 transition ${selectedRoleId === role.id
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-muted text-foreground'
                          }`}
                      >
                        {role.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border rounded-lg p-3 space-y-3 overflow-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold truncate">Permissions {selectedRoleName ? `- ${selectedRoleName}` : ''}</h4>
                  <p className="text-xs text-muted-foreground">
                    Toggle permissions and save changes for the selected role.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveRolePermissions}
                  disabled={!selectedRoleId || savingPermissions || !hasPendingPermissionChanges}
                  className="shrink-0"
                >
                  {savingPermissions
                    ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Saving...</>
                    : 'Save Permissions'}
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Search Permissions</label>
                <Input
                  value={permissionsSearch}
                  onChange={(e) => setPermissionsSearch(e.target.value)}
                  placeholder="Search by category, key or description..."
                  className="h-8"
                  disabled={!selectedRoleId}
                />
              </div>

              {!selectedRoleId ? (
                <p className="text-sm text-muted-foreground">Select a role to manage permissions.</p>
              ) : roleSetupLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading permissions...
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPermissionCategories.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No permissions found.</p>
                  ) : (
                    filteredPermissionCategories.map(([category, permissions]) => (
                      <div key={category} className="border rounded-md p-3 space-y-2">
                        <h5 className="text-xs font-semibold uppercase text-muted-foreground">{category}</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                          {permissions.map((permission) => (
                            <label
                              key={permission.name}
                              className="flex items-start gap-2.5 rounded-md border p-2.5 cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden"
                            >
                              <input
                                type="checkbox"
                                checked={permission.enabled}
                                onChange={(e) => {
                                  setPendingPermissionChanges((prev) => ({
                                    ...prev,
                                    [permission.name]: e.target.checked,
                                  }));
                                }}
                                className="h-4 w-4 shrink-0 rounded mt-0.5"
                              />
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <p className="text-xs font-medium leading-tight break-words">{permission.name}</p>
                                <p className="text-[11px] text-muted-foreground leading-tight break-words">{permission.description}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRoleSetupOpen(false);
                if (searchParams.get('setup_roles') === '1') {
                  router.replace('/company?mode=company');
                }
              }}
            >
              Close
            </Button>
            <Button type="button" onClick={() => window.location.assign('/dashboard')}>
              Continue to Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}