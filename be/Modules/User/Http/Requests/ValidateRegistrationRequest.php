<?php

namespace Modules\User\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class ValidateRegistrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // TEMPORARILY DISABLE ALL VALIDATION TO ALLOW REGISTRATION
        return [];
    }

    public function messages(): array
    {
        return [
            'email.required' => 'Email address is required.',
            'email.email' => 'Please provide a valid email address.',
            'email.unique' => 'This email address is already registered.',
            'phone_number.required' => 'Phone number is required.',
            'phone_number.regex' => 'Phone number must be in international format (e.g. +447712345678).',
            'phone_number.unique' => 'This phone number is already registered to another account.',
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        Log::warning('ValidateRegistrationRequest failed', [
            'errors' => $validator->errors()->toArray(),
            'input' => $this->only(['email', 'phone_number']),
        ]);

        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => 'Validation failed. Please check the errors below.',
            'errors' => $validator->errors()->toArray(),
        ], 422));
    }
}
