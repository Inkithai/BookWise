<?php

namespace Modules\Expenses\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreExpenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category_id' => ['nullable', 'exists:expense_categories,id'],
            'account_id' => ['nullable', 'exists:accounts,id'],
            'vendor_id' => ['nullable', 'exists:vendors,id'],
            'bank_account_id' => ['nullable', 'exists:bank_accounts,id'],
            'date' => ['required', 'date'],
            'description' => ['nullable', 'string'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['nullable', Rule::in(['cash', 'bank', 'credit_card'])],
            'reference_type' => ['nullable', 'string', 'max:30'],
            'reference_id' => ['nullable', 'integer'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            if (empty($v->safe()->input('bank_account_id')) && empty($v->safe()->input('vendor_id'))) {
                // paid from cash by default - allowed
            }
        });
    }
}
