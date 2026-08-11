<?php

namespace App\Models;

use App\Traits\ScopeTrait;
use Illuminate\Database\Eloquent\Model;

class LeadStatus extends Model
{
    use ScopeTrait;

    protected $table = 'crm_leads_status';

    protected $guarded = [];

    public $timestamps = false;
}
