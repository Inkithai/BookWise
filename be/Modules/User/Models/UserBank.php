<?php

namespace Modules\User\Models;

use App\Models\BaseModel;

class UserBank extends BaseModel
{
    protected $table = 'user_bank_details';

    public $timestamps = false;

    protected $guarded = [];
}
