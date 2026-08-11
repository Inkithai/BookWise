<?php

namespace Modules\Role\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Log;

/**
 * @OA\Schema(
 *     schema="UpdateRoleRequest",
 *     required={"name"},
 *     @OA\Property(
 *         property="name",
 *         type="string",
 *         example="sub-leads",
 *         description="The new unique name for the role"
 *     )
 * )
 */


class UpdateRoleRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        $hostId = $this->user()?->active_company_id
            ?? $this->user()?->host_id
            ?? null;

        return [
            'name' => 'required|string|unique:roles,name,' . $this->route('id') . ',id,host_id,' . $hostId,
        ];
    }

       /**
     * Handle failed validation with JSON response.
     */
    protected function failedValidation(Validator $validator)
    {
        Log::warning('UpdateRoleRequest failed', [
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
