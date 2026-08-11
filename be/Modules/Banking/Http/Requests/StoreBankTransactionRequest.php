<?php

namespace Modules\Banking\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBankTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'bank_account_id' => ['required', 'exists:bank_accounts,id'],
            'date' => ['required', 'date'],
            'description' => ['nullable', 'string'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'offset_account_id' => ['required', 'exists:accounts,id'],
            'reference_type' => ['nullable', 'string', 'max:30'],
            'reference_id' => ['nullable', 'integer'],
        ];
    }
}
