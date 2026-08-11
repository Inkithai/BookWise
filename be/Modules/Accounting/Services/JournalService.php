<?php

namespace Modules\Accounting\Services;

use App\Enums\JournalEntryStatus;
use Illuminate\Support\Facades\DB;
use Modules\Accounting\Models\JournalEntry;
use Modules\Accounting\Models\JournalEntryLine;
use Modules\Accounting\Repositories\JournalEntryInterface;

/**
 * Double-entry journal lifecycle: draft -> posted -> (reversed).
 *
 * Posting is the only moment account balances change, and it is guarded by a
 * balanced-debits/credits check so the ledger can never drift out of balance.
 */
class JournalService implements JournalServiceInterface
{
    public function __construct(
        private AccountBalanceService $balance,
        private JournalEntryInterface $entries
    ) {}

    public function createDraft(array $data, ?int $userId = null): JournalEntry
    {
        return DB::transaction(function () use ($data, $userId) {
            $entry = $this->entries->create([
                'entry_number' => $this->entries->nextEntryNumber(),
                'entry_date' => $data['entry_date'],
                'reference_type' => $data['reference_type'] ?? null,
                'reference_id' => $data['reference_id'] ?? null,
                'description' => $data['description'] ?? null,
                'status' => JournalEntryStatus::Draft->value,
                'created_by' => $userId,
            ]);

            $this->entries->createLines($entry, $data['lines'] ?? []);

            return $entry->load('lines.account');
        });
    }

    public function updateDraft(JournalEntry $entry, array $data): JournalEntry
    {
        if ($entry->isPosted()) {
            throw new \DomainException('Posted journal entries cannot be edited. Reverse the entry instead.');
        }

        return DB::transaction(function () use ($entry, $data) {
            $entry->update([
                'entry_date' => $data['entry_date'] ?? $entry->entry_date,
                'reference_type' => $data['reference_type'] ?? $entry->reference_type,
                'reference_id' => $data['reference_id'] ?? $entry->reference_id,
                'description' => $data['description'] ?? $entry->description,
            ]);

            $entry->lines()->delete();
            $this->entries->createLines($entry, $data['lines'] ?? []);

            return $entry->load('lines.account');
        });
    }

    public function post(JournalEntry $entry): JournalEntry
    {
        if ($entry->isPosted()) {
            return $entry;
        }

        $entry->load('lines');
        $this->assertBalanced($entry);

        return DB::transaction(function () use ($entry) {
            foreach ($entry->lines as $line) {
                $this->balance->apply($line);
            }

            $entry->status = JournalEntryStatus::Posted;
            $entry->posted_at = now();
            $entry->total_amount = (float) $entry->lines->sum('debit');
            $entry->save();

            return $entry->load('lines.account');
        });
    }

    public function record(array $data, ?int $userId = null): JournalEntry
    {
        $entry = $this->createDraft($data, $userId);

        return $this->post($entry);
    }

    public function reverse(JournalEntry $entry): JournalEntry
    {
        if (! $entry->isPosted()) {
            throw new \DomainException('Only posted entries can be reversed.');
        }

        if ($entry->status === JournalEntryStatus::Reversed) {
            throw new \DomainException('Entry is already reversed.');
        }

        return DB::transaction(function () use ($entry) {
            $reversalLines = $entry->lines->map(function (JournalEntryLine $line) {
                return [
                    'account_id' => $line->account_id,
                    'description' => 'Reversal: '.$line->description,
                    'debit' => $line->credit,
                    'credit' => $line->debit,
                    'partner_type' => $line->partner_type,
                    'partner_id' => $line->partner_id,
                    'reference_type' => $line->reference_type,
                    'reference_id' => $line->reference_id,
                ];
            })->all();

            // createDraft + post() applies the swapped lines, which undoes the
            // original entry's effect on account balances.
            $reversal = $this->record([
                'entry_date' => now()->toDateString(),
                'description' => 'Reversal of '.$entry->entry_number,
                'reference_type' => 'journal',
                'reference_id' => $entry->id,
                'lines' => $reversalLines,
            ], $entry->created_by);

            $entry->status = JournalEntryStatus::Reversed;
            $entry->reversed_entry_id = $reversal->id;
            $entry->save();

            return $entry->load('reversedEntry');
        });
    }

    public function deleteDraft(JournalEntry $entry): void
    {
        if ($entry->isPosted()) {
            throw new \DomainException('Posted journal entries cannot be deleted. Reverse the entry instead.');
        }

        $entry->delete();
    }

    private function assertBalanced(JournalEntry $entry): void
    {
        $debits = (float) $entry->lines->sum('debit');
        $credits = (float) $entry->lines->sum('credit');

        if (abs($debits - $credits) > 0.005) {
            throw new \DomainException(
                "Journal entry {$entry->entry_number} is not balanced: debits ".number_format($debits, 2).
                ' != credits '.number_format($credits, 2)
            );
        }
    }
}
