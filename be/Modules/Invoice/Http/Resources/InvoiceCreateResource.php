<?php

namespace Modules\Invoice\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @OA\Schema(
 *     schema="InvoiceCreateResource",
 *     @OA\Property(property="host_id", type="integer"),
 *     @OA\Property(property="invoice_code", type="string"),
 *     @OA\Property(property="clients", type="array", @OA\Items(type="object")),
 *     @OA\Property(property="invoice_types", type="array", @OA\Items(type="object")),
 * )
 */
class InvoiceCreateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'host_id' => $this['host_id'] ?? null,
            'invoice_code' => $this['invoice_code'] ?? null,
            'clients' => $this['clients'] ?? [],
            'invoice_types' => $this['invoice_types'] ?? [],
        ];
    }
}
