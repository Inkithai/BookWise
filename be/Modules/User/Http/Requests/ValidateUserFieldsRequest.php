<?php

namespace Modules\User\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class ValidateUserFieldsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => [
                'required',
                'email', // TEMPORARILY DISABLED DNS check (was email:rfc,dns)
                'max:255',
                // TEMPORARILY DISABLED email uniqueness check
                // function ($attribute, $value, $fail) {
                //     // Trim and lowercase email for case-insensitive comparison
                //     $email = strtolower(trim($value));

                //     // Skip validation if email is empty after trim
                //     if (empty($email)) {
                //         return;
                //     }

                //     $exists = \Modules\User\Models\User::whereRaw('LOWER(TRIM(email)) = ?', [$email])
                //         ->whereNull('deleted_at')
                //         ->exists();
                //     if ($exists) {
                //         $fail('This email address is already registered.');
                //     }
                // },
            ],
            'user_name' => [
                'required',
                'string',
                'max:255',
                function ($attribute, $value, $fail) {
                    $exists = \Modules\User\Models\User::where('user_name', $value)
                        ->whereNull('deleted_at')
                        ->exists();
                    if ($exists) {
                        $fail('This username is already taken.');
                    }
                },
            ],
            'phone_number' => [
                'nullable',
                'string',
                'regex:/^[\d\s\+\-\(\)]{5,20}$/',
                'max:20',
                function ($attribute, $value, $fail) {
                    if (empty($value)) return;
                    $exists = \Modules\User\Models\User::where('phone_number', $value)
                        ->whereNull('deleted_at')
                        ->exists();
                    if ($exists) {
                        $fail('This phone number is already registered to another account.');
                    }
                },
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'This email address is already registered.',
            'user_name.unique' => 'This username is already taken.',
            'phone_number.unique' => 'This phone number is already registered to another account.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('user_name')) {
            $this->merge([
                'user_name' => strtolower(str_replace(' ', '-', (string) $this->input('user_name'))),
            ]);
        }
    }

    protected function failedValidation(Validator $validator): void
    {
        Log::warning('ValidateUserFieldsRequest failed', [
            'errors' => $validator->errors()->toArray(),
            'input' => $this->only(['email', 'user_name', 'phone_number']),
        ]);

        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => 'One or more fields are already in use.',
            'errors' => $validator->errors(),
        ], 422));
    }
}
