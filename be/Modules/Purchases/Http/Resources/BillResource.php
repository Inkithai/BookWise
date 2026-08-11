<?php

namespace Modules\Purchases\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class BillResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'host_id' => $this->host_id,
            'vendor_id' => $this->vendor_id,
            'vendor' => $this->whenLoaded('vendor', fn () => ['id' => $this->vendor->id, 'name' => $this->vendor->name]),
            'bill_number' => $this->bill_number,
            'bill_date' => (string) $this->bill_date,
            'due_date' => $this->due_date ? (string) $this->due_date : null,
            'status' => $this->status,
            'subtotal' => (float) $this->subtotal,
            'tax_amount' => (float) $this->tax_amount,
            'total' => (float) $this->total,
            'amount_paid' => (float) $this->amount_paid,
            'account_id' => $this->account_id,
            'journal_entry_id' => $this->journal_entry_id,
            'note' => $this->note,
            'items' => BillItemResource::collection($this->whenLoaded('items')),
        ];
    }
}
