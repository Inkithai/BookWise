<?php

namespace Modules\Expenses\Models;

use App\Traits\OwnerTrait;
use App\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Accounting\Models\Account;

class ExpenseCategory extends Model
{
    use HasFactory;
    use TenantScoped;
    use OwnerTrait;
    use SoftDeletes;

    protected $table = 'expense_categories';

    protected $guarded = [];

    protected $casts = [
        'tax_rate' => 'decimal:4',
    ];

    protected $dates = ['deleted_at'];

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'account_id');
    }
}
