<?php

namespace Modules\Accounting\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @OA\Schema(
 *     schema="AccountResource",
 *     type="object",
 *     title="Account Resource",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="code", type="string", example="4000"),
 *     @OA\Property(property="name", type="string", example="Sales Revenue"),
 *     @OA\Property(property="type", type="string", example="income"),
 *     @OA\Property(property="normal_balance", type="string", example="credit"),
 *     @OA\Property(property="current_balance", type="number", format="float", example=12500.50)
 * )
 */
class AccountResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'host_id' => $this->host_id,
            'code' => $this->code,
            'name' => $this->name,
            'type' => $this->type?->value,
            'normal_balance' => $this->normal_balance?->value,
            'sub_type' => $this->sub_type,
            'description' => $this->description,
            'is_system' => (bool) $this->is_system,
            'is_active' => (bool) $this->is_active,
            'opening_balance' => (float) $this->opening_balance,
            'current_balance' => (float) $this->current_balance,
            'tax_rate' => $this->tax_rate,
            'account_group' => $this->account_group,
            'parent_id' => $this->parent_id,
            'created_at' => $this->created_at,
        ];
    }
}
