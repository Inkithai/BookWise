<?php

namespace Modules\Invoice\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Log;
use Modules\Invoice\Models\InvoiceType;
use Modules\Invoice\Models\Invoice;

/**
 * @OA\Schema(
 *     schema="UpdateInvoiceRequest",
 *     description="Invoice update request",
 *     required={"invoice_id"},
 *
 *     @OA\Property(property="client_id", type="integer", example=1),
 *     @OA\Property(property="type_id", type="integer", example=1),
 *     @OA\Property(property="pdf_type", type="string", example="modern"),
 *     @OA\Property(property="invoice_date", type="string", format="date", example="2025-11-01"),
 *     @OA\Property(property="due_date", type="string", format="date", example="2025-11-15"),
 *     @OA\Property(
 *         property="quotation_title",
 *         type="string",
 *         example="Quotation for Consulting Services",
 *         description="Required if invoice type is Quotation"
 *     ),
 *     @OA\Property(
 *         property="quotation_content",
 *         type="string",
 *         example="This quotation includes room service charges, cleaning services, and taxes for the month of November 2025. Total estimated cost: GBP 12700.25.",
 *         description="Required if invoice type is Quotation"
 *     ),
 *     @OA\Property(property="status", type="string", example="Created"),
 *     @OA\Property(
 *         property="items",
 *         type="array",
 *
 *         @OA\Items(
 *             type="object",
 *             required={"name", "type", "price", "quantity", "total_amount"},
 *             @OA\Property(property="name", type="string", example="Consulting Services"),
 *             @OA\Property(property="type", type="string", enum={"product", "service", "cleaning"}, example="service"),
 *             @OA\Property(property="currency", type="string", example="GBP"),
 *             @OA\Property(property="price", type="number", example=1000),
 *             @OA\Property(property="quantity", type="number", example=1),
 *             @OA\Property(property="discount", type="number", example=10),
 *             @OA\Property(property="discount_value", type="number", example=100),
 *             @OA\Property(property="vat", type="number", example=15),
 *             @OA\Property(property="vat_value", type="number", example=150),
 *             @OA\Property(property="total_amount", type="number", example=1050)
 *         )
 *     ),
 *     @OA\Property(property="total_amount", type="number", example=12000.75),
 *     @OA\Property(property="total_vat", type="number", example=1200.50),
 *     @OA\Property(property="total_discount", type="number", example=500.00),
 *     @OA\Property(property="final_amount", type="number", example=12700.25)
 * )
 */
class UpdateInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $items = $this->input('items');

        // ✅ Handle JSON-encoded string (from Swagger / Postman)
        if (is_string($items)) {
            $decoded = json_decode($items, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $items = $decoded;
            }
        }

        // ✅ Normalize into clean array
        if (is_array($items)) {
            $items = array_values(array_filter($items, function ($item) {
                return is_array($item) && !empty($item['name']);
            }));
        } else {
            $items = [];
        }

        Log::info('Normalized invoice items before validation (update)', ['items' => $items]);

        $this->merge(['items' => $items]);
    }

    public function rules(): array
    {

        $invoice = Invoice::find($this->route('id'));

        return [
            'company_id' => 'required|integer|min:1',
            'client_id' => 'nullable|integer|exists:invoices_clients,id',
            'type_id' => 'nullable|integer|exists:invoices_types,id',
            'invoice_code' => [
                'nullable',
                'string',
                'max:100',
                function ($attribute, $value, $fail) {
                    if ($value && $this->company_id && $this->route('id')) {
                        $exists = \Modules\Invoice\Models\Invoice::where('code', $value)
                            ->where('company_id', $this->company_id)
                            ->where('id', '!=', $this->route('id'))
                            ->exists();
                        if ($exists) {
                            $fail('This invoice number already exists for this company. Please use a different number.');
                        }
                    }
                },
            ],
            'pdf_type' => 'nullable|string|max:100',
            'status' => 'nullable|string|max:100',
            'due_date' => 'nullable|date|after_or_equal:invoice_date',
            'invoice_date' => [
                'nullable',
                'date',
                function ($attribute, $value, $fail) {
                    $dueDate = $this->input('due_date');
                    if ($dueDate && strtotime($value) > strtotime($dueDate)) {
                        $fail("$attribute must be before or equal to due date.");
                    }
                },
            ],
            'total_amount' => 'nullable|numeric|min:0',
            'total_vat' => 'nullable|numeric|min:0',
            'total_discount' => 'nullable|numeric|min:0',
            'final_amount' => 'nullable|numeric|min:0',
            'quotation_title' => [
                'nullable',
                'string',
                'max:100',
            ],

            'quotation_content' => [
                'nullable',
                'string',
            ],

            'notes' => [
                'nullable',
                'string',
            ],

            // ✅ Items (optional, but if provided must be valid)
            'items' => 'nullable|array|min:1',
            'items.*.name' => 'required_with:items|string|max:255',
            'items.*.project_reference' => 'nullable|string|max:255',
            'items.*.currency' => 'required|string|max:255',
            'items.*.type' => 'required_with:items|string|in:product,service,cleaning',
            'items.*.price' => 'required_with:items|numeric|min:0',
            'items.*.quantity' => 'required_with:items|numeric|min:1',
            'items.*.discount' => 'nullable|numeric|min:0',
            'items.*.discount_value' => 'nullable|numeric|min:0',
            'items.*.vat' => 'nullable|numeric|min:0',
            'items.*.vat_value' => 'nullable|numeric|min:0',
            'items.*.total_amount' => 'required_with:items|numeric|min:0',
            'items.*.custom_fields' => 'nullable|array',
            'items.*.custom_fields.*.key' => 'nullable|string|max:255',
            'items.*.custom_fields.*.value' => 'nullable|string|max:1000',
            'pdf_field_visibility' => 'nullable|array',
            'pdf_field_visibility.project_reference' => 'nullable|boolean',
            'pdf_field_visibility.quantity' => 'nullable|boolean',
            'pdf_field_visibility.price' => 'nullable|boolean',
            'pdf_field_visibility.discount' => 'nullable|boolean',
            'pdf_field_visibility.vat' => 'nullable|boolean',
            'pdf_field_visibility.total' => 'nullable|boolean',
            'pdf_field_visibility.custom_fields' => 'nullable|array',
            'pdf_field_visibility.custom_fields.*' => 'nullable|boolean',


            // 2026-03-03
            'payment_link' => 'nullable|boolean',
            'bank_payment' => 'nullable|boolean',
            'account_name' => 'nullable|string|max:255',
            'account_number' => 'nullable|string|max:50',
            'sort_code' => 'nullable|string|max:20',
            'company_address' => 'nullable|string|max:500',
            'cis_tax' => 'nullable|numeric|max:99',
            'client_utr' => 'nullable|string',
            'cis_enabled' => 'nullable|boolean',

            // 2026-04-29 — ALL-Accounts View flag
            'all_accounts_view' => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'invoice_id.required' => 'Invoice ID is required for updating.',
            'items.*.type.in' => 'Each item type must be one of: product, service, or cleaning.',
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        Log::warning('UpdateInvoiceRequest failed validation', [
            'errors' => $validator->errors()->toArray(),
            'input' => $this->all(),
        ]);

        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => 'Validation error',
            'errors' => $validator->errors(),
        ], 422));
    }

    protected function isQuotation(): bool
    {
        $typeId = $this->type_id; // get type_id from request

        // If type_id is not in request, fetch from invoice table using 'id' query param
        if (!$typeId && $this->route('id')) {
            $invoice = Invoice::find($this->route('id'));
            if ($invoice) {
                $typeId = $invoice->type_id;
                Log::info('Fetched type_id from invoice table', [
                    'invoice_id' => $invoice->id,
                    'type_id' => $typeId,
                ]);
            }
        }

        // If still no type_id, skip
        if (!$typeId) {
            Log::info('isQuotation check skipped — no type_id available');
            return false;
        }

        // Check if type is 'Quotation'
        $isQuotation = InvoiceType::where('id', $typeId)
            ->where('name', 'Quotation')
            ->exists();

        Log::info('isQuotation evaluated', [
            'type_id' => $typeId,
            'result' => $isQuotation,
        ]);

        return $isQuotation;
    }
}
