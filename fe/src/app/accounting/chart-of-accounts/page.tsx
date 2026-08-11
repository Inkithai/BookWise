'use client'

import { useEffect, useState } from 'react'
import { accountingService, Account } from '@/services/accounting.service'

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    accountingService
      .chartOfAccounts()
      .then(setAccounts)
      .catch(() => setAccounts([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Chart of Accounts</h1>
        <button
          onClick={() => accountingService.seedSystemAccounts()}
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
        >
          Seed system accounts
        </button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <table className="w-full text-sm border border-border rounded-md overflow-hidden">
          <thead className="bg-accent">
            <tr>
              <th className="text-left p-2">Code</th>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Type</th>
              <th className="text-right p-2">Balance</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="p-2">{a.code}</td>
                <td className="p-2">{a.name}</td>
                <td className="p-2">{a.type}</td>
                <td className="p-2 text-right">{a.current_balance.toFixed(2)}</td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-muted-foreground">
                  No accounts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
