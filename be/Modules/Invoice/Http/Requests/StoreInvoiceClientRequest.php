<?php

namespace Modules\Invoice\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *     schema="StoreInvoiceClientRequest",
 *     title="Store Invoice Client Request",
 *     description="Request payload for creating a new invoice client",
 *     type="object",
 *     required={"name","email"},
 *
 *     @OA\Property(property="name", type="string", example="John Doe", description="Client full name"),
 *     @OA\Property(property="email", type="string", format="email", example="john@example.com", description="Client email address"),
 *     @OA\Property(property="telephone", type="string", example="+94 77 123 4567", description="Client phone number"),
 *     @OA\Property(property="address_no", type="string", example="123", description="Building/Flat No."),
 *     @OA\Property(property="address_street", type="string", example="Main Street", description="Street name"),
 *     @OA\Property(property="address_city", type="string", example="London", description="City"),
 *     @OA\Property(property="address_town", type="string", example="Westminster", description="Town/Area"),
 *     @OA\Property(property="address_postcode", type="string", example="SW1A 1AA", description="Postal code"),
 *     @OA\Property(property="address_county", type="string", example="Greater London", description="County"),
 *     @OA\Property(property="address_country", type="string", example="United Kingdom", description="Country"),
 *     @OA\Property(property="client_type", type="string", example="business", description="Type of client, e.g., Personal or Business"),
 *     @OA\Property(property="company_registration_number", type="string", example="SC123456", description="Company registration number for business clients"),
 *     @OA\Property(property="vat_number", type="string", example="GB123456789", description="VAT number for business clients"),
 *     @OA\Property(property="utr", type="string", example="1234567890", description="Unique Tax Reference (UTR) for business clients"),
 * )
 */
class StoreInvoiceClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    private function resolveActiveHostId($user): int
    {
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
        // Super-admin is rootless (host_id=null); fall back to first real host.
        if (is_null($user->host_id)) {
            return (int) (\App\Models\Host::orderBy('id')->value('id') ?? 0);
        }
        return (int) $user->host_id;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('client_type')) {
            $this->merge([
                'client_type' => ucfirst(strtolower($this->client_type)),
            ]);
        }
    }
    public function rules(): array
    {
        $user = auth()->user();
        $hostId = $this->resolveActiveHostId($user);
        $teamId = \App\Models\Team::where('host_id', $hostId)->value('id');

        return [
            'name' => 'required|string|max:100',
            'email' => [
                'required',
                'email',
                'max:100',
                Rule::unique('invoices_clients')->where(function ($query) use ($hostId, $teamId) {
                    if (!empty($teamId)) {
                        return $query->where('team_id', $teamId);
                    }
                    return $query->where('host_id', $hostId)->whereNull('team_id');
                }),
            ],
            'telephone' => 'nullable|string|max:100',
            'address_no' => 'nullable|string|max:50',
            'address_street' => 'nullable|string|max:255',
            'address_city' => 'nullable|string|max:100',
            'address_town' => 'nullable|string|max:100',
            'address_postcode' => 'nullable|string|max:20',
            'address_county' => 'nullable|string|max:100',
            'address_country' => 'nullable|string|max:100',
            'client_type' => 'nullable|string|max:100',
            'company_registration_number' => [
                'nullable',
                'string',
                'max:100',
                // 'required_if:client_type,Business',
                'prohibited_if:client_type,Personal',
            ],

            'vat_number' => [
                'nullable',
                'string',
                'max:100',
                // 'required_if:client_type,Business',
                'prohibited_if:client_type,Personal',
            ],

            'utr' => [
                'nullable',
                'string',
                'max:100',
                // 'required_if:client_type,Business',
            ],
        ];
    }

    /**
     * Handle failed validation with JSON response.
     */
    protected function failedValidation(Validator $validator)
    {
        Log::warning('StoreInvoiceClientRequest failed', [
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
