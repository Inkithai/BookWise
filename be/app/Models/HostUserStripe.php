<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HostUserStripe extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $hidden = ['created_at', 'updated_at'];

    protected $guarded = [];

    protected $casts = [
        'stripe_connected_at' => 'datetime',
    ];

    public function hostUser()
    {
        return $this->belongsTo(User::class, 'host_user_id', 'id');
    }
}
