<?php

namespace Modules\Accounting\Services;

use App\Enums\AccountType;
use App\Services\TenantManager;
use Illuminate\Support\Collection;
use Modules\Accounting\Models\Account;
use Modules\Accounting\Models\JournalEntryLine;

/**
 * Generates the four core SMB financial statements from posted journal lines.
 *
 *  - Trial Balance      : every account's ending balance on its normal side
 *  - Profit & Loss      : income less expense for a period
 *  - Balance Sheet      : assets = liabilities + equity (+ retained earnings)
 *  - Cash Flow (simple) : change in cash/bank accounts, classified by source
 *
 * All figures are tenant-scoped via the resolved {@see TenantManager}.
 */
class FinancialStatementService
{
    /**
     * Aggregate posted line sums (debit/credit) per account within a window.
     */
    private function lineSums(?string $from, ?string $to, ?string $asOf): Collection
    {
        $hostId = TenantManager::id();
        if ($hostId === null) {
            throw new \RuntimeException('No tenant resolved for financial statements.');
        }

        $q = JournalEntryLine::query()
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_entry_lines.journal_entry_id')
            ->where('journal_entry_lines.host_id', $hostId)
            ->where('journal_entries.status', 'posted');

        if ($asOf) {
            $q->whereDate('journal_entries.entry_date', '<=', $asOf);
        }
        if ($from) {
            $q->whereDate('journal_entries.entry_date', '>=', $from);
        }
        if ($to) {
            $q->whereDate('journal_entries.entry_date', '<=', $to);
        }

        return $q->selectRaw(
            'journal_entry_lines.account_id as account_id, '.
            'COALESCE(SUM(journal_entry_lines.debit),0) as debit, '.
            'COALESCE(SUM(journal_entry_lines.credit),0) as credit'
        )->groupBy('journal_entry_lines.account_id')->get()->keyBy('account_id');
    }

    private function accountBalance(Account $account, ?object $sum): array
    {
        $debit = (float) ($sum->debit ?? 0);
        $credit = (float) ($sum->credit ?? 0);
        $balance = $account->isDebitNormal()
            ? (float) $account->opening_balance + ($debit - $credit)
            : (float) $account->opening_balance + ($credit - $debit);

        return [
            'id' => $account->id,
            'code' => $account->code,
            'name' => $account->name,
            'type' => $account->type->value,
            'debit' => $debit,
            'credit' => $credit,
            'balance' => $balance,
        ];
    }

    public function trialBalance(?string $asOf = null): array
    {
        $asOf = $asOf ?? now()->toDateString();
        $sums = $this->lineSums(null, null, $asOf);
        $accounts = Account::query()->forTenant(TenantManager::id())->orderBy('code')->get();

        $rows = [];
        $totalDebit = $totalCredit = 0;

        foreach ($accounts as $account) {
            $row = $this->accountBalance($account, $sums->get($account->id));
            $row['trial_debit'] = $account->isDebitNormal() ? $row['balance'] : 0;
            $row['trial_credit'] = $account->isDebitNormal() ? 0 : $row['balance'];
            $totalDebit += $row['trial_debit'];
            $totalCredit += $row['trial_credit'];
            $rows[] = $row;
        }

        return [
            'as_of' => $asOf,
            'accounts' => $rows,
            'totals' => [
                'debit' => round($totalDebit, 2),
                'credit' => round($totalCredit, 2),
            ],
            'balanced' => abs($totalDebit - $totalCredit) < 0.005,
        ];
    }

    public function profitAndLoss(string $from, string $to): array
    {
        $sums = $this->lineSums($from, $to, null);
        $accounts = Account::query()
            ->forTenant(TenantManager::id())
            ->whereIn('type', [AccountType::Income->value, AccountType::Expense->value])
            ->orderBy('type')
            ->orderBy('code')
            ->get();

        $incomeRows = $expenseRows = [];
        $totalIncome = $totalExpense = 0;

        foreach ($accounts as $account) {
            $row = $this->accountBalance($account, $sums->get($account->id));
            // Income increases with credit; expense increases with debit.
            $net = $account->isDebitNormal() ? ($row['debit'] - $row['credit']) : ($row['credit'] - $row['debit']);
            $row['net'] = round($net, 2);

            if ($account->type === AccountType::Income) {
                $incomeRows[] = $row;
                $totalIncome += $net;
            } else {
                $expenseRows[] = $row;
                $totalExpense += $net;
            }
        }

        $grossProfit = ($incomeRows ? ($totalIncome - ($expenseRows ? 0 : 0)) : 0);
        $netIncome = $totalIncome - $totalExpense;

        return [
            'from' => $from,
            'to' => $to,
            'income' => $incomeRows,
            'expenses' => $expenseRows,
            'total_income' => round($totalIncome, 2),
            'total_expenses' => round($totalExpense, 2),
            'net_income' => round($netIncome, 2),
        ];
    }

