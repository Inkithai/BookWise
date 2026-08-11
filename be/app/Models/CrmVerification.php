<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CrmVerification extends Model
{
    use HasFactory;

    protected $table = 'crm_verifications';

    protected $guarded = [];
}
