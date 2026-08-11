<?php

namespace Modules\Invoice\Http\Resources;

use App\Models\HostUserDetail;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;
use Modules\User\Models\User as InvoiceUser;

/**
 * @OA\Schema(
 *     schema="InvoiceResource",
 *     type="object",
 *     title="Invoice Resource",
 *     description="Invoice details returned from the API",
 *
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="code", type="string", example="INV-0001"),
 *     @OA\Property(property="client", type="string", example="Acme Ltd"),
 *     @OA\Property(property="invoice_type", type="string", example="General"),
 *     @OA\Property(property="invoice_date", type="string", format="date", example="2024-07-10"),
 *     @OA\Property(property="due_date", type="string", format="date", example="2024-07-20"),
 *     @OA\Property(property="total_amount", type="number", format="float", example=5000.00),
 *     @OA\Property(property="total_discount", type="number", format="float", example=200.00),
 *     @OA\Property(property="total_vat", type="number", format="float", example=150.75),
 *     @OA\Property(property="final_amount", type="number", format="float", example=4800.00),
 *     @OA\Property(property="status", type="string", example="Paid"),
 *     @OA\Property(property="created_by", type="string", example="Admin"),
 *     @OA\Property(property="quotation_title",type="string",example="Quotation for Consulting Services - Acme Ltd",description="Title of the quotation. Only present if invoice type is Quotation."),
 *     @OA\Property(property="quotation_content",type="string",example="This quotation includes room service charges, cleaning services, and taxes for the month of November 2025. Total estimated cost: GBP 12700.25.",description="Detailed content of the quotation. Only present if invoice type is Quotation."),
 *     @OA\Property(
 *          property="items",
 *          type="array",
 *
 *          @OA\Items(ref="#/components/schemas/InvoiceItemResource")
 *     )
 * )
 */
class InvoiceResource extends JsonResource
{
    public function toArray($request)
    {
        $userRelation = $this->relationLoaded('user') ? $this->user : null;

        $resolvedHostId = (int) (
            $this->host_id
            ?? $this->company_id
            ?? optional($userRelation)->host_id
            ?? 0
        );
        $senderUser = $resolvedHostId > 0
            ? (InvoiceUser::primaryBillingUserForHost($resolvedHostId) ?? $userRelation)
            : ($userRelation ?? auth()->user());

        $hostDetails = collect();
        if ($resolvedHostId > 0) {
            $hostDetails = HostUserDetail::query()
                ->where('host_id', $resolvedHostId)
                ->where('type', 'company_details')
                ->get()
                ->unique('name')
                ->keyBy('name');
        }
        $detailValue = function (string $key) use ($hostDetails) {
            if (!isset($hostDetails[$key])) {
                return null;
            }
            return $hostDetails[$key]->values ?? $hostDetails[$key]->files ?? null;
        };

        return [
            'id' => $this->id,
            'code' => $this->code,
            // API compatibility: prefer explicit company_id if present, otherwise expose selected host/company context id.
            'company_id' => $this->company_id !== null ? (int) $this->company_id : ($this->host_id !== null ? (int) $this->host_id : null),
            'host_id' => $this->host_id !== null ? (int) $this->host_id : null,
            'client' => optional($this->client)->name ?? $this->client_name ?? null,
            'invoice_type' => optional($this->type)->name ?? null,
            'pdf_type' => $this->pdf_type,

            // Return full public URL for PDF file if exists
            'pdf_file' => $this->pdf_file
                ? Storage::disk('public')->url($this->pdf_file)
                : null,

            'invoice_date' => $this->invoice_date,
            'due_date' => $this->due_date,
            'total_amount' => (float) $this->total_amount,
            'total_discount' => (float) $this->total_discount,
            'total_vat' => (float) $this->total_vat,
            'final_amount' => (float) $this->final_amount,
            'status' => $this->status ?? 'N/A',
            'quotation_title' => $this->quotation_title ?? null,
            'quotation_content' => $this->quotation_content ?? null,

            // Fixed created_by to handle null user safely
            'created_by' => optional($userRelation)->first_name || optional($userRelation)->last_name
                ? trim((optional($userRelation)->first_name ?? '') . ' ' . (optional($userRelation)->last_name ?? ''))
                : 'N/A',

            // Include related invoice items
            'items' => InvoiceItemResource::collection(
                $this->whenLoaded('items', function () {
                    return $this->items
                        ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
                        ->values();
                })
            ),
            'payment_link' => $this->payment_link,
            'bank_payment' => $this->bank_payment,
            'account_name' => $this->account_name ?? null,
            'account_number' => $this->account_number ?? null,
            'sort_code' => $this->sort_code ?? null,
            'company_address' => $this->company_address ?? null,
            'cis_tax' => $this->cis_tax ?? 0,
            'cis_enabled' => $this->cis_enabled ?? false,
            'sender_snapshot' => [
                'sender_name' => $senderUser
                    ? trim((string) (($senderUser->first_name ?? '') . ' ' . ($senderUser->last_name ?? '')))
                    : null,
                'sender_company_name' => $detailValue('company_name'),
                'sender_email' => $detailValue('business_email') ?? ($senderUser->email ?? null),
                'sender_phone' => $detailValue('phone_number') ?? ($senderUser->phone_number ?? null),
            ],
            'notes' => $this->notes ?? null
        ];
    }
}
