<?php

namespace Modules\CustomCRM\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Log;

/**
 * @OA\Schema(
 *     schema="CustomTableRequest",
 *     type="object",
 *     title="Custom Table Request",
 *     description="Query parameters for listing custom tables",
 *
 *     @OA\Property(property="search", type="string", example="leads"),
 *     @OA\Property(property="start", type="integer", example=0),
 *     @OA\Property(property="length", type="integer", example=10),
 *     @OA\Property(property="draw", type="integer", example=1)
 * )
 */
class CustomTableRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Customize if needed
    }

    public function rules(): array
    {
        return [
            'search' => 'nullable|string',
            'length' => 'nullable|integer',
            'start' => 'nullable|integer',
            'draw' => 'nullable|integer',
        ];
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
            'errors' => $validator->errors(),
        ], 422));
    }
}
