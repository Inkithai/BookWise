<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HostUser extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $guarded = [];

    public function host()
    {
        return $this->belongsTo(Host::class, 'host_id', 'id');
    }

     public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
