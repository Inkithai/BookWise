<?php

namespace Modules\CustomCRM\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Log;

/**
 * @OA\Schema(
 *     schema="UploadCsvRequest",
 *     type="object",
 *     required={"csv_file", "table_name"},
 *
 *     @OA\Property(
 *         property="csv_file",
 *         type="file",
 *         description="CSV file to import"
 *     ),
 *     @OA\Property(
 *         property="table_name",
 *         type="string",
 *         example="leads_data"
 *     )
 * )
 */
class UploadCsvRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'csv_file' => 'required|file|mimes:csv,txt',
            'table_name' => 'required|string|max:255|unique:custom_tables,name,except,id',
        ];
    }

    /**
     * Handle failed validation with JSON response.
     */
    protected function failedValidation(Validator $validator)
    {
        Log::warning('UploadCsvRequest failed', [
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
