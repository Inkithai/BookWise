<?php

namespace Modules\CustomCRM\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Modules\CustomCRM\Models\CustomAttribute;

/**
 * @OA\Schema(
 *     schema="CustomTable",
 *     type="object",
 *     title="CustomTable",
 *     required={"id", "name", "host_id"},
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="name", type="string", example="Customer Table"),
 *     @OA\Property(property="host_id", type="integer", example=1),
 *     @OA\Property(
 *         property="attributes",
 *         type="array",
 *         @OA\Items(
 *             type="object",
 *             @OA\Property(property="id", type="integer", example=101),
 *             @OA\Property(property="label", type="string", example="Email"),
 *             @OA\Property(property="type", type="string", example="string")
 *         )
 *     )
 * )
 */
class CustomTable extends Model
{
    use HasFactory;

    protected $table = 'custom_tables';

    protected $guarded = [];

    protected $casts = [
        'id' => 'integer',
        'host_id' => 'integer',
        'name' => 'string'
    ];

    /**
     * Get all related attributes for the custom table.
     */
    public function attributes(): HasMany
    {
        return $this->hasMany(CustomAttribute::class, 'custom_table_id');
    }
}
