<?php

namespace Modules\Invoice\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;


/**
 * @OA\Schema(
 *     schema="InvoiceMailResource",
 *     type="object",
 *     @OA\Property(property="success", type="boolean", example=true),
 *     @OA\Property(property="message", type="string", example="Invoice sent successfully"),
 *     @OA\Property(property="invoice_id", type="integer", example=202),
 *     @OA\Property(property="emails", type="array", @OA\Items(type="string"), example={"accounts@acmecorp.com"}),
 *     @OA\Property(property="status", type="string", example="MailSent")
 * )
 */
class InvoiceMailResource extends JsonResource
{
    public function toArray($request)
    {
        return parent::toArray($request);
    }
}
