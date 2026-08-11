<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Team extends Model
{
    use HasFactory;

    protected $table = 'teams';

    protected $guarded = [];

    public function host()
    {
        return $this->belongsTo(Host::class);
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }
}
