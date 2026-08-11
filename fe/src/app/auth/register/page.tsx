// app/auth/register/page.tsx — redesigned register (keeps the real AdminRegisterForm)
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSelector, useAppDispatch } from '@/slices/hooks'
import { clearAuthUser } from '@/slices/authSlice'
import { logout } from '@/services/service'
import AdminRegisterForm from '../../../components/auth/AdminRegisterForm'
import PlatformHighlights from '../../../components/auth/PlatformHighlights'
import Link from 'next/link'
import { toast } from 'sonner'
import { Landmark, UserPlus } from 'lucide-react'

const BRAND = 'BookWise'

export default function AdminRegisterPage() {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth)
  const dispatch = useAppDispatch()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [justLoggedIn, setJustLoggedIn] = useState(false)

  useEffect(() => {
    const flag = sessionStorage.getItem('justLoggedIn')
    setJustLoggedIn(flag === 'true')
  }, [isAuthenticated])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
      dispatch(clearAuthUser())
      toast.success('Logged out successfully')
    } catch {
      dispatch(clearAuthUser())
    } finally {
      setLoggingOut(false)
    }
  }

  if (isAuthenticated && !justLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
        <div className="w-full max-w-md text-center">
          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-100">
              <Landmark className="h-8 w-8 text-teal-700" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Already have an account</h2>
            <p className="mt-2 text-slate-600">You are signed in as:</p>
            <p className="mb-6 font-semibold text-slate-900">{user?.email || 'Unknown User'}</p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full rounded-lg bg-teal-700 px-6 py-3 font-medium text-white transition hover:bg-teal-600"
              >
                Go to Dashboard
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full rounded-lg bg-slate-100 px-6 py-3 font-medium text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
              >
                {loggingOut ? 'Logging out…' : 'Logout & create new account'}
              </button>
              <Link href="/landing" className="block w-full rounded-lg px-6 py-3 font-medium text-slate-500 hover:text-slate-700">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <Link href="/landing" className="mb-8 flex items-center gap-2 text-slate-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 text-white">
            <Landmark className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold">{BRAND}</span>
        </Link>
        <div className="mx-auto w-full max-w-xl">
          <div className="mb-8">
            <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
              <UserPlus className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create your account</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Set up your organisation&apos;s books in a couple of minutes.
            </p>
          </div>

          <AdminRegisterForm />

          <p className="mt-8 border-t border-slate-200 pt-6 text-center text-sm text-slate-500">
            Already registered?{' '}
            <Link href="/auth/login" className="font-semibold text-teal-700 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Brand side */}
      <div className="relative hidden bg-gradient-to-br from-teal-700 to-teal-900 lg:flex lg:flex-col lg:justify-center lg:overflow-y-auto lg:p-12">
        <div className="max-w-md text-white">
          <h2 className="text-3xl font-bold leading-tight">Close the books without the busywork.</h2>
          <p className="mt-4 text-teal-50/90">
            Capture every invoice, bill and expense and let a balanced ledger do the rest.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-teal-50/80">
            <li>• Chart of accounts seeded for you</li>
            <li>• Invoices post to accounts receivable automatically</li>
            <li>• Board-ready reports whenever you need them</li>
          </ul>
          <div className="mt-10 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
            <PlatformHighlights tone="dark" limit={8} title="Everything your books need" subtitle="Select a capability to see what it covers" />
          </div>
        </div>
      </div>
    </div>
  )
}
