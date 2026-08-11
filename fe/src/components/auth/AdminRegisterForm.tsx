'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  User, Lock, Mail, Building2, Phone, Check, UserRound,
  CheckCircle2, ChevronDown, ChevronUp, Search,
  AlertCircle, X, Gift, Tag, ArrowRight,
} from 'lucide-react';
// @ts-ignore
import confetti from 'canvas-confetti';
import Link from 'next/link';
import { register, validateRegistrationBoth } from '@/services/service';
import BookWiseExistingAccountAlert from '@/components/auth/BookWiseExistingAccountAlert';
import {
  getExistingAccountFromError,
  type ExistingAccountField,
} from '@/lib/bookwise-existing-account';
import {
  registerBookWiseUser,
  buildUsernameFromEmail,
  validateReferralCode,
  setStoredInvoiceReferralCode,
  clearStoredInvoiceReferralCode,
} from '@/services/bookwise-sync.service';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '@/lib/utils';
import {
  AUTH_FIELD_H,
  AuthButton,
  AuthCheckbox,
  AuthFieldError,
  AuthInput,
  AuthLabel,
  AuthRevealToggle,
  authFieldClass,
} from './ui/AuthControls';

interface Country {
  name: string;
  dial_code: string;
  code: string;
  flag?: string;
}

const defaultCountries: Country[] = [
  { name: 'United States', dial_code: '+1', code: 'US', flag: '🇺🇸' },
  { name: 'United Kingdom', dial_code: '+44', code: 'GB', flag: '🇬🇧' },
  { name: 'Canada', dial_code: '+1', code: 'CA', flag: '🇨🇦' },
  { name: 'Australia', dial_code: '+61', code: 'AU', flag: '🇦🇺' },
  { name: 'India', dial_code: '+91', code: 'IN', flag: '🇮🇳' },
];

interface PasswordRequirement {
  regex: RegExp;
  text: string;
  met: boolean;
}

