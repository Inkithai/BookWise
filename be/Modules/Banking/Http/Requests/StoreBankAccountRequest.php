<?php

namespace Modules\Banking\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBankAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:191'],
            'account_number' => ['nullable', 'string', 'max:60'],
            'bank_name' => ['nullable', 'string', 'max:191'],
            'currency' => ['nullable', 'string', 'size:3'],
            'account_type' => ['nullable', Rule::in(['checking', 'savings', 'cash', 'credit_card'])],
            'account_id' => ['nullable', 'exists:accounts,id'],
            'opening_balance' => ['nullable', 'numeric'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}
