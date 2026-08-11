<?php

namespace Modules\User\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\User\Models\User;

class CustomerSupport extends Model
{
    use SoftDeletes;

    protected $table = 'customer_supports';

    protected $fillable = [
        'user_id',
        'first_name',
        'last_name',
        'phone_number',
        'email',
        'problem_category',
        'specify_others',
        'description',
        'file_path',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Get the user that created this support ticket.
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