// ─── Country Code Selector ───────────────────────────────────────────────────
function CountryCodeSelector({ value = '+1', onChange, disabled = false }: {
  value?: string;
  onChange: (d: string) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [countries, setCountries] = useState<Country[]>(defaultCountries);
  const [filteredCountries, setFilteredCountries] = useState<Country[]>(defaultCountries);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<Country>(defaultCountries[0]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoadingCountries(true);
        const res = await fetch('/country-codes.json');
        if (res.ok) {
          const data = await res.json();
          const mapped = data.map((c: any) => ({
            ...c,
            flag: c.code.toUpperCase().replace(/./g, (ch: string) =>
              String.fromCodePoint(127397 + ch.charCodeAt(0))),
          }));
          setCountries(mapped);
          setFilteredCountries(mapped);
          setSelected(mapped.find((c: Country) => c.dial_code === value) ?? mapped[0]);
        }
      } catch { /* use defaults */ }
      finally {
        setIsLoadingCountries(false);
      }
    };
    load();
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setFilteredCountries(
      searchTerm.trim()
        ? countries.filter(c =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.dial_code.includes(searchTerm) ||
          c.code.toLowerCase().includes(searchTerm.toLowerCase()))
        : countries
    );
  }, [searchTerm, countries]);

  const handleSelect = (c: Country) => {
    setSelected(c);
    onChange(c.dial_code);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative h-full w-full" ref={dropdownRef}>
      {isLoadingCountries ? (
        <div className={cn(AUTH_FIELD_H, 'w-full animate-pulse rounded-xl bg-slate-100')} />
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={authFieldClass(
            false,
            cn(
              'flex items-center justify-between px-3 text-left',
              isOpen && 'border-teal-600 ring-4 ring-teal-500/15',
              disabled && 'cursor-not-allowed opacity-50'
            )
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {selected?.flag && <span className="shrink-0 text-sm leading-none">{selected.flag}</span>}
            <span className="truncate text-sm font-medium text-slate-900">{selected?.dial_code || value}</span>
          </span>
          <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform', isOpen && 'rotate-180')} />
        </button>
      )}

      {isOpen && (
        <div className="absolute z-50 mt-2 max-h-80 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search country…"
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredCountries.length === 0 ? (
              <div className="px-4 py-3 text-center text-sm text-slate-500">No countries found</div>
            ) : (
              filteredCountries.map((c) => (
                <button
                  key={`${c.code}-${c.dial_code}`}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className={cn(
                    'flex w-full items-center px-4 py-2 text-left text-sm transition-colors hover:bg-teal-50',
                    selected?.dial_code === c.dial_code && 'bg-teal-50'
                  )}
                >
                  {c.flag && <span className="mr-3 text-lg">{c.flag}</span>}
                  <span>
                    <span className="block font-medium text-slate-900">{c.name}</span>
                    <span className="block text-xs text-slate-500">{c.dial_code}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────
export default function AdminRegisterForm() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    account_type: 'company' as 'company' | 'personal',
    company: '',
    phone_number: '',
    country_code: '+1',
    email: '',
    password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [termsError, setTermsError] = useState(false);
  const [termsShake, setTermsShake] = useState(false);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const [validatingEmail, setValidatingEmail] = useState(false);
  const [validatingPhone, setValidatingPhone] = useState(false);
  const [success, setSuccess] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [showReferralInput, setShowReferralInput] = useState(false);
  const [referralFromLink, setReferralFromLink] = useState(false);
  const [existingAccount, setExistingAccount] = useState<ExistingAccountField | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Referral code from invite link (?refercode= / ?referral= / ?ref=)
  useEffect(() => {
    const stored =
      typeof window !== 'undefined'
        ? sessionStorage.getItem('invoiceReferralCode') || ''
        : '';
    const urlCode =
      searchParams?.get('refercode') ||
      searchParams?.get('referral') ||
      searchParams?.get('ref') ||
      '';
    const code = (stored || urlCode).trim().toUpperCase();

    if (code) {
      setReferralCode(code);
      setShowReferralInput(true);
      setReferralFromLink(Boolean(urlCode));
      setStoredInvoiceReferralCode(code);
    }
  }, [searchParams]);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('registrationDraft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setFormData(parsed);
        toast.info('Restored saved draft', { duration: 2000 });
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  // Auto-save draft
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.first_name || formData.email) {
        localStorage.setItem('registrationDraft', JSON.stringify(formData));
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [formData]);

  const passwordRef = useRef<HTMLInputElement>(null);
  const passwordBase: PasswordRequirement[] = [
    { regex: /.{8,}/, text: 'At least 8 characters', met: false },
    { regex: /[A-Z]/, text: 'One uppercase letter', met: false },
    { regex: /[a-z]/, text: 'One lowercase letter', met: false },
    { regex: /[0-9]/, text: 'One number', met: false },
    { regex: /[!@#$%^&*(),.?":{}|<>]/, text: 'One special character', met: false },
  ];
  const [passwordChecks, setPasswordChecks] = useState<PasswordRequirement[]>(passwordBase);
  const isPasswordValid = passwordChecks.every(c => c.met);

  // Debounced phone validation - TEMPORARILY DISABLED API CHECK
  // Only validate format locally, API check happens on submit
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.phone_number && formData.phone_number.length > 0) {
        const digits = formData.phone_number.replace(/\D/g, '');
        if (digits.length > 0 && (digits.length < 7 || digits.length > 15)) {
          setErrors(prev => ({ ...prev, phone_number: [`${digits.length} digits entered. Phone number must be 7-15 digits`] }));
        } else if (digits.length >= 7 && digits.length <= 15) {
          setErrors(prev => { const u = { ...prev }; delete u.phone_number; return u; });
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.phone_number]);

  // Debounced email validation with API check - TEMPORARILY DISABLED
  // The validation is causing false positives. Only validate on form submit.
  /*
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (isValidEmail(formData.email) && formData.email.length > 0) {
        setValidatingEmail(true);
        try {
          const cleanCountryCode = formData.country_code.replace(/[^0-9+]/g, '');
          const phoneDigits = formData.phone_number.replace(/\D/g, '');
          const fullPhoneNumber = phoneDigits ? `${cleanCountryCode}${phoneDigits}` : '';

          const validation = await validateRegistrationBoth(
            formData.email,
            fullPhoneNumber
          );

          if (!validation.ok && validation.errors.email) {
            setErrors(prev => ({ ...prev, email: validation.errors.email }));
          } else {
            setErrors(prev => { const u = { ...prev }; delete u.email; return u; });
          }
        } catch (error) {
          // Silently fail validation check, don't show error to user
          console.error('Email validation check failed:', error);
          // Clear email error on API failure to avoid false positives
          setErrors(prev => { const u = { ...prev }; delete u.email; return u; });
        } finally {
          setValidatingEmail(false);
        }
      } else {
        // Clear email error if email is invalid or empty
        setErrors(prev => { const u = { ...prev }; delete u.email; return u; });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.email, formData.phone_number, formData.country_code]);
  */

  // Detect browser autofill
  useEffect(() => {
    const checkAutofill = () => {
      if (passwordRef.current?.value) {
        setPasswordChecks(passwordBase.map((r: PasswordRequirement) => ({ ...r, met: r.regex.test(passwordRef.current?.value || '') })));
      }
    };
    setTimeout(checkAutofill, 100);
  }, []);

  useEffect(() => {
    if (confirmPasswordTouched && formData.confirm_password && formData.password !== formData.confirm_password) {
      setConfirmPasswordError('Passwords do not match');
    } else {
      setConfirmPasswordError('');
    }
  }, [formData.password, formData.confirm_password, confirmPasswordTouched]);

  // Rate limit countdown timer
  useEffect(() => {
    if (rateLimitCountdown > 0) {
      const timer = setTimeout(() => {
        setRateLimitCountdown(rateLimitCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [rateLimitCountdown]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let sanitized = value;

    // Allow only digits for phone number
    if (name === 'phone_number') {
      sanitized = value.replace(/\D/g, '');
    }

    setFormData(p => ({ ...p, [name]: sanitized }));
    if (name === 'password') setPasswordChecks(passwordBase.map(r => ({ ...r, met: r.regex.test(value) })));
    // Clear error immediately when user starts typing
    if (errors[name]) setErrors(p => { const u = { ...p }; delete u[name]; return u; });
    if (name === 'email' || name === 'phone_number') setExistingAccount(null);
    // Also clear email error when email field changes
    if (name === 'email') setErrors(p => { const u = { ...p }; delete u.email; return u; });
    if (name === 'confirm_password' && confirmPasswordError) setConfirmPasswordError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.name !== 'confirm_password') {
      e.preventDefault();
      const form = e.currentTarget.form;
      const index = Array.from(form?.elements || []).indexOf(e.currentTarget);
      (form?.elements[index + 1] as HTMLElement)?.focus();
    }
  };

  const handleReset = () => {
    setFormData({
      first_name: '', last_name: '', account_type: 'company', company: '',
      phone_number: '', country_code: '+1', email: '', password: '', confirm_password: ''
    });
    setErrors({});
    setConfirmPasswordError('');
    setConfirmPasswordTouched(false);
    setPasswordChecks(passwordBase);
  };

  const handleAccountTypeChange = (type: 'company' | 'personal') => {
    setFormData(p => ({ ...p, account_type: type, company: type === 'personal' ? '' : p.company }));
    if (errors.company) setErrors(p => { const u = { ...p }; delete u.company; return u; });
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return emailRegex.test(email);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setExistingAccount(null);
    setConfirmPasswordError('');
    setTermsError(false);

    if (!isPasswordValid) {
      setErrors({ password: ['Password does not meet all requirements'] });
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setErrors({ confirm_password: ['Passwords do not match'] });
      setConfirmPasswordError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (!isValidEmail(formData.email)) {
      setErrors({ email: ['Please enter a valid email address'] });
      setLoading(false);
      return;
    }

    if (formData.account_type === 'company' && !formData.company.trim()) {
      setErrors({ company: ['Company name is required for company accounts'] });
      setLoading(false);
      return;
    }

    // Validate phone number: must be 7-15 digits
    const phoneDigits = formData.phone_number.replace(/\D/g, '');
    if (!phoneDigits) {
      setErrors({ phone_number: ['Phone number is required'] });
      setLoading(false);
      return;
    }

    if (phoneDigits.length < 7) {
      setErrors({ phone_number: ['Phone number must be at least 7 digits'] });
      setLoading(false);
      return;
    }

    if (phoneDigits.length > 15) {
      setErrors({ phone_number: ['Phone number must not exceed 15 digits'] });
      setLoading(false);
      return;
    }

    if (!termsChecked) {
      setTermsError(true);
      setTermsShake(true);
      setTimeout(() => setTermsShake(false), 500);
      setLoading(false);
      return;
    }

    // Format phone number: remove all non-digits and combine with country code
    const cleanCountryCode = formData.country_code.replace(/[^0-9+]/g, '');
    const fullPhoneNumber = `${cleanCountryCode}${phoneDigits}`;

    try {
      // Validate email and phone availability with specific error handling
      let validation;
      try {
        validation = await validateRegistrationBoth(
          formData.email,
          fullPhoneNumber
        );
      } catch (validationError) {
        console.error('Validation API call failed:', validationError);
        toast.error('Unable to validate email and phone. Please try again.');
        setLoading(false);
        return;
      }

      if (!validation.ok) {
        setErrors(validation.errors);
        if (validation.existingAccount) {
          setExistingAccount(validation.existingAccount);
        }
        setLoading(false);
        return;
      }

      let referralToApply = referralCode.trim().toUpperCase();
      if (referralToApply) {
        const refCheck = await validateReferralCode(referralToApply);
        if (!refCheck.ok) {
          setShowReferralInput(true);
          setErrors({ referral_code: [refCheck.message] });
          toast.error(refCheck.message);
          setLoading(false);
          return;
        }
        referralToApply = refCheck.code;
        setReferralCode(refCheck.code);
        setStoredInvoiceReferralCode(refCheck.code);
      }

      // 1) Register on BookWise first (via /api/sync/register + APP_API_KEY)
      try {
        await registerBookWiseUser({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone_number: fullPhoneNumber,
          username: buildUsernameFromEmail(formData.email),
          password: formData.password,
          password_confirmation: formData.password,
          registration_source: 'invoice',
          ...(referralToApply ? { referral_code: referralToApply } : {}),
        });
      } catch (syncErr) {
        const syncErrWithFields = syncErr as Error & {
          fieldErrors?: Record<string, string>;
          existingAccount?: ExistingAccountField;
        };
        const syncMessage =
          syncErr instanceof Error
            ? syncErr.message
            : 'Could not create your BookWise account.';
        const existingAccount =
          syncErrWithFields.existingAccount ||
          getExistingAccountFromError(syncErr);

        if (existingAccount) {
          setExistingAccount(existingAccount);
          setErrors({});
        } else if (syncErrWithFields.fieldErrors?.referral_code) {
          setShowReferralInput(true);
          setErrors({
            referral_code: [syncErrWithFields.fieldErrors.referral_code],
          });
          toast.error(syncMessage);
        } else {
          setErrors({ email: [syncMessage] });
          toast.error(syncMessage);
        }
        setLoading(false);
        return;
      }

      // 2) Register on Invoice
      const response = await register(
        formData.first_name,
        formData.last_name,
        formData.account_type,
        formData.account_type === 'company' ? formData.company : null,
        fullPhoneNumber,
        formData.email,
        formData.password
      );

      if (response.data.success) {
        // Clear draft on successful registration
        localStorage.removeItem('registrationDraft');
        clearStoredInvoiceReferralCode();
        localStorage.setItem('userFirstLogin', 'true');
        localStorage.removeItem('hasSeenPricing');

        // Trigger confetti animation
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

        // Show success toast after registration is confirmed
        toast.success('Registration successful! Redirecting to verification...');
        setSuccess(true);
        setTimeout(() => {
          router.push(`/auth/otp-verification?email=${encodeURIComponent(formData.email)}`);
        }, 1500);
      } else {
        const errorMessage = response.data?.message || 'Registration did not complete. Please check your information and try again.';
        toast.error(errorMessage);
        console.error('Registration failed without throwing:', response.data);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data as any;
        const status = error.response?.status;

        if (status === 422) {
          const validationErrors: Record<string, string[]> = errorData?.errors || {};
          setErrors(validationErrors);
          const existingAccount = getExistingAccountFromError({ fieldErrors: validationErrors });
          if (existingAccount) {
            setExistingAccount(existingAccount);
          } else {
            const seen = new Set<string>();
            let firstErrorMessage: string | undefined;
            for (const msg of Object.values(validationErrors).flat()) {
              const cleaned = String(msg)
                .replace(/^\[(Invoice|BookWise)\]\s*/gi, '')
                .trim();
              const key = cleaned.toLowerCase();
              if (cleaned && !seen.has(key)) {
                seen.add(key);
                firstErrorMessage = cleaned;
                break;
              }
            }
            toast.error(firstErrorMessage || 'Validation failed. Please check your input.');
          }
        } else if (status === 500) {
          toast.error('Server error. Please try again later.');
        } else if (status === 404) {
          toast.error('Registration endpoint not found. Please contact support.');
        } else {
          const errorMessage = errorData?.message || errorData?.error || 'Registration failed. Please try again.';
          toast.error(errorMessage);
        }
      } else {
        console.error('Unexpected error:', error);
        toast.error('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };


  if (success) {
    return (
      <div className="w-full">
        <div className="rounded-2xl border border-teal-200 bg-teal-50 px-6 py-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-700 text-white shadow-lg shadow-teal-900/20">
            <Check className="h-8 w-8" strokeWidth={3} />
          </div>
          <h2 className="text-xl font-bold text-teal-900">You&apos;re all set</h2>
          <p className="mt-1.5 text-sm text-slate-600">Taking you to email verification…</p>
          <div className="mt-6 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-200 border-t-teal-700" />
          </div>
        </div>
      </div>
    );
  }

  const passwordStrength = passwordChecks.filter(c => c.met).length;
  const strengthLabel = passwordStrength <= 2 ? 'Weak' : passwordStrength <= 4 ? 'Medium' : 'Strong';
  const strengthBar =
    passwordStrength <= 2 ? 'bg-red-500' : passwordStrength <= 4 ? 'bg-amber-500' : 'bg-teal-600';
  const strengthText =
    passwordStrength <= 2 ? 'text-red-600' : passwordStrength <= 4 ? 'text-amber-600' : 'text-teal-700';

  const phoneDigitCount = formData.phone_number.replace(/\D/g, '').length;

  const submitDisabled =
    loading ||
    rateLimitCountdown > 0 ||
    (formData.password.length > 0 && !isPasswordValid) ||
    (formData.confirm_password.length > 0 && formData.password !== formData.confirm_password);

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6" noValidate>
      {existingAccount && (
        <BookWiseExistingAccountAlert field={existingAccount} featureName="Invoice" />
      )}

      {/* Error announcement for screen readers */}
      {Object.keys(errors).length > 0 && (
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {Object.values(errors).flat().join('. ')}
        </div>
      )}

      {/* ── Section: who you are ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-100 text-teal-700">
            <UserRound className="h-3.5 w-3.5" />
          </span>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Your details
          </h2>
          <span className="h-px flex-1 bg-slate-100" />
        </div>

        {/* First / Last name */}
        <div className="grid gap-4 sm:grid-cols-2">
          {(['first_name', 'last_name'] as const).map((field) => (
            <div key={field} className="space-y-1.5">
              <AuthLabel htmlFor={field} required>
                {field === 'first_name' ? 'First name' : 'Last name'}
              </AuthLabel>
              <AuthInput
                id={field}
                name={field}
                type="text"
                value={formData[field]}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={field === 'first_name' ? 'Jane' : 'Doe'}
                icon={<User />}
                hasError={Boolean(errors[field])}
                required
                disabled={loading}
                enterKeyHint="next"
                aria-invalid={errors[field] ? 'true' : 'false'}
                aria-describedby={errors[field] ? `${field}-error` : undefined}
              />
              <AuthFieldError id={`${field}-error`}>{errors[field]?.join(', ')}</AuthFieldError>
            </div>
          ))}
        </div>

        {/* Account type */}
        <div className="space-y-1.5">
          <AuthLabel required>Account type</AuthLabel>
          <div className="grid grid-cols-2 gap-3">
            {([
              { type: 'company' as const, label: 'Company', hint: 'Business books' },
              { type: 'personal' as const, label: 'Personal', hint: 'Just me' },
            ]).map(({ type, label, hint }) => {
              const active = formData.account_type === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleAccountTypeChange(type)}
                  disabled={loading}
                  aria-pressed={active}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200',
                    'focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/20',
                    'disabled:cursor-not-allowed disabled:opacity-60',
                    active
                      ? 'border-teal-600 bg-teal-50 shadow-sm ring-1 ring-teal-600/20'
                      : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/40'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                      active ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-400'
                    )}
                  >
                    {type === 'company' ? <Building2 className="h-[18px] w-[18px]" /> : <UserRound className="h-[18px] w-[18px]" />}
                  </span>
                  <span className="min-w-0">
                    <span className={cn('block text-sm font-semibold', active ? 'text-teal-900' : 'text-slate-700')}>
                      {label}
                    </span>
                    <span className="block truncate text-xs text-slate-500">{hint}</span>
                  </span>
                  {active && (
                    <span className="absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full bg-teal-700 text-white">
                      <Check className="h-2.5 w-2.5" strokeWidth={4} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Company name */}
        {formData.account_type === 'company' && (
          <div className="space-y-1.5">
            <AuthLabel htmlFor="company" required>
              Company name
            </AuthLabel>
            <AuthInput
              id="company"
              name="company"
              type="text"
              value={formData.company}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Acme Trading Ltd"
              icon={<Building2 />}
              hasError={Boolean(errors.company)}
              required
              disabled={loading}
              enterKeyHint="next"
              aria-invalid={errors.company ? 'true' : 'false'}
              aria-describedby={errors.company ? 'company-error' : undefined}
            />
            <AuthFieldError id="company-error">{errors.company?.join(', ')}</AuthFieldError>
          </div>
        )}
      </section>

      {/* ── Section: how to reach you ────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-100 text-teal-700">
            <Mail className="h-3.5 w-3.5" />
          </span>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Contact
          </h2>
          <span className="h-px flex-1 bg-slate-100" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Phone */}
          <div className="min-w-0 space-y-1.5">
            <AuthLabel
              htmlFor="phone_number"
              required
              hint={
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    phoneDigitCount > 15 ? 'text-red-500' : 'text-slate-400'
                  )}
                >
                  {phoneDigitCount}/15
                </span>
              }
            >
              Phone number
            </AuthLabel>
            <div className={cn('flex min-w-0 gap-2', AUTH_FIELD_H)}>
              <div className={cn(AUTH_FIELD_H, 'w-[5.5rem] shrink-0')}>
                <CountryCodeSelector
                  value={formData.country_code}
                  onChange={(d) => setFormData(p => ({ ...p, country_code: d }))}
                  disabled={loading}
                />
              </div>
              <div className="min-w-0 flex-1">
                <AuthInput
                  id="phone_number"
                  name="phone_number"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.phone_number}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  placeholder="7700900123"
                  icon={<Phone />}
                  hasError={Boolean(errors.phone_number)}
                  required
                  disabled={loading}
                  enterKeyHint="next"
                  aria-invalid={errors.phone_number ? 'true' : 'false'}
                  aria-describedby={errors.phone_number ? 'phone_number-error' : undefined}
                />
              </div>
            </div>
            {!existingAccount && (
              <AuthFieldError id="phone_number-error">{errors.phone_number?.join(', ')}</AuthFieldError>
            )}
          </div>

          {/* Email */}
          <div className="min-w-0 space-y-1.5">
            <AuthLabel htmlFor="email" required>
              Email address
            </AuthLabel>
            <AuthInput
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="you@company.com"
              icon={<Mail />}
              hasError={Boolean(errors.email)}
              trailing={
                validatingEmail ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-200 border-t-teal-700" />
                ) : formData.email && !errors.email && isValidEmail(formData.email) ? (
                  <CheckCircle2 className="h-[18px] w-[18px] text-teal-600" />
                ) : undefined
              }
              required
              disabled={loading}
              autoComplete="email"
              inputMode="email"
              enterKeyHint="next"
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {!existingAccount && (
              <AuthFieldError id="email-error">{errors.email?.join(', ')}</AuthFieldError>
            )}
          </div>
        </div>
      </section>

      {/* ── Section: security ────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-100 text-teal-700">
            <Lock className="h-3.5 w-3.5" />
          </span>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Security
          </h2>
          <span className="h-px flex-1 bg-slate-100" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Password */}
          <div className="space-y-1.5">
            <AuthLabel htmlFor="password" required>
              Password
            </AuthLabel>
            <AuthInput
              ref={passwordRef}
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Create a password"
              icon={<Lock />}
              hasError={Boolean(errors.password)}
              trailing={
                <AuthRevealToggle
                  shown={showPassword}
                  onToggle={() => setShowPassword(v => !v)}
                  disabled={loading}
                />
              }
              required
              disabled={loading}
              autoComplete="new-password"
              enterKeyHint="next"
              aria-invalid={errors.password ? 'true' : 'false'}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            <AuthFieldError id="password-error">{errors.password?.join(', ')}</AuthFieldError>
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <AuthLabel htmlFor="confirm_password" required>
              Confirm password
            </AuthLabel>
            <AuthInput
              id="confirm_password"
              name="confirm_password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirm_password}
              onChange={handleChange}
              onBlur={() => setConfirmPasswordTouched(true)}
              onKeyDown={handleKeyDown}
              placeholder="Repeat password"
              icon={<Lock />}
              hasError={Boolean(confirmPasswordError || errors.confirm_password)}
              trailing={
                formData.confirm_password &&
                !confirmPasswordError &&
                formData.password === formData.confirm_password ? (
                  <CheckCircle2 className="h-[18px] w-[18px] text-teal-600" />
                ) : (
                  <AuthRevealToggle
                    shown={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword(v => !v)}
                    disabled={loading}
                    label="confirm password"
                  />
                )
              }
              required
              disabled={loading}
              autoComplete="new-password"
              enterKeyHint="done"
              aria-invalid={confirmPasswordError || errors.confirm_password ? 'true' : 'false'}
              aria-describedby={
                confirmPasswordError || errors.confirm_password ? 'confirm_password-error' : undefined
              }
            />
            <AuthFieldError id="confirm_password-error">
              {(confirmPasswordTouched && confirmPasswordError) || errors.confirm_password?.join(', ')}
            </AuthFieldError>
          </div>
        </div>

        {/* Password strength + requirements */}
        {formData.password && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={cn('h-full rounded-full transition-all duration-300', strengthBar)}
                  style={{ width: `${(passwordStrength / passwordChecks.length) * 100}%` }}
                />
              </div>
              <span className={cn('shrink-0 text-xs font-semibold', strengthText)}>{strengthLabel}</span>
            </div>
            <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {passwordChecks.map((c, i) => (
                <li key={i} className="flex items-center gap-2">
                  {c.met ? (
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal-700 text-white">
                      <Check className="h-2.5 w-2.5" strokeWidth={4} />
                    </span>
                  ) : (
                    <span className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-300" />
                  )}
                  <span className={cn('text-xs', c.met ? 'font-medium text-teal-800' : 'text-slate-500')}>
                    {c.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <AuthCheckbox
          checked={showPassword && showConfirmPassword}
          onChange={(checked) => {
            setShowPassword(checked);
            setShowConfirmPassword(checked);
          }}
          disabled={loading}
        >
          Show both passwords
        </AuthCheckbox>
      </section>

      {/* ── Referral code ────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {!referralFromLink && (
          <button
            type="button"
            onClick={() => {
              if (showReferralInput && !referralFromLink) {
                setReferralCode('');
                setErrors((p) => {
                  const u = { ...p };
                  delete u.referral_code;
                  return u;
                });
                clearStoredInvoiceReferralCode();
              }
              setShowReferralInput((v) => !v);
            }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-teal-700 transition-colors hover:text-teal-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/20 disabled:opacity-50"
          >
            <Gift className="h-4 w-4" />
            {showReferralInput ? 'Remove referral code' : 'Have a referral code?'}
            {showReferralInput ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}

        {showReferralInput && (
          <div className="space-y-2">
            {referralFromLink && (
              <div className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-700" />
                <p className="text-xs font-medium text-teal-900">
                  Referral code applied from your invite link
                </p>
              </div>
            )}

            <AuthLabel
              htmlFor="referral_code"
              hint={
                !referralFromLink ? (
                  <span className="text-xs font-normal text-slate-400">Optional</span>
                ) : undefined
              }
            >
              Referral code
            </AuthLabel>
            <AuthInput
              id="referral_code"
              name="referral_code"
              type="text"
              value={referralCode}
              onChange={(e) => {
                const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                setReferralCode(v);
                setStoredInvoiceReferralCode(v);
                if (errors.referral_code) {
                  setErrors((p) => {
                    const u = { ...p };
                    delete u.referral_code;
                    return u;
                  });
                }
              }}
              maxLength={20}
              readOnly={referralFromLink}
              placeholder="AB12CD34EF"
              disabled={loading}
              icon={<Tag />}
              hasError={Boolean(errors.referral_code)}
              className="font-mono uppercase tracking-[0.2em]"
              trailing={
                referralCode && !referralFromLink ? (
                  <button
                    type="button"
                    onClick={() => {
                      setReferralCode('');
                      clearStoredInvoiceReferralCode();
                      setErrors((p) => {
                        const u = { ...p };
                        delete u.referral_code;
                        return u;
                      });
                    }}
                    className="rounded-md p-0.5 text-slate-400 transition-colors hover:text-red-500"
                    aria-label="Clear referral code"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : undefined
              }
            />
            <AuthFieldError>{errors.referral_code?.join(', ')}</AuthFieldError>
          </div>
        )}
      </div>

      {/* ── Terms ────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'rounded-xl border px-4 py-3 transition-colors',
          termsError ? 'border-red-300 bg-red-50/70' : 'border-slate-200 bg-slate-50/70',
          termsShake && 'animate-[shake_0.5s_ease-in-out]'
        )}
      >
        <AuthCheckbox
          id="terms"
          checked={termsChecked}
          onChange={(checked) => {
            setTermsChecked(checked);
            if (termsError) setTermsError(false);
          }}
          disabled={loading}
          error={termsError}
        >
          I agree to the{' '}
          <Link href="/terms-and-conditions" className="font-medium text-teal-700 hover:underline">
            Terms &amp; Conditions
          </Link>{' '}
          and{' '}
          <Link href="/Privacy" className="font-medium text-teal-700 hover:underline">
            Privacy Policy
          </Link>
        </AuthCheckbox>
        {termsError && (
          <p className="ml-[30px] mt-1 text-xs font-medium text-red-600">
            You must agree to continue
          </p>
        )}
      </div>

      {/* ── Submit ───────────────────────────────────────────────────────── */}
      <AuthButton
        type="submit"
        disabled={submitDisabled}
        loading={loading}
        loadingText="Creating your account…"
        icon={<ArrowRight className="h-[18px] w-[18px]" />}
        className="flex-row-reverse"
      >
        {rateLimitCountdown > 0 ? `Please wait ${rateLimitCountdown}s` : 'Create account'}
      </AuthButton>

      <p className="text-center text-xs text-slate-400">
        Copyright 2017-{new Date().getFullYear()} BookWise. All rights reserved.
      </p>
    </form>
  );
}
