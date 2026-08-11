// app/accounting/page.tsx
// Accounting & Bookkeeping workspace overview.
import Link from 'next/link'

const modules = [
  { title: 'Chart of Accounts', href: '/accounting/chart-of-accounts', desc: 'The ledger backbone: assets, liabilities, equity, income and expenses.' },
  { title: 'Journal Entries', href: '/accounting/journal', desc: 'Double-entry postings to the general ledger.' },
  { title: 'Trial Balance', href: '/accounting/reports', desc: 'Prove the ledger is balanced before publishing statements.' },
  { title: 'Banking', href: '/accounting/banking', desc: 'Bank & cash accounts, deposits, withdrawals and reconciliation.' },
  { title: 'Bills (AP)', href: '/accounting/purchases', desc: 'Supplier bills and payments integrated with payables.' },
  { title: 'Expenses', href: '/accounting/expenses', desc: 'Capture overheads and post them to the ledger.' },
]

export default function AccountingOverviewPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Accounting &amp; Bookkeeping</h1>
        <p className="text-muted-foreground mt-1">
          Multi-tenant double-entry ledger. Every invoice, bill, expense and bank movement flows through one balanced set of books per organisation.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="block rounded-lg border border-border p-4 hover:bg-accent transition-colors"
          >
            <h2 className="font-medium">{m.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{m.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
