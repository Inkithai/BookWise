<?php

namespace Modules\Banking\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @OA\Schema(schema="BankAccountResource", type="object", title="Bank Account Resource")
 */
class BankAccountResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'host_id' => $this->host_id,
            'account_id' => $this->account_id,
            'name' => $this->name,
            'account_number' => $this->account_number,
            'bank_name' => $this->bank_name,
            'currency' => $this->currency,
            'account_type' => $this->account_type,
            'opening_balance' => (float) $this->opening_balance,
            'current_balance' => (float) $this->current_balance,
            'is_active' => (bool) $this->is_active,
        ];
    }
}
