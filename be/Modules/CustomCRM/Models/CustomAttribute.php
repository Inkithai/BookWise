<?php

namespace Modules\CustomCRM\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomAttribute extends Model
{
    use HasFactory;

    protected $guarded = [];

    public function customTable()
    {
        return $this->belongsTo(CustomTable::class);
    }
}
