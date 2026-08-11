<?php

namespace Modules\Accounting\Services;

use Modules\Accounting\Models\JournalEntry;

interface JournalServiceInterface
{
    /**
     * Create a balanced-or-unbalanced draft journal entry (lines not yet posted).
     */
    public function createDraft(array $data, ?int $userId = null): JournalEntry;

    /**
     * Replace the lines of a draft entry.
     */
    public function updateDraft(JournalEntry $entry, array $data): JournalEntry;

    /**
     * Validate balance and post the entry, updating account balances.
     */
    public function post(JournalEntry $entry): JournalEntry;

    /**
     * Create a draft and immediately post it (used by integrated workflows).
     */
    public function record(array $data, ?int $userId = null): JournalEntry;

    /**
     * Create and post a reversing entry, then mark the original reversed.
     */
    public function reverse(JournalEntry $entry): JournalEntry;

    /**
     * Soft-delete a draft entry (posted entries must be reversed, not deleted).
     */
    public function deleteDraft(JournalEntry $entry): void;
}
