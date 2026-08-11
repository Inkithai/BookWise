<?php

namespace Modules\Invoice\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Modules\Invoice\Models\InvoiceClient;

/**
 * @OA\Schema(
 *     schema="UpdateInvoiceClientRequest",
 *     title="Update Invoice Client Request",
 *     description="Request payload for updating an invoice client",
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
class UpdateInvoiceClientRequest extends FormRequest
{
    public ?\Modules\Invoice\Models\InvoiceClient $client = null;

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
        return (int) ($user->host_id ?? 0);
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('client_type')) {
            $this->merge([
                'client_type' => ucfirst(strtolower($this->client_type)),
            ]);
        }

        $nullableFields = [
            'telephone',
            'address_no',
            'address_street',
            'address_city',
            'address_town',
            'address_postcode',
            'address_county',
            'address_country',
            'company_registration_number',
            'vat_number',
            'utr',
        ];

        $normalized = [];
        foreach ($nullableFields as $field) {
            if (! $this->exists($field)) {
                continue;
            }

            $value = $this->input($field);
            if ($value === null || (is_string($value) && trim($value) === '')) {
                $normalized[$field] = null;
            }
        }

        if ($normalized !== []) {
            $this->merge($normalized);
        }
    }
    public function rules(): array
    {
        $user = auth()->user();
        $hostId = $this->resolveActiveHostId($user);
        $teamId = \App\Models\Team::where('host_id', $hostId)->value('id');
        $clientId = $this->route('id');

        $this->client = InvoiceClient::query()
            ->where('host_id', $hostId)
            ->when(!empty($teamId), fn ($q) => $q->where(function ($q2) use ($teamId) {
                $q2->where('team_id', $teamId)->orWhereNull('team_id');
            }))
            ->when(empty($teamId), fn ($q) => $q->whereNull('team_id'))
            ->findOrFail($clientId);

        // Effective client_type (request overrides DB)
        $clientType = $this->input('client_type') ?? $this->client->client_type;

        return [
            'name' => 'required|string|max:100',
            'email' => [
                'required',
                'email',
                'max:100',
                Rule::unique('invoices_clients')
                    ->where(function ($query) use ($hostId, $teamId) {
                        if (!empty($teamId)) {
                            return $query->where('team_id', $teamId);
                        }
                        return $query->where('host_id', $hostId)->whereNull('team_id');
                    })
                    ->ignore($clientId),
            ],
            'telephone' => 'nullable|string|max:100',
            'address_no' => 'nullable|string|max:50',
            'address_street' => 'nullable|string|max:255',
            'address_city' => 'nullable|string|max:100',
            'address_town' => 'nullable|string|max:100',
            'address_postcode' => 'nullable|string|max:20',
            'address_county' => 'nullable|string|max:100',
            'address_country' => 'nullable|string|max:100',

            'client_type' => 'nullable|in:Business,Personal',

             'company_registration_number' => [
            'nullable',
            'string',
            'max:100',
            // Rule::requiredIf(
            //     $clientType === 'Business'
            //     && empty($this->input('company_registration_number'))
            //     && empty($this->client->company_registration_number)
            // ),
            Rule::prohibitedIf($clientType === 'Personal'),
        ],

        'vat_number' => [
            'nullable',
            'string',
            'max:100',
            // Rule::requiredIf(
            //     $clientType === 'Business'
            //     && empty($this->input('vat_number'))
            //     && empty($this->client->vat_number)
            // ),
            Rule::prohibitedIf($clientType === 'Personal'),
        ],

        'utr' => [
            'nullable',
            'string',
            'max:100',
            // Rule::requiredIf(
            //     $clientType === 'Business'
            //     && empty($this->input('utr'))
            //     && empty($this->client->utr)
            // ),
        ],
        ];
    }

    /**
     * Handle failed validation with JSON response.
     */
    protected function failedValidation(Validator $validator)
    {
        Log::warning('UpdateInvoiceClientRequest failed', [
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
