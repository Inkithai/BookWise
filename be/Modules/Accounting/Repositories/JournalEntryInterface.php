<?php

namespace Modules\Accounting\Repositories;

use Modules\Accounting\Models\JournalEntry;

interface JournalEntryInterface
{
    public function all(?array $filters = []): iterable;

    public function find(int $id): ?JournalEntry;

    public function nextEntryNumber(): string;

    public function create(array $data): JournalEntry;

    public function createLines(JournalEntry $entry, array $lines): void;

    public function update(int $id, array $data): JournalEntry;

    public function delete(int $id): bool;
}
