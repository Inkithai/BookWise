// app/landing/page.tsx — redesigned marketing landing for the accounting SaaS
import Link from 'next/link'
import {
  Landmark,
  BarChart3,
  Layers,
  Wallet,
  Receipt,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Building2,
  TrendingUp,
  FileText,
  PieChart,
} from 'lucide-react'

const BRAND = 'BookWise'

const features = [
  { icon: Layers, title: 'Double-entry ledger', desc: 'Every transaction is balanced automatically. Debits equal credits — always.' },
  { icon: Wallet, title: 'Banking & reconciliation', desc: 'Bank and cash accounts, deposits, withdrawals and matched statements.' },
  { icon: Receipt, title: 'Accounts payable', desc: 'Vendor bills and payments that post to payables the moment they land.' },
  { icon: BarChart3, title: 'Financial statements', desc: 'Trial balance, P&L, balance sheet and cash flow generated on demand.' },
  { icon: Building2, title: 'Multi-tenant by design', desc: 'Each organisation gets fully isolated books on one shared, secure platform.' },
  { icon: ShieldCheck, title: 'Audit-safe', desc: 'Posted entries are locked; corrections post as reversals, never deletions.' },
]

const steps = [
  { icon: FileText, title: 'Invoice & capture', desc: 'Raise invoices, log bills and record expenses from one workspace.' },
  { icon: PieChart, title: 'Post to the ledger', desc: 'AR, AP and cash move through a single balanced set of books.' },
  { icon: TrendingUp, title: 'Report & decide', desc: 'Open the trial balance or P&L and know exactly where you stand.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/landing" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
              <Landmark className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold">{BRAND}</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#how" className="hover:text-slate-900">How it works</a>
            <Link href="/pricing" className="hover:text-slate-900">Pricing</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">Sign in</Link>
            <Link
              href="/auth/register"
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-teal-50 via-white to-teal-50" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Multi-tenant accounting for SMBs
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Accounting that <span className="text-teal-600">balances itself</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600">
              Issue invoices, pay bills and track expenses — and watch every move post to a
              double-entry ledger with bank reconciliation and board-ready statements.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-500"
              >
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                See features
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-slate-500">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-teal-500" /> Tenant isolation
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-teal-500" /> No manual journals
              </span>
            </div>
          </div>

          {/* Trial balance preview card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Trial Balance</p>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">Balanced</span>
            </div>
            <div className="mt-4 space-y-3">
              {[
                ['1000', 'Cash', '12,400.00', 'dr'],
                ['1200', 'Accounts Receivable', '8,200.00', 'dr'],
                ['2000', 'Accounts Payable', '5,100.00', 'cr'],
                ['4000', 'Sales', '15,500.00', 'cr'],
              ].map(([code, name, amt, side]) => (
                <div key={code} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span className="text-slate-500">
                    {code} · {name}
                  </span>
                  <span className="font-medium text-slate-900">
                    {amt} <span className="text-xs text-slate-400">{side.toUpperCase()}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold text-slate-900">Everything the books need</h2>
          <p className="mt-3 text-slate-600">
            One platform for the whole accounting cycle — built multi-tenant from day one.
          </p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-slate-200 p-6 transition hover:border-teal-300 hover:shadow-md"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl font-bold text-slate-900">How it works</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title}>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 px-8 py-12 text-center text-white">
          <h2 className="text-3xl font-bold">Open the books in minutes</h2>
          <p className="mx-auto mt-3 max-w-xl text-teal-100">
            Set up your organisation, seed a chart of accounts and start posting — no spreadsheet required.
          </p>
          <Link
            href="/auth/register"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-teal-700 hover:bg-teal-50"
          >
            Create your account <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-slate-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-teal-600 text-white">
              <Landmark className="h-4 w-4" />
            </span>
            <span className="font-semibold text-slate-700">{BRAND}</span>
          </div>
          <p>© {new Date().getFullYear()} {BRAND}. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/pricing" className="hover:text-slate-900">Pricing</Link>
            <Link href="/landing" className="hover:text-slate-900">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
