<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClaritySnapshot extends Model
{
    protected $table = 'clarity_snapshots';

    protected $fillable = [
        'payload',
        'last_fetched_at',
        'snapshot_date',
    ];

    protected $casts = [
        'payload' => 'array',
        'last_fetched_at' => 'datetime',
        'snapshot_date' => 'date',
    ];
}
