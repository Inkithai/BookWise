// components/profile/PersonalDetails.tsx
'use client';

import { useTheme } from 'next-themes';
import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/slices/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CURRENCY_OPTIONS } from '@/services/interface/invoice';
import { changeCompanyDetails, getCurrentUser } from '@/services/service';
import { saveBankDetailsToSync } from '@/utils/bank-details-sync';
import {
  Building2,
  FileText,
  Landmark,
  CreditCard,
  Share2,
  Upload,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  ChevronDown,
  ArrowLeft,
  Save,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PersonalDetailsFormData {
  // Branding
  logo: File | null;
  logoPreview: string | null;
  // Basic Info
  name: string;
  currency: string;
  // Bank Details
  accountName: string;
  accountNumber: string;
  sortCode: string;
  // Payment Integration
  stripeSecretKey: string;
  stripePublishedKey: string;
  // Social Media
  facebook: string;
  instagram: string;
  linkedin: string;
  twitter: string;
}

// ─── Section Wrapper ──────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  description,
  children,
  inputClasses,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
  inputClasses?: string;
}) {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-5">
      <div className="flex items-center gap-3 pb-1">
        <Icon className="w-5 h-5 text-teal-500" strokeWidth={1.75} />
        <div>
          <h2 className="text-base font-semibold text-teal-500 leading-tight">{title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
  hint,
  labelColor,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
  labelColor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className={`text-sm font-medium ${labelColor || ''}`}>
        {label} {required && <span className="text-foreground">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground italic">{hint}</p>}
    </div>
  );
}

// ─── Social Input ─────────────────────────────────────────────────────────────

function SocialInput({
  icon: Icon,
  placeholder,
  value,
  onChange,
  disabled,
  inputClasses,
}: {
  icon: React.ElementType;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  inputClasses?: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border border-input px-3 py-2 ${inputClasses || ''}`}>
      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <input
        type="url"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PersonalDetails() {
  const { theme } = useTheme();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const authUser = useSelector((state: RootState) => state.auth.user ?? state.auth.authUser);
  // Sub-users (team-members) cannot manage bank or Stripe — those belong to the parent company.
  const isSubUser = authUser?.can_manage_company_profile === false;

  const [formData, setFormData] = useState<PersonalDetailsFormData>({
    logo: null,
    logoPreview: null,
    name: '',
    currency: 'LKR',
    accountName: '',
    accountNumber: '',
    sortCode: '',
    stripeSecretKey: '',
    stripePublishedKey: '',
    facebook: '',
    instagram: '',
    linkedin: '',
    twitter: '',
  });

  // Theme-based styling (same pattern as Profile.tsx)
  const textColor = theme === 'dark' ? 'text-white' : 'text-primary';
  const labelColor = theme === 'dark' ? 'text-gray-300' : '';
  const inputClasses = theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : '';
  const buttonOutlineClasses = theme === 'dark' ? 'border-gray-700 hover:bg-gray-800' : '';

  const set = (key: keyof PersonalDetailsFormData) => (value: string) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPEG or PNG files are allowed.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must not exceed 2MB.');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      logo: file,
      logoPreview: URL.createObjectURL(file),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Prepare bank details payload
      const bankDetailsPayload = {
        account_name: formData.accountName || null,
        account_number: formData.accountNumber || null,
        sort_code: formData.sortCode || null,
        company_name: formData.name || null,
        company_currency: formData.currency || null,
        stripe_secret_key: formData.stripeSecretKey || null,
        stripe_published_key: formData.stripePublishedKey || null,
        social_media_links_facebook: formData.facebook || null,
        social_media_links_instagram: formData.instagram || null,
        social_media_links_linkedin: formData.linkedin || null,
        social_media_links_twitter: formData.twitter || null,
      };

      // Save to API
      await changeCompanyDetails(bankDetailsPayload);

      // Save bank details to sync storage for automatic sync across pages
      if (formData.accountName && formData.accountNumber && formData.sortCode) {
        saveBankDetailsToSync({
          account_name: formData.accountName,
          account_number: formData.accountNumber,
          sort_code: formData.sortCode,
        });
      }

      // Refresh user data to get updated bank details
      const refreshed = await getCurrentUser();
      const me = (refreshed as any)?.data ?? refreshed;
      if (me) {
        // Dispatch custom event for other components to listen to
        window.dispatchEvent(new CustomEvent('companyUpdated', { detail: me }));
      }

      toast.success('Personal details saved successfully.');
    } catch (error: any) {
      console.error('Failed to save details:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to save details.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      logo: null,
      logoPreview: null,
      name: '',
      currency: 'LKR',
      accountName: '',
      accountNumber: '',
      sortCode: '',
      stripeSecretKey: '',
      stripePublishedKey: '',
      facebook: '',
      instagram: '',
      linkedin: '',
      twitter: '',
    });
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const selectedCurrencyLabel = (() => {
    const found = CURRENCY_OPTIONS.find((c) => c.value === formData.currency);
    if (!found) return formData.currency;
    return `${found.symbol} (${found.value})  ${found.label.split(' - ')[1] || ''}`;
  })();

  return (
    <div className="w-full space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="text-teal-500 hover:text-teal-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className={`text-2xl font-bold text-teal-500`}>Personal Details</h1>
          <p className="text-sm text-muted-foreground">Manage your company information and settings</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Branding ── */}
        <Section
          icon={Building2}
          title="Branding"
          description="Upload your logo and establish your brand identity"
          inputClasses={inputClasses}
        >
          <div className="flex flex-col items-center gap-3 py-4">
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={loading}
              className={`
                w-44 h-40 rounded-xl border-2 border-dashed border-border
                flex flex-col items-center justify-center gap-2
                hover:border-teal-400 hover:bg-teal-50/5 transition-colors cursor-pointer
                ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}
              `}
            >
              {formData.logoPreview ? (
                <img
                  src={formData.logoPreview}
                  alt="Logo preview"
                  className="w-full h-full object-contain rounded-xl p-2"
                />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400" />
                  <span className="text-sm text-muted-foreground font-medium">Upload Logo</span>
                </>
              )}
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleLogoChange}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground">JPEG or PNG, maximum 2MB</p>
          </div>
        </Section>

        {/* ── Basic Information ── */}
        <Section
          icon={FileText}
          title="Basic Information"
          description="Fields marked with * are required"
          inputClasses={inputClasses}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Name" required labelColor={labelColor}>
              <div className={`flex items-center gap-3 rounded-lg border border-input px-3 py-2 ${inputClasses}`}>
                <svg className="w-4 h-4 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <input
                  type="text"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={(e) => set('name')(e.target.value)}
                  disabled={loading}
                  required
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
                />
              </div>
            </Field>

            <Field
              label="Currency"
              required
              labelColor={labelColor}
              hint={`Selected: ${selectedCurrencyLabel}`}
            >
              <div className={`relative flex items-center rounded-lg border border-input px-3 py-2 ${inputClasses}`}>
                <select
                  value={formData.currency}
                  onChange={(e) => set('currency')(e.target.value)}
                  disabled={loading}
                  className="w-full bg-transparent text-sm outline-none appearance-none pr-8 text-foreground cursor-pointer"
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value} className={theme === 'dark' ? 'bg-gray-800' : 'bg-white'}>
                      {c.symbol} ({c.value}) — {c.label.split(' - ')[1]}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 pointer-events-none" />
              </div>
            </Field>
          </div>
        </Section>

        {/* ── Bank Details ── */}
        <Section
          icon={Landmark}
          title="Bank Details"
          description={isSubUser ? "Managed by your company account owner" : "Configure your company bank account information"}
          inputClasses={inputClasses}
        >
          {isSubUser && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              <Landmark className="w-4 h-4 shrink-0" />
              <span>Bank details are managed by your company account owner and cannot be edited by sub-users.</span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Account Name" labelColor={labelColor}>
              <div className={`flex items-center gap-3 rounded-lg border border-input px-3 py-2 ${inputClasses} ${isSubUser ? 'opacity-60' : ''}`}>
                <svg className="w-4 h-4 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <input
                  type="text"
                  placeholder="Account holder name"
                  value={formData.accountName}
                  onChange={(e) => set('accountName')(e.target.value)}
                  disabled={loading || isSubUser}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
                />
              </div>
            </Field>

            <Field label="Account Number" labelColor={labelColor}>
              <div className={`flex items-center gap-3 rounded-lg border border-input px-3 py-2 ${inputClasses} ${isSubUser ? 'opacity-60' : ''}`}>
                <CreditCard className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Account number"
                  value={formData.accountNumber}
                  onChange={(e) => set('accountNumber')(e.target.value)}
                  disabled={loading || isSubUser}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
                />
              </div>
            </Field>

            <Field label="Sort Code" labelColor={labelColor}>
              <div className={`flex items-center gap-3 rounded-lg border border-input px-3 py-2 ${inputClasses} ${isSubUser ? 'opacity-60' : ''}`}>
                <span className="text-muted-foreground text-sm font-medium">?</span>
                <input
                  type="text"
                  placeholder="00-11-22"
                  value={formData.sortCode}
                  onChange={(e) => set('sortCode')(e.target.value)}
                  disabled={loading || isSubUser}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
                />
              </div>
            </Field>
          </div>
        </Section>

        {/* ── Payment Integration (Stripe) ── */}
        <Section
          icon={CreditCard}
          title="Payment Integration (Stripe)"
          description={isSubUser ? "Managed by your company account owner" : "Configure Stripe payment gateway for your business"}
          inputClasses={inputClasses}
        >
          {isSubUser && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              <CreditCard className="w-4 h-4 shrink-0" />
              <span>Stripe configuration is managed by your company account owner and cannot be edited by sub-users.</span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Stripe Secret Key" labelColor={labelColor}>
              <div className={`flex items-center gap-3 rounded-lg border border-input px-3 py-2 ${inputClasses} ${isSubUser ? 'opacity-60' : ''}`}>
                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                <input
                  type="password"
                  placeholder="sk_test_..."
                  value={formData.stripeSecretKey}
                  onChange={(e) => set('stripeSecretKey')(e.target.value)}
                  disabled={loading || isSubUser}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
                />
              </div>
            </Field>

            <Field label="Stripe Published Key" labelColor={labelColor}>
              <div className={`flex items-center gap-3 rounded-lg border border-input px-3 py-2 ${inputClasses} ${isSubUser ? 'opacity-60' : ''}`}>
                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
                <input
                  type="text"
                  placeholder="pk_test_..."
                  value={formData.stripePublishedKey}
                  onChange={(e) => set('stripePublishedKey')(e.target.value)}
                  disabled={loading || isSubUser}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
                />
              </div>
            </Field>
          </div>
        </Section>

        {/* ── Social Media Links ── */}
        <Section
          icon={Share2}
          title="Social Media Links"
          description="Add your company social media profiles"
          inputClasses={inputClasses}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Facebook" labelColor={labelColor}>
              <SocialInput
                icon={Facebook}
                placeholder="https://facebook.com/company"
                value={formData.facebook}
                onChange={set('facebook')}
                disabled={loading}
                inputClasses={inputClasses}
              />
            </Field>

            <Field label="Instagram" labelColor={labelColor}>
              <SocialInput
                icon={Instagram}
                placeholder="https://instagram.com/company"
                value={formData.instagram}
                onChange={set('instagram')}
                disabled={loading}
                inputClasses={inputClasses}
              />
            </Field>

            <Field label="LinkedIn" labelColor={labelColor}>
              <SocialInput
                icon={Linkedin}
                placeholder="https://linkedin.com/company"
                value={formData.linkedin}
                onChange={set('linkedin')}
                disabled={loading}
                inputClasses={inputClasses}
              />
            </Field>

            <Field label="Twitter" labelColor={labelColor}>
              <SocialInput
                icon={Twitter}
                placeholder="https://twitter.com/company"
                value={formData.twitter}
                onChange={set('twitter')}
                disabled={loading}
                inputClasses={inputClasses}
              />
            </Field>
          </div>
        </Section>

        {/* ── Action Buttons ── */}
        <div className="flex justify-end gap-4 pt-2 pb-6">
          <Button
            variant="outline"
            type="button"
            disabled={loading}
            onClick={handleCancel}
            className={buttonOutlineClasses}
          >
            Cancel
          </Button>

          <Button type="submit" disabled={loading} className="gap-2">
            {loading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}