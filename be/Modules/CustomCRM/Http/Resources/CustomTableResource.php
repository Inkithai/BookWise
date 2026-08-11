<?php

namespace Modules\CustomCRM\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @OA\Schema(
 *     schema="CustomTableResource",
 *     title="Custom Table Resource",
 *     type="object",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="name", type="string", example="leads_table"),
 *     @OA\Property(property="host_id", type="integer", example=2),
 *     @OA\Property(
 *         property="attributes",
 *         type="array",
 *         @OA\Items(
 *             type="object",
 *             @OA\Property(property="id", type="integer", example=10),
 *             @OA\Property(property="label", type="string", example="First Name"),
 *             @OA\Property(property="type", type="string", example="string"),
 *             @OA\Property(property="is_nullable", type="boolean", example=true),
 *             @OA\Property(property="is_foreign", type="boolean", example=false),
 *             @OA\Property(
 *                 property="foreign_table_name",
 *                 type="string",
 *                 nullable=true,
 *                 example="users",
 *                 description="The related table name if is_foreign is true"
 *             )
 *         )
 *     )
 * )
 */
class CustomTableResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'       => $this->id,
            'name'     => $this->name,
            'host_id'  => $this->host_id,
            'attributes' => $this->whenLoaded('attributes', function () {
                return $this->attributes->map(function ($attr) {
                    return [
                        'id'                 => $attr->id,
                        'label'              => $attr->name,
                        'type'               => $attr->type,
                        'is_nullable'        => (bool) $attr->is_nullable,
                        'is_foreign'         => (bool) $attr->is_foreign,
                        'foreign_table_name' => $attr->is_foreign ? $attr->foreign_table_name : null,
                    ];
                })->values()->all();
            }),
        ];
    }
}
