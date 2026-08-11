<?php

namespace App\Mixins;

use Closure;

/**
 * Class BuilderMixin.
 */
class BuilderMixin
{
    public static function whereLike(): Closure
    {
        return function ($col, $value) {
            $value = '%'.$value.'%';

            return $this->where($col, 'LIKE', $value);
        };
    }

    public static function orWhereLike(): Closure
    {
        return function ($col, $value) {
            $value = '%'.$value.'%';

            return $this->orWhere($col, 'LIKE', $value);
        };
    }
}
