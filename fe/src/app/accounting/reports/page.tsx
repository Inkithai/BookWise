'use client'

import { useEffect, useState } from 'react'
import { accountingService, TrialBalance } from '@/services/accounting.service'

export default function TrialBalancePage() {
  const [tb, setTb] = useState<TrialBalance | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    accountingService
      .trialBalance()
      .then(setTb)
      .catch(() => setTb(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <h1 className="text-xl font-semibold mb-1">Trial Balance</h1>
      <p className="text-sm text-muted-foreground mb-4">
        {tb ? `As of ${tb.as_of}` : 'Loading…'}
      </p>

      {!loading && tb && (
        <>
          <table className="w-full text-sm border border-border rounded-md overflow-hidden">
            <thead className="bg-accent">
              <tr>
                <th className="text-left p-2">Code</th>
                <th className="text-left p-2">Account</th>
                <th className="text-right p-2">Debit</th>
                <th className="text-right p-2">Credit</th>
              </tr>
            </thead>
            <tbody>
              {tb.accounts.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="p-2">{row.code}</td>
                  <td className="p-2">{row.name}</td>
                  <td className="p-2 text-right">{(row.trial_debit || 0).toFixed(2)}</td>
                  <td className="p-2 text-right">{(row.trial_credit || 0).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="border-t border-border font-semibold">
                <td colSpan={2} className="p-2">
                  Totals
                </td>
                <td className="p-2 text-right">{tb.totals.debit.toFixed(2)}</td>
                <td className="p-2 text-right">{tb.totals.credit.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          <p className={`mt-3 text-sm ${tb.balanced ? 'text-green-600' : 'text-red-600'}`}>
            {tb.balanced ? 'Ledger is balanced.' : 'Ledger is OUT OF BALANCE.'}
          </p>
        </>
      )}
    </div>
  )
}
