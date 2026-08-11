<?php

namespace Modules\Accounting\Http\Requests;

use App\Enums\AccountType;
use App\Enums\NormalBalance;
use App\Services\TenantManager;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $hostId = TenantManager::id();
        $ignore = $this->route('id');

        return [
            'code' => [
                'required', 'string', 'max:30',
                Rule::unique('accounts', 'code')->where('host_id', $hostId)->ignore($ignore),
            ],
            'name' => ['required', 'string', 'max:191'],
            'type' => ['required', Rule::in(AccountType::values())],
            'sub_type' => ['nullable', 'string', 'max:60'],
            'normal_balance' => ['nullable', Rule::in(NormalBalance::values())],
            'parent_id' => ['nullable', 'exists:accounts,id'],
            'description' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
            'opening_balance' => ['nullable', 'numeric'],
            'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'account_group' => ['nullable', 'string', 'max:60'],
        ];
    }
}
