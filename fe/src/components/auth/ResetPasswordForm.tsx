// components/auth/ResetPasswordForm.tsx
'use client';

import { useEffect, useState } from 'react';
import { Lock, Check, AlertCircle, ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import Link from 'next/link';
import { resetPassword } from "@/services/service";
import { toast } from "sonner";
import axios from "axios";
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  AuthButton,
  AuthFieldError,
  AuthInput,
  AuthLabel,
  AuthRevealToggle,
} from './ui/AuthControls';

interface PasswordRequirement {
  regex: RegExp;
  text: string;
  met: boolean;
}

export default function ResetPasswordForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [token,setToken] = useState('')

  const searchParams = useSearchParams();
  const [emailFromParam, setEmailFromParam] = useState(false);
  
  useEffect(() => {
    const emailFromQuery = searchParams.get('email');
    const token = searchParams.get('token');
    if (emailFromQuery) {
      setEmail(emailFromQuery);
      setEmailFromParam(true)
      setToken(token||'')
    }
  }, [searchParams]);

  const passwordRequirements: PasswordRequirement[] = [
    { regex: /.{8,}/, text: 'At least 8 characters', met: false },
    { regex: /[A-Z]/, text: 'One uppercase letter', met: false },
    { regex: /[a-z]/, text: 'One lowercase letter', met: false },
    { regex: /[0-9]/, text: 'One number', met: false },
    { regex: /[!@#$%^&*(),.?":{}|<>]/, text: 'One special character', met: false },
  ];

  const [passwordChecks, setPasswordChecks] = useState<PasswordRequirement[]>(passwordRequirements);

  const isPasswordValid = passwordChecks.every(check => check.met);

  const checkPasswordStrength = (password: string): PasswordRequirement[] => {
    return passwordRequirements.map(req => ({
      ...req,
      met: req.regex.test(password)
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    setPasswordChecks(checkPasswordStrength(value));
    
    if (error) {
      setError('');
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);
    
    if (error) {
      setError('');
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setEmailError('');
    
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setEmailError('');

    // Validate email
    if (!email || !email.trim()) {
      setEmailError('Email is required');
      setLoading(false);
      toast.error('Please enter your email address');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      setLoading(false);
      toast.error('Invalid email address');
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      toast.error('Passwords do not match');
      return;
    }

    // Validate password strength
    if (!isPasswordValid) {
      setError('Password does not meet all requirements');
      setLoading(false);
      toast.error('Please meet all password requirements');
      return;
    }

    try {
      const response = await resetPassword(email, password, confirmPassword,token);
      
      if (response.message || response.success) {
        toast.success('Password reset successfully!');
        setSuccess(true);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data;
        
        if (error.response?.status === 422 && errorData?.errors) {
          const validationErrors = errorData.errors;
          
          // Handle field-specific errors
          if (validationErrors.email) {
            setEmailError(validationErrors.email[0]);
          }
          if (validationErrors.password) {
            setError(validationErrors.password[0]);
          }
          if (validationErrors.password_confirmation) {
            setError(validationErrors.password_confirmation[0]);
          }
          
          const firstError = Object.values(validationErrors)[0];
          const message = Array.isArray(firstError) ? firstError[0] : firstError;
          toast.error(message as string);
        } else if (error.response?.status === 404) {
          setEmailError('Email not found. Please check and try again.');
          toast.error('Email not found. Please check and try again.');
        } else {
          const message = errorData?.message || 'Failed to reset password. Please try again.';
          setError(message);
          toast.error(message);
        }
      } else {
        setError('Password reset link is invalid.');
        toast.error('Password reset link is invalid.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full space-y-6">
        <div className="rounded-2xl border border-teal-200 bg-teal-50 px-6 py-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-700 text-white shadow-lg shadow-teal-900/20">
            <Check className="h-8 w-8" strokeWidth={3} />
          </div>
          <h2 className="text-xl font-bold text-teal-900">Password updated</h2>
          <p className="mt-1.5 text-sm text-slate-600">
            You can now sign in with your new password.
          </p>
        </div>

        <div className="text-center">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 transition-colors hover:text-teal-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>

        <p className="text-center text-xs text-slate-400">
          Copyright © 2017-{new Date().getFullYear()} BookWise. All rights reserved.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Email */}
        <div className="space-y-1.5">
          <AuthLabel htmlFor="email" required>
            Email address
          </AuthLabel>
          <AuthInput
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={handleEmailChange}
            placeholder="you@company.com"
            icon={<Mail />}
            hasError={Boolean(emailError)}
            required
            disabled={loading || emailFromParam}
            autoComplete="off"
          />
          <AuthFieldError>{emailError}</AuthFieldError>
        </div>

        {/* New password */}
        <div className="space-y-1.5">
          <AuthLabel htmlFor="password" required>
            New password
          </AuthLabel>
          <AuthInput
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={handlePasswordChange}
            placeholder="Create a strong password"
            icon={<Lock />}
            trailing={
              <AuthRevealToggle
                shown={showPassword}
                onToggle={() => setShowPassword(!showPassword)}
                disabled={loading}
              />
            }
            required
            disabled={loading}
            autoComplete="new-password"
          />

          {password && (
            <ul className="mt-2 grid grid-cols-1 gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2">
              {passwordChecks.map((check, index) => (
                <li key={index} className="flex items-center gap-2">
                  {check.met ? (
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal-700 text-white">
                      <Check className="h-2.5 w-2.5" strokeWidth={4} />
                    </span>
                  ) : (
                    <span className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-300" />
                  )}
                  <span className={cn('text-xs', check.met ? 'font-medium text-teal-800' : 'text-slate-500')}>
                    {check.text}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Confirm password */}
        <div className="space-y-1.5">
          <AuthLabel htmlFor="confirmPassword" required>
            Confirm password
          </AuthLabel>
          <AuthInput
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            placeholder="Repeat your new password"
            icon={<Lock />}
            hasError={Boolean(confirmPassword) && password !== confirmPassword}
            trailing={
              confirmPassword && password === confirmPassword ? (
                <CheckCircle2 className="h-[18px] w-[18px] text-teal-600" />
              ) : (
                <AuthRevealToggle
                  shown={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                  label="confirm password"
                />
              )
            }
            required
            disabled={loading}
            autoComplete="new-password"
          />

          {confirmPassword && (
            <div className="flex items-center gap-1.5">
              {password === confirmPassword ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
                  <span className="text-xs font-medium text-teal-700">Passwords match</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-xs font-medium text-red-600">Passwords do not match</span>
                </>
              )}
            </div>
          )}
        </div>

        <AuthButton
          type="submit"
          disabled={!isPasswordValid || password !== confirmPassword || !email}
          loading={loading}
          loadingText="Resetting password…"
          icon={<Lock className="h-[18px] w-[18px]" />}
        >
          Reset password
        </AuthButton>
      </form>

      <div className="text-center">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-teal-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>

      <p className="text-center text-xs text-slate-400">
        Copyright © 2017-{new Date().getFullYear()} BookWise. All rights reserved.
      </p>
    </div>
  );
}
