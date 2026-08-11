<?php

namespace Tests\Feature;

use App\Models\Host;
use App\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Accounting\Models\Account;
use Modules\Accounting\Services\FinancialStatementService;
use Modules\Accounting\Services\JournalServiceInterface;
use Modules\Accounting\Support\SystemAccounts;
use Tests\TestCase;

/**
 * Double-entry ledger correctness and tenant isolation for the Accounting module.
 */
class AccountingLedgerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // host_id is a FK to hosts, so the tenant must exist for the ledger rows.
        $host = Host::create(['name' => 'Test Tenant']);
        TenantManager::setId($host->id);
        SystemAccounts::ensureForHost($host->id);
    }

    public function test_posted_entry_updates_balances_and_stays_balanced(): void
    {
        $accounts = SystemAccounts::ensureForHost(TenantManager::id());
        $ar = Account::find($accounts[SystemAccounts::AR]);
        $sales = Account::find($accounts[SystemAccounts::SALES]);

        $journal = app(JournalServiceInterface::class);

        // Credit sale: DR Accounts Receivable 1000, CR Sales 1000
        $entry = $journal->record([
            'entry_date' => now()->toDateString(),
            'description' => 'Credit sale',
            'reference_type' => 'manual',
            'lines' => [
                ['account_id' => $ar->id, 'debit' => 1000, 'description' => 'AR'],
                ['account_id' => $sales->id, 'credit' => 1000, 'description' => 'Sales'],
            ],
        ], 1);

        $this->assertSame('posted', $entry->status->value);
        $this->assertDatabaseHas('accounts', ['id' => $ar->id, 'current_balance' => 1000]);
        $this->assertDatabaseHas('accounts', ['id' => $sales->id, 'current_balance' => 1000]);

        $tb = app(FinancialStatementService::class)->trialBalance();
        $this->assertTrue($tb['balanced']);
        $this->assertEquals(0.0, round($tb['totals']['debit'] - $tb['totals']['credit'], 2));
    }

    public function test_unbalanced_entry_cannot_be_posted(): void
    {
        $accounts = SystemAccounts::ensureForHost(TenantManager::id());
        $journal = app(JournalServiceInterface::class);

        $draft = $journal->createDraft([
            'entry_date' => now()->toDateString(),
            'description' => 'Unbalanced',
            'lines' => [
                ['account_id' => $accounts[SystemAccounts::CASH], 'debit' => 500],
                ['account_id' => $accounts[SystemAccounts::SALES], 'credit' => 400],
            ],
        ]);

        $this->expectException(\DomainException::class);
        $journal->post($draft);
    }

    public function test_reverse_undoes_the_balance(): void
    {
        $accounts = SystemAccounts::ensureForHost(TenantManager::id());
        $journal = app(JournalServiceInterface::class);

        $entry = $journal->record([
            'entry_date' => now()->toDateString(),
            'description' => 'Cash expense',
            'lines' => [
                ['account_id' => $accounts[SystemAccounts::EXPENSE], 'debit' => 250],
                ['account_id' => $accounts[SystemAccounts::CASH], 'credit' => 250],
            ],
        ], 1);

        $cashBefore = (float) Account::find($accounts[SystemAccounts::CASH])->current_balance;

        $journal->reverse($entry);

        $cashAfter = (float) Account::find($accounts[SystemAccounts::CASH])->current_balance;
        $this->assertEquals($cashBefore, $cashAfter);
        $this->assertSame('reversed', $entry->fresh()->status->value);
    }

    public function test_accounts_are_tenant_scoped(): void
    {
        // A second tenant's accounts must never leak into the first tenant.
        $other = Host::create(['name' => 'Other Tenant']);
        TenantManager::setId($other->id);
        SystemAccounts::ensureForHost($other->id);
        TenantManager::setId(Host::first()->id);

        $this->assertCount(6, Account::all());
    }
}
