<?php

namespace Modules\Expenses\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ExpenseCategoryResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'host_id' => $this->host_id,
            'name' => $this->name,
            'description' => $this->description,
            'account_id' => $this->account_id,
            'tax_rate' => $this->tax_rate,
        ];
    }
}
