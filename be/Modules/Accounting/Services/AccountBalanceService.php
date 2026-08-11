<?php

namespace Modules\Accounting\Services;

use Modules\Accounting\Models\Account;
use Modules\Accounting\Models\JournalEntryLine;

/**
 * Maintains the live `current_balance` on each account as journal entries
 * are posted or reversed. Always applies the double-entry normal-balance rule:
 *  - debit-normal accounts increase with debits
 *  - credit-normal accounts increase with credits
 */
class AccountBalanceService
{
    /**
     * Apply a posted line to its account balance.
     */
    public function apply(JournalEntryLine $line): void
    {
        $account = $line->account;
        if (! $account) {
            return;
        }

        $account->current_balance = $this->adjusted(
            (float) $account->current_balance,
            (float) $line->debit,
            (float) $line->credit,
            $account->isDebitNormal()
        );
        $account->save();
    }

    /**
     * Reverse a previously applied line (used when reversing a journal entry).
     */
    public function reverse(JournalEntryLine $line): void
    {
        $account = $line->account;
        if (! $account) {
            return;
        }

        $account->current_balance = $this->adjusted(
            (float) $account->current_balance,
            (float) $line->credit, // swap sides to undo
            (float) $line->debit,
            $account->isDebitNormal()
        );
        $account->save();
    }

    /**
     * Recompute an account's balance from scratch (opening + all posted lines).
     */
    public function recompute(Account $account): Account
    {
        $posted = JournalEntryLine::query()
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_entry_lines.journal_entry_id')
            ->where('journal_entry_lines.host_id', $account->host_id)
            ->where('journal_entry_lines.account_id', $account->id)
            ->where('journal_entries.status', 'posted')
            ->selectRaw('COALESCE(SUM(journal_entry_lines.debit),0) as d, COALESCE(SUM(journal_entry_lines.credit),0) as c')
            ->first();

        $net = $this->adjusted(
            (float) $account->opening_balance,
            (float) ($posted->d ?? 0),
            (float) ($posted->c ?? 0),
            $account->isDebitNormal()
        );

        $account->current_balance = $net;
        $account->save();

        return $account;
    }

    private function adjusted(float $balance, float $debit, float $credit, bool $isDebitNormal): float
    {
        return $isDebitNormal
            ? $balance + ($debit - $credit)
            : $balance + ($credit - $debit);
    }
}
