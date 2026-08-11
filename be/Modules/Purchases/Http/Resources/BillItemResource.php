<?php

namespace Modules\Purchases\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class BillItemResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'description' => $this->description,
            'quantity' => (float) $this->quantity,
            'unit_price' => (float) $this->unit_price,
            'tax_rate' => (float) $this->tax_rate,
            'amount' => (float) $this->amount,
            'account_id' => $this->account_id,
        ];
    }
}
