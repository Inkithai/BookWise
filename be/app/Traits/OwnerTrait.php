<?php

namespace App\Traits;

use App\Models\User;
use Illuminate\Support\Facades\Auth;

trait OwnerTrait
{
    private $selected_fields = ['id', 'first_name', 'last_name', 'email'];

    protected static function boot()
    {
        parent::boot();

        // On updating, set the updated_by field
        static::updating(function ($model) {
            $model->updated_by = (Auth::user() !== null) ? Auth::user()->id : null;
        });

        // On creating, set the created_by field
        static::creating(function ($model) {
            $model->created_by = (Auth::user() !== null) ? Auth::user()->id : null;
        });
    }

    // Define the relationship for the creator
    public function creator()
    {
        return $this->hasOne(User::class, $this->getKeyName(), 'created_by')->select($this->selected_fields);
    }

    // Define the relationship for the updater
    public function updater()
    {
        return $this->hasOne(User::class, $this->getKeyName(), 'updated_by')->select($this->selected_fields);
    }
}
