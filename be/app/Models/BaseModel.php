<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BaseModel extends Model
{
    /**
     * Set a given attribute on the model.
     *
     * @param  string  $key
     * @param  mixed  $value
     * @return void
     */
    public function setAttribute($key, $value)
    {
        if (is_string($value) && trim($value) === '') {
            $value = null;
        }

        parent::setAttribute($key, $value);
    }

    public function property()
    {
        return $this->belongsTo(Property::class, 'property_id', 'id');
    }
}
