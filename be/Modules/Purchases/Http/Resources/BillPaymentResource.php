<?php

namespace Modules\Purchases\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class BillPaymentResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'bill_id' => $this->bill_id,
            'bank_account_id' => $this->bank_account_id,
            'payment_date' => (string) $this->payment_date,
            'amount' => (float) $this->amount,
            'reference' => $this->reference,
            'journal_entry_id' => $this->journal_entry_id,
        ];
    }
}
