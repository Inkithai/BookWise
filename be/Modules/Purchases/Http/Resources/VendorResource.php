<?php

namespace Modules\Purchases\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class VendorResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'host_id' => $this->host_id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'tax_id' => $this->tax_id,
            'address' => $this->address,
            'currency' => $this->currency,
            'opening_balance' => (float) $this->opening_balance,
            'account_id' => $this->account_id,
            'note' => $this->note,
        ];
    }
}
