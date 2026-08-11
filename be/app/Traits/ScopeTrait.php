<?php

namespace App\Traits;

use App\Models\Property;
use Session;

trait ScopeTrait
{
    public function scopeProperties($query, $table = '')
    {
        // $selectedProperties = Session::get('selectedProperties');

        // if (empty($selectedProperties)) {
        //     $loggedUser = auth()->user(); // Use Laravel's auth system

        //     if ($loggedUser && $loggedUser->properties()->exists()) {
        //         $selectedProperties = $loggedUser->properties()->pluck('property_id')->toArray();
        //     } else {
        //         $selectedProperties = Property::where('is_active', 1)->pluck('id')->toArray();
        //     }
        // }

        // if (!empty($table)) {
        //     return $query->whereIn("{$table}.property_id", $selectedProperties);
        // }

        // return $query->whereIn('property_id', $selectedProperties);
    }
}
