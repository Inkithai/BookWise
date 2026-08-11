<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HostUserDetail extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $hidden = ['created_at', 'updated_at'];

    protected $guarded = [];

    // Automatically decode 'details' when retrieved
    public function getDetailsAttribute($value)
    {
        return $value ? json_decode($value, true) : null;
    }

    // Automatically decode 'file' when retrieved
    public function getFileAttribute($value)
    {
        return $value ? json_decode($value, true) : null;
    }
    
    public function host()
    {
        return $this->belongsTo(Host::class, 'host_id', 'id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
