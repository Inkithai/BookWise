<?php

namespace Modules\Banking\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class BankTransactionResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'bank_account_id' => $this->bank_account_id,
            'date' => (string) $this->date,
            'description' => $this->description,
            'amount' => (float) $this->amount,
            'direction' => $this->direction,
            'reference_type' => $this->reference_type,
            'reference_id' => $this->reference_id,
            'journal_entry_id' => $this->journal_entry_id,
            'reconciled' => (bool) $this->reconciled,
            'reconciled_at' => $this->reconciled_at,
        ];
    }
}
