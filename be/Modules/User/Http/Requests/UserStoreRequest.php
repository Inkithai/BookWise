<?php

namespace Modules\User\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Log;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Validation\Rule;
use OpenApi\Annotations as OA;

/**
 * @OA\Schema(
 *     schema="UserStoreRequest",
 *     type="object",
 *     required={"first_name", "last_name", "email", "user_name"},
 *     @OA\Property(property="first_name", type="string", example="Max", maxLength=255),
 *     @OA\Property(property="last_name", type="string", example="Doe", maxLength=255),
 *     @OA\Property(property="email", type="string", format="email", example="max.doe@gmail.com", maxLength=255),
 *     @OA\Property(property="user_name", type="string", example="max-doe", maxLength=255),
 *     @OA\Property(property="phone_number", type="string", example="+1234567890", maxLength=20, nullable=true),
 *     @OA\Property(property="roles", type="integer", example=4),
 *     @OA\Property(property="active", type="integer", example=1)
 *     )
 * )
 */
class UserStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email:rfc,dns|unique:users,email',
            'user_name' => 'required|string|max:255|unique:users,user_name',
            'phone_number'  => [
                'nullable',
                'string',
                'regex:/^[\d\s\+\-\(\)]{5,20}$/',
                'max:20',
                Rule::unique('users', 'phone_number')->whereNotNull('phone_number'),
            ],
            'roles' => 'required|integer|exists:roles,id',
            'active' => 'required|integer'
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('user_name')) {
            $this->merge([
                'user_name' => strtolower(str_replace(' ', '-', (string) $this->input('user_name'))),
            ]);
        }

        if ($this->filled('phone_number') === false) {
            $this->merge(['phone_number' => null]);
        }
    }

    /**
     * Handle failed validation with JSON response.
     */
    protected function failedValidation(Validator $validator)
    {
        Log::warning('UserStoreRequest failed', [
            'errors' => $validator->errors()->toArray(),
            'input' => $this->all(),
        ]);

        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => 'Validation error',
            'errors'  => $validator->errors(),
        ], 422));
    }
}
