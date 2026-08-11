<?php

namespace Modules\User\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Log;
use OpenApi\Annotations as OA;

/**
 * @OA\Schema(
 *     schema="CompanyDetailsRequest",
 *     type="object",
 *     required={"company_name"},
 *
 *     @OA\Property(property="company_name", type="string", example="Acme Corp", maxLength=255),
 *     @OA\Property(property="account_name", type="string", example="Max Doe Account", nullable=true),
 *     @OA\Property(property="account_number", type="string", example="1234567890", nullable=true),
 *     @OA\Property(property="sort_code", type="string", example="00-11-22", nullable=true),
 *     @OA\Property(
 *         property="company_logo",
 *         type="file",
 *         format="binary",
 *         description="Upload image file (JPEG, PNG, JPG). Max size 2MB."
 *     ),
 *     @OA\Property(property="business_registration_number", type="string", example="BRN123456", maxLength=255,nullable=true),
 *     @OA\Property(property="years_in_business", type="integer", example=10, minimum=0,nullable=true),
 *     @OA\Property(property="partnerships", type="string", example="Partner1, Partner2", maxLength=500, nullable=true),
 *     @OA\Property(property="service_areas", type="string", example="Area1, Area2", maxLength=500, nullable=true),
 *     @OA\Property(property="company_address", type="string", example="123 Main St, City", maxLength=500),
 *     @OA\Property(property="business_email", type="string", format="email", example="contact@acmecorp.com", maxLength=255),
 *     @OA\Property(property="office_hours", type="string", example="Mon-Fri 9am-5pm", maxLength=255,nullable=true),
 *     @OA\Property(property="company_website", type="string", format="url", example="https://www.acmecorp.com", maxLength=255, nullable=true),
 *     @OA\Property(property="social_media_links_facebook", type="string", format="url", example="https://facebook.com/acmecorp", maxLength=255, nullable=true),
 *     @OA\Property(property="social_media_links_instagram", type="string", format="url", example="https://instagram.com/acmecorp", maxLength=255, nullable=true),
 *     @OA\Property(property="social_media_links_linkedin", type="string", format="url", example="https://linkedin.com/company/acmecorp", maxLength=255, nullable=true),
 *     @OA\Property(property="social_media_links_twitter", type="string", format="url", example="https://twitter.com/acmecorp", maxLength=255, nullable=true),
 *     @OA\Property(property="business_highlights", type="string", example="Leading industry innovator", maxLength=1000, nullable=true),
 *     @OA\Property(property="mission_statement", type="string", example="To innovate and inspire", maxLength=1000, nullable=true),
 *     @OA\Property(property="about_the_company", type="string", example="Detailed description about the company...", maxLength=2000, nullable=true),
 *     @OA\Property(property="stripe_secret_key", type="string", example="sk_test_xxx", nullable=true),
 *     @OA\Property(property="stripe_published_key", type="string", example="pk_test_xxx", nullable=true),
 *     @OA\Property(property="company_currency", type="string", example="GBP", maxLength=100),
 * )
 */
class CompanyDetailsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $user = auth()->user();
        $isCompanyContext = (string) ($user?->active_context_type ?? '') === 'company'
            || (empty($user?->active_context_type) && strtolower((string) ($user?->account_type ?? '')) === 'company');

        return [
            'company_name' => ($isCompanyContext ? 'required' : 'nullable') . '|string|max:255',
            'account_name' => 'nullable|string',
            'account_number' => 'nullable|string',
            'sort_code' => 'nullable|string',
            'company_logo' => 'nullable|image|mimes:jpeg,png,jpg|max:2048',
            'profile_img' => 'nullable|image|mimes:jpeg,png,jpg|max:2048',
            'business_registration_number' => 'nullable|string|max:255',
            'years_in_business' => 'nullable|integer|min:0',
            'partnerships' => 'nullable|string|max:500',
            'service_areas' => 'nullable|string|max:500',
            'company_address' => 'nullable|string|max:500',
            'company_address_nr' => 'nullable|string|max:255',
            'company_address_street' => 'nullable|string|max:255',
            'company_address_city' => 'nullable|string|max:255',
            'company_address_town' => 'nullable|string|max:255',
            'company_address_postcode' => 'nullable|string|max:255',
            'company_address_county' => 'nullable|string|max:255',
            'company_address_country' => 'nullable|string|max:255',
            'business_email' => 'nullable|email:rfc,dns|max:255',
            'office_hours' => 'nullable|string|max:255',
            'company_website' => 'nullable|url|max:255',
            'social_media_links_facebook' => 'nullable|url|max:255',
            'social_media_links_instagram' => 'nullable|url|max:255',
            'social_media_links_linkedin' => 'nullable|url|max:255',
            'social_media_links_twitter' => 'nullable|url|max:255',
            'business_highlights' => 'nullable|string|max:1000',
            'mission_statement' => 'nullable|string|max:1000',
            'about_the_company' => 'nullable|string|max:2000',
            'stripe_secret_key' => 'nullable|string|max:255',
            'stripe_published_key' => 'nullable|string|max:255',
            'company_currency' => 'nullable|string|max:255',
            'vat_no' => 'nullable|string|max:255',

            'stripe_fee_percentage' => 'nullable|numeric|max:99',
            'stripe_fixed_fee' => 'nullable|numeric'
        ];
    }

    /**
     * Handle failed validation with JSON response.
     */
    protected function failedValidation(Validator $validator)
    {
        $logo = $this->file('company_logo');
        Log::warning('CompanyDetailsRequest failed', [
            'errors' => $validator->errors()->toArray(),
            'input' => $this->all(),
            'content_type' => $this->header('content-type'),
            'keys' => array_keys($this->all()),
            'has_company_logo_file' => $this->hasFile('company_logo'),
            'company_logo_file' => $logo ? [
                'original_name' => $logo->getClientOriginalName(),
                'mime' => $logo->getMimeType(),
                'size' => $logo->getSize(),
                'tmp_path' => $logo->getPathname(),
            ] : null,
        ]);

        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => 'Validation error',
            'errors' => $validator->errors(),
        ], 422));
    }
}
