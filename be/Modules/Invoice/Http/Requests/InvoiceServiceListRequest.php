<?php

namespace Modules\Invoice\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Log;

/**
 * @OA\Schema(
 *     schema="InvoiceServiceListRequest",
 *     required={"name", "type", "price", "quantity", "total_amount"},
 *
 *     @OA\Property(property="name", type="string", example="Consulting Services"),
 *     @OA\Property(property="type", type="string", example="service"),
 *     @OA\Property(property="price", type="number", format="float", example=1000),
 *     @OA\Property(property="quantity", type="number", format="float", example=1),
 *     @OA\Property(property="discount", type="number", format="float", nullable=true, example=10),
 *     @OA\Property(property="discount_value", type="number", format="float", nullable=true, example=100),
 *     @OA\Property(property="vat", type="number", format="float", nullable=true, example=15),
 *     @OA\Property(property="vat_value", type="number", format="float", nullable=true, example=150),
 *     @OA\Property(property="total_amount", type="number", format="float", example=1050)
 * )
 */
class InvoiceServiceListRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:service,product,cleaning',
            'price' => 'required|numeric|min:0',
            'quantity' => 'required|numeric|min:1',
            'discount' => 'nullable|numeric|min:0',
            'discount_value' => 'nullable|numeric|min:0',
            'vat' => 'nullable|numeric|min:0',
            'vat_value' => 'nullable|numeric|min:0',
            'total_amount' => 'required|numeric|min:0',
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        Log::warning('InvoiceServiceListRequest failed validation', [
            'errors' => $validator->errors()->toArray(),
            'input' => $this->all(),
        ]);

        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => 'Validation error',
            'errors' => $validator->errors(),
        ], 422));
    }
}
