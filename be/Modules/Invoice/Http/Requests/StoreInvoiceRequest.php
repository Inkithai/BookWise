<?php

namespace Modules\Invoice\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Modules\Invoice\Models\InvoiceType;

/**
 * @OA\Schema(
 *     schema="StoreInvoiceRequest",
 *     title="Store Invoice Request",
 *     description="Request body for creating or updating an invoice",
 *     required={"invoice_code", "client_id", "type_id", "pdf_type", "due_date", "total_amount", "final_amount"},
 *     @OA\Property(property="client_id", type="integer", example=1),
 *     @OA\Property(property="type_id", type="integer", example=1),
 *     @OA\Property(property="pdf_type", type="string", example="classic"),
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
 *     @OA\Property(
 *         property="items",
 *         type="array",
 *         description="List of invoice items",
 *
 *         @OA\Items(
 *             type="object",
 *             required={"name", "type", "price", "quantity", "total_amount"},
 *
 *             @OA\Property(property="name", type="string", example="Consulting Services"),
 *             @OA\Property(property="type", type="string", enum={"product", "service", "cleaning"}, example="service"),
 *             @OA\Property(property="currency", type="string", example="GBP"),
 *             @OA\Property(property="price", type="number", format="float", example=1000),
 *             @OA\Property(property="quantity", type="number", format="float", example=1),
 *             @OA\Property(property="discount", type="number", format="float", example=10),
 *             @OA\Property(property="discount_value", type="number", format="float", example=100),
 *             @OA\Property(property="vat", type="number", format="float", example=15),
 *             @OA\Property(property="vat_value", type="number", format="float", example=150),
 *             @OA\Property(property="total_amount", type="number", format="float", example=1050)
 *         )
 *     ),
 *     @OA\Property(property="total_amount", type="number", format="float", example=12000.75),
 *     @OA\Property(property="total_vat", type="number", format="float", example=1200.50),
 *     @OA\Property(property="total_discount", type="number", format="float", example=500.00),
 *     @OA\Property(property="final_amount", type="number", format="float", example=12700.25)
 * )
 */
class StoreInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare data before validation (normalize items)
     */
    protected function prepareForValidation(): void
    {
        $items = $this->input('items');

        // Decode if items sent as JSON string
        if (is_string($items)) {
            $decoded = json_decode($items, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $items = $decoded;
            }
        }

        // Filter and normalize valid item entries
        if (is_array($items)) {
            $items = array_values(array_filter($items, function ($item) {
                return is_array($item) && !empty($item['name']);
            }));
        } else {
            $items = [];
        }

        Log::info('Normalized invoice items before validation', ['items' => $items]);

        $this->merge(['items' => $items]);
    }

    /**
     * Validation rules
     */
    public function rules(): array
    {
        return [
            'company_id' => 'required|integer|min:1',
            'client_id' => 'required|integer|exists:invoices_clients,id',
            'type_id' => 'required|integer|exists:invoices_types,id',
            // 'invoice_code' => 'required|string|max:100',
            'invoice_code' => [
                'nullable',
                'string',
                'max:100',
                function ($attribute, $value, $fail) {
                    if ($value && $this->company_id) {
                        $exists = \Modules\Invoice\Models\Invoice::where('code', $value)
                            ->where('company_id', $this->company_id)
                            ->exists();
                        if ($exists) {
                            $fail('This invoice number already exists for this company. Please use a different number.');
                        }
                    }
                },
            ],
            'pdf_type' => 'required|string|max:100',
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
            'due_date' => 'nullable|date|after_or_equal:invoice_date',
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

            'total_amount' => 'required|numeric|min:0',
            'total_vat' => 'nullable|numeric|min:0',
            'total_discount' => 'nullable|numeric|min:0',
            'final_amount' => 'required|numeric|min:0',

            'items' => 'required|array|min:1',
            'items.*.project_reference' => 'nullable|string|max:255',
            'items.*.name' => 'required|string|max:255',
            'items.*.type' => 'required|string|in:product,service,cleaning',
            'items.*.currency' => 'required|string|max:255',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.quantity' => 'required|numeric|min:1',
            'items.*.discount' => 'nullable|numeric|min:0',
            'items.*.discount_value' => 'nullable|numeric|min:0',
            'items.*.vat' => 'nullable|numeric|min:0',
            'items.*.vat_value' => 'nullable|numeric|min:0',
            'items.*.total_amount' => 'required|numeric|min:0',
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
            'cis_enabled' => 'nullable|boolean',
            'client_utr' => 'nullable|string',

            // 2026-04-29 — ALL-Accounts View flag
            'all_accounts_view' => 'nullable|boolean',
        ];
    }

    /**
     * Custom messages for better UX
     */
    public function messages(): array
    {
        return [
            'items.required' => 'At least one item must be provided.',
            'items.*.type.in' => 'Item type must be one of: product, service, or cleaning.',
            'items.*.name.required' => 'Each item must have a name.',
            'items.*.price.required' => 'Each item must include a price.',
            'items.*.quantity.required' => 'Each item must include a quantity.',
            'items.*.total_amount.required' => 'Each item must include a total amount.',
        ];
    }

    /**
     * Handle validation failure
     */
    protected function failedValidation(Validator $validator): void
    {
        Log::warning('StoreInvoiceRequest failed validation', [
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
        if (!$this->type_id) {
            Log::info('isQuotation check skipped — no type_id');
            return false;
        }

        $isQuotation = InvoiceType::where('id', $this->type_id)
            ->where('name', 'Quotation')
            ->exists();

        Log::info('isQuotation evaluated', [
            'type_id' => $this->type_id,
            'result' => $isQuotation,
        ]);

        return $isQuotation;
    }
}
