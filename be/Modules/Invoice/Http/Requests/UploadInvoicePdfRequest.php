<?php

namespace Modules\Invoice\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UploadInvoicePdfRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'pdf' => ['required', 'file', 'mimes:pdf', 'max:10240'], // Max 10MB
            'type' => ['required', 'string', 'in:invoice,receipt'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'pdf.required' => 'A PDF file is required.',
            'pdf.file' => 'The uploaded file must be a valid file.',
            'pdf.mimes' => 'The file must be a PDF.',
            'pdf.max' => 'The PDF file size must not exceed 10MB.',
            'type.required' => 'The type field is required.',
            'type.in' => 'The type must be either "invoice" or "receipt".',
        ];
    }
}
