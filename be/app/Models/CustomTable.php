<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomTable extends Model
{
    use HasFactory;

    protected $guarded = [];

    public function attributes()
    {
        return $this->hasMany(CustomAttribute::class);
    }
}
