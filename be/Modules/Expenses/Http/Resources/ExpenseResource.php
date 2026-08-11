<?php

namespace Modules\Expenses\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ExpenseResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'host_id' => $this->host_id,
            'category_id' => $this->category_id,
            'account_id' => $this->account_id,
            'vendor_id' => $this->vendor_id,
            'bank_account_id' => $this->bank_account_id,
            'date' => (string) $this->date,
            'description' => $this->description,
            'amount' => (float) $this->amount,
            'payment_method' => $this->payment_method,
            'reference_type' => $this->reference_type,
            'reference_id' => $this->reference_id,
            'journal_entry_id' => $this->journal_entry_id,
        ];
    }
}
