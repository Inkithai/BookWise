<?php

namespace Modules\CustomCRM\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *     schema="CustomTableAttribute",
 *     type="object",
 *     required={"name","type"},
 *
 *     @OA\Property(property="name", type="string", example="student_id"),
 *     @OA\Property(
 *         property="type",
 *         type="string",
 *         enum={"string","integer","float","date","datetime","boolean","text"},
 *         example="string"
 *     ),
 *     @OA\Property(property="is_nullable", type="boolean", example=false),
 *     @OA\Property(property="is_foreign", type="boolean", example=true),
 *     @OA\Property(property="foreign_table_name", type="string", nullable=true, example="students")
 * )
 *
 * @OA\Schema(
 *     schema="UpdateCustomTableRequest",
 *     required={"table_name","attributes"},
 *     type="object",
 *
 *     @OA\Property(
 *         property="table_name",
 *         type="string",
 *         example="leads_table"
 *     ),
 *     @OA\Property(
 *         property="attributes",
 *         type="array",
 *         @OA\Items(ref="#/components/schemas/CustomTableAttribute")
 *     )
 * )
 */
class UpdateCustomTableRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    private function resolveActiveHostId(): int
    {
        $user = auth()->user();
        if (
            (string) ($user->active_context_type ?? 'personal') === 'company'
            && !empty($user->active_company_id)
        ) {
            $company = \App\Models\Company::where('id', (int) $user->active_company_id)
                ->where('owner_user_id', $user->id)
                ->first();
            if ($company && $company->host_id) {
                return (int) $company->host_id;
            }
        }
        return (int) ($user->host_id ?? 0);
    }

    public function rules(): array
    {
        $tableId = $this->route('tableId');
        $hostId = $this->resolveActiveHostId();

        return [
            'table_name' => [
                'required',
                'string',
                Rule::unique('custom_tables', 'name')
                    ->where(fn ($q) => $q->where('host_id', $hostId))
                    ->ignore($tableId),
            ],

            'attributes' => 'required|array|min:1',

            'attributes.*.name' => 'required|string',

            'attributes.*.type' => 'required|string|in:string,integer,float,date,datetime,boolean,text',

            'attributes.*.is_nullable' => 'nullable|boolean',

            'attributes.*.is_foreign' => 'nullable|boolean',

            // Per-item conditional validation for foreign_table_name
            'attributes.*.foreign_table_name' => [
                'nullable',
                'string',
                function ($attribute, $value, $fail) {
                    $index = explode('.', $attribute)[1];

                    if (request("attributes.$index.is_foreign") && empty($value)) {
                        $fail("The foreign_table_name field is required when is_foreign is true (row $index).");
                    }
                }
            ],
        ];
    }

    /**
     * Handle failed validation with JSON response.
     */
    protected function failedValidation(Validator $validator)
    {
        Log::warning('UpdateCustomTableRequest failed', [
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
