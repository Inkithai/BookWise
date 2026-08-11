<?php

namespace Modules\User\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Log;
use OpenApi\Annotations as OA;

/**
 * @OA\Schema(
 *     schema="UserUpdateRequest",
 *     type="object",
 *     required={"first_name", "last_name", "email", "user_name", "roles", "active"},
 *
 *     @OA\Property(property="first_name", type="string", example="Max", maxLength=255),
 *     @OA\Property(property="last_name", type="string", example="Doe", maxLength=255),
 *     @OA\Property(property="email", type="string", format="email", example="max.doe@gmail.com", maxLength=255),
 *     @OA\Property(property="user_name", type="string", example="maxdoe", maxLength=255),
 *     @OA\Property(property="phone_number", type="string", example="+1234567890", maxLength=20, nullable=true),
 *     @OA\Property(property="company_designation", type="string", maxLength=255, example="Lead Manager", nullable=true),
 *     @OA\Property(property="short_bio", type="string", example="Short biography about the user", nullable=true),
 *     @OA\Property(property="location", type="string", example="New York", nullable=true),
 *     @OA\Property(property="profile_img", type="string", format="binary", description="JPEG, PNG, JPG max 2MB", nullable=true),
 *     @OA\Property(property="is_remove", type="string", example="1,0", maxLength=10),
 *     @OA\Property(property="roles", type="integer", example=4),
 *     @OA\Property(property="active", type="integer", example=1)
 * )
 */
class UserUpdateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Allow all authenticated users, or implement your own policy
        return true;
    }

    /**
     * Define validation rules for updating a user.
     */
    public function rules(): array
    {
        $userId = $this->route('id'); // capture user id from route /users/{id}

        return [
            'first_name' => 'sometimes|string|max:255',
            'last_name'  => 'sometimes|string|max:255',
            'email' => ['sometimes', 'email:rfc,dns', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            'user_name'  => ['sometimes', 'string', 'max:255'],
            'phone_number' => 'nullable|string|regex:/^\+[1-9]\d{1,14}$/|max:20',
            'company_designation' => 'nullable|string|max:255',
            'short_bio' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'profile_img' => 'nullable|image|mimes:jpeg,png,jpg|max:2048', // 2MB limit
            'roles' => 'sometimes|integer|exists:roles,id',
            'active' => 'sometimes|integer|in:0,1',
            'is_remove' => 'nullable|boolean'
        ];
    }

    /**
     * Handle failed validation with JSON response.
     */
    protected function failedValidation(Validator $validator)
    {
        Log::warning('UserUpdateRequest validation failed', [
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
