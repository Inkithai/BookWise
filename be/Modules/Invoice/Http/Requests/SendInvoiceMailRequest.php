<?php

namespace Modules\Invoice\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Log;

/**
 * @OA\Schema(
 *     schema="SendInvoiceMailRequest",
 *     type="object",
 *     required={"id","type","email","name"},
 *
 *     @OA\Property(property="id", type="integer", example=1, description="Invoice ID"),
 *     @OA\Property(property="name", type="string", example="Test", description="Client name"),
 *     @OA\Property(property="type", type="string", enum={"invoice","receipt"}, example="invoice", description="Type of document"),
 *     @OA\Property(
 *         property="email",
 *         type="array",
 *
 *         @OA\Items(type="string", example="test@gmail.com"),
 *         description="Array of recipient emails"
 *     ),
 *
 *     @OA\Property(property="subject", type="string", example="Invoice INV-1234 from Acme Ltd.", description="Custom email subject for the invoice/receipt email"),
 *     @OA\Property(property="additional_info", type="string", example="Hi Test, <br><br>Please find your invoice.<br><br>Thank you.", description="Optional custom message to include in the email body"),
 *     @OA\Property(
 *         property="files",
 *         type="array",
 *
 *         @OA\Items(type="string", format="binary"),
 *         description="Optional attachments"
 *     )
 * )
 */
class SendInvoiceMailRequest extends FormRequest
{
    public function authorize()
    {
        return true; // Adjust authorization as needed
    }

    protected function prepareForValidation()
    {
        if ($this->has('additional_info') && is_string($this->input('additional_info'))) {
            $cleanAdditionalInfo = strip_tags($this->input('additional_info'));
            $cleanAdditionalInfo = trim(preg_replace('/\r\n|\r/', "\n", $cleanAdditionalInfo));
            $this->merge(['additional_info' => $cleanAdditionalInfo]);
        }
    }

    public function rules()
    {
        return [
            'id' => 'required|integer|exists:invoices,id',
            'type' => 'required|string|in:invoice,receipt',
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                function ($attribute, $value, $fail) {
                    // Convert comma-separated string to array
                    $emails = is_string($value) ? explode(',', $value) : (array) $value;

                    foreach ($emails as $email) {
                        if (! filter_var(trim($email), FILTER_VALIDATE_EMAIL)) {
                            $fail('The ' . $attribute . ' contains an invalid email address: ' . $email);
                        }
                    }
                },
            ],
            'subject' => 'nullable|string|max:255',
            'additional_info' => 'nullable|string',
            'files.*' => 'nullable|file|mimes:pdf,jpg,png,doc,docx|max:10240',
            'payment_link_enabled' => ['nullable', 'boolean']
        ];
    }

    /**
     * Handle failed validation with JSON response.
     */
    protected function failedValidation(Validator $validator)
    {
        Log::warning('SendInvoiceMailRequest failed', [
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
