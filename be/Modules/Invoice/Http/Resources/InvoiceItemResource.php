<?php

namespace Modules\Invoice\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @OA\Schema(
 *     schema="InvoiceItemResource",
 *     type="object",
 *     title="Invoice Item Resource",
 *     description="Invoice item details returned from the API",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="invoice_id", type="integer", example=1),
 *     @OA\Property(property="name", type="string", example="Consulting Services"),
 *     @OA\Property(property="type", type="string", example="service"),
 *     @OA\Property(property="currency", type="string", example="GBP"),
 *     @OA\Property(property="price", type="number", format="float", example=2500),
 *     @OA\Property(property="quantity", type="integer", example=2),
 *     @OA\Property(property="discount", type="number", format="float", nullable=true, example=10),
 *     @OA\Property(property="discount_value", type="number", format="float", nullable=true, example=500),
 *     @OA\Property(property="vat", type="number", format="float", nullable=true, example=5),
 *     @OA\Property(property="vat_value", type="number", format="float", nullable=true, example=125),
 *     @OA\Property(property="total", type="number", format="float", example=4625)
 * )
 */
class InvoiceItemResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'invoice_id' => $this->invoice_id,
            'name' => $this->item_name,
            'type' => $this->type,
            'currency' => $this->item_currency,
            'price' => $this->item_price,
            'quantity' => $this->item_quantity,
            'discount' => $this->item_discount,
            'discount_value' => $this->item_discount_value,
            'vat' => $this->item_vat,
            'vat_value' => $this->item_vat_value,
            'total' => $this->item_final_price,
            'project_reference' => $this->project_reference ?? null,
            'custom_fields' => is_array($this->custom_fields) ? $this->custom_fields : [],
        ];
    }
}
