<?php

namespace Modules\User\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CustomerSupportRequest extends FormRequest
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
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'phone_number' => 'required|string|regex:/^\+[1-9]\d{1,14}$/|max:20',
            'email' => 'required|email:rfc,dns|max:255',
            'problem_category' => 'required|string|max:255',
            'specify_others' => 'required_if:problem_category,Other|nullable|string|max:255',
            'description' => 'required|string',
            'file' => 'nullable|file|max:10240|mimes:pdf,jpg,jpeg,png,doc,docx',
        ];
    }

    /**
     * Get custom error messages for validation rules.
     */
    public function messages(): array
    {
        return [
            'email.email' => 'Please provide a valid email address.',
            'file.max' => 'File size should not exceed 10MB.',
            'file.mimes' => 'File must be a PDF, JPG, PNG, DOC, or DOCX.',
        ];
    }
}
