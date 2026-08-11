<?php

namespace Modules\Accounting\Repositories;

use App\Services\TenantManager;
use Modules\Accounting\Models\JournalEntry;
use Modules\Accounting\Models\JournalEntryLine;

class JournalEntryRepository implements JournalEntryInterface
{
    public function __construct(
        private JournalEntry $model,
        private JournalEntryLine $lineModel
    ) {}

    public function all(?array $filters = []): iterable
    {
        $query = $this->model->newQuery()->with('lines.account');

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (! empty($filters['reference_type'])) {
            $query->where('reference_type', $filters['reference_type']);
        }
        if (! empty($filters['from'])) {
            $query->whereDate('entry_date', '>=', $filters['from']);
        }
        if (! empty($filters['to'])) {
            $query->whereDate('entry_date', '<=', $filters['to']);
        }

        return $query->orderByDesc('entry_date')->orderByDesc('id')->get();
    }

    public function find(int $id): ?JournalEntry
    {
        return $this->model->newQuery()->with('lines.account')->find($id);
    }

    public function nextEntryNumber(): string
    {
        $hostId = TenantManager::id();
        $count = $this->model->newQuery()->forTenant($hostId)->count();

        return 'JE-'.str_pad((string) ($count + 1), 6, '0', STR_PAD_LEFT);
    }

    public function create(array $data): JournalEntry
    {
        if (empty($data['host_id'])) {
            $data['host_id'] = TenantManager::id();
        }

        return $this->model->newQuery()->create($data);
    }

    public function createLines(JournalEntry $entry, array $lines): void
    {
        foreach ($lines as $index => $line) {
            $this->lineModel->newQuery()->create([
                'host_id' => $entry->host_id,
                'journal_entry_id' => $entry->id,
                'account_id' => $line['account_id'],
                'description' => $line['description'] ?? null,
                'debit' => (float) ($line['debit'] ?? 0),
                'credit' => (float) ($line['credit'] ?? 0),
                'partner_type' => $line['partner_type'] ?? null,
                'partner_id' => $line['partner_id'] ?? null,
                'reference_type' => $line['reference_type'] ?? null,
                'reference_id' => $line['reference_id'] ?? null,
                'line_order' => $line['line_order'] ?? $index,
            ]);
        }
    }

    public function update(int $id, array $data): JournalEntry
    {
        $entry = $this->model->newQuery()->findOrFail($id);
        $entry->update($data);

        return $entry->fresh();
    }

    public function delete(int $id): bool
    {
        return (bool) $this->model->newQuery()->findOrFail($id)->delete();
    }
}