    public function balanceSheet(?string $asOf = null): array
    {
        $asOf = $asOf ?? now()->toDateString();
        $sums = $this->lineSums(null, null, $asOf);
        $accounts = Account::query()
            ->forTenant(TenantManager::id())
            ->whereIn('type', [AccountType::Asset->value, AccountType::Liability->value, AccountType::Equity->value])
            ->orderBy('type')
            ->orderBy('code')
            ->get();

        $assets = $liabilities = $equity = [];
        $totalAssets = $totalLiabilities = $totalEquity = 0;

        foreach ($accounts as $account) {
            $row = $this->accountBalance($account, $sums->get($account->id));
            $row['balance'] = round($row['balance'], 2);

            if ($account->type === AccountType::Asset) {
                $assets[] = $row;
                $totalAssets += $row['balance'];
            } elseif ($account->type === AccountType::Liability) {
                $liabilities[] = $row;
                $totalLiabilities += $row['balance'];
            } else {
                $equity[] = $row;
                $totalEquity += $row['balance'];
            }
        }

        // Retained earnings = YTD net income, presented as an equity component.
        $ytd = $this->profitAndLoss(now()->startOfYear()->toDateString(), $asOf);
        $retainedEarnings = $ytd['net_income'];

        $totalEquityWithRetained = $totalEquity + $retainedEarnings;

        return [
            'as_of' => $asOf,
            'assets' => $assets,
            'total_assets' => round($totalAssets, 2),
            'liabilities' => $liabilities,
            'total_liabilities' => round($totalLiabilities, 2),
            'equity' => $equity,
            'retained_earnings' => round($retainedEarnings, 2),
            'total_equity' => round($totalEquityWithRetained, 2),
            'balanced' => abs($totalAssets - ($totalLiabilities + $totalEquityWithRetained)) < 0.005,
        ];
    }

    public function cashFlow(string $from, string $to): array
    {
        $hostId = TenantManager::id();
        $cashAccounts = Account::query()
            ->forTenant($hostId)
            ->where('type', AccountType::Asset->value)
            ->where(function ($q) {
                $q->where('sub_type', 'cash')->orWhere('sub_type', 'bank')->orWhere('account_group', 'cash');
            })
            ->get();

        $beginning = $this->balanceSheet((new \DateTime($from))->modify('-1 day')->toDateString());
        $ending = $this->balanceSheet($to);

        $beginningCash = collect($beginning['assets'])->whereIn('id', $cashAccounts->pluck('id'))->sum('balance');
        $endingCash = collect($ending['assets'])->whereIn('id', $cashAccounts->pluck('id'))->sum('balance');

        // Heuristic classification of the period's posted lines by account type.
        $sums = $this->lineSums($from, $to, null);
        $accounts = Account::query()->forTenant($hostId)->whereIn('type', AccountType::values())->get()->keyBy('id');

        $operating = $investing = $financing = 0;
        foreach ($sums as $accountId => $sum) {
            $account = $accounts->get($accountId);
            if (! $account) {
                continue;
            }
            $net = $account->isDebitNormal()
                ? ((float) $sum->debit - (float) $sum->credit)
                : ((float) $sum->credit - (float) $sum->debit);

            if (in_array($account->type->value, [AccountType::Income->value, AccountType::Expense->value], true)) {
                $operating += $net;
            } elseif ($account->type->value === AccountType::Asset->value) {
                $investing += $net;
            } else {
                $financing += $net; // liability / equity
            }
        }

        return [
            'from' => $from,
            'to' => $to,
            'beginning_cash' => round($beginningCash, 2),
            'ending_cash' => round($endingCash, 2),
            'net_change' => round($endingCash - $beginningCash, 2),
            'operating' => round($operating, 2),
            'investing' => round($investing, 2),
            'financing' => round($financing, 2),
        ];
    }
}
