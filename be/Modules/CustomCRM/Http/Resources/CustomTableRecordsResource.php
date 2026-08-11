<?php

namespace Modules\CustomCRM\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @OA\Schema(
 *     schema="CustomTableRecordsResource",
 *     title="Custom Table Records Resource",
 *     type="object",
 *     @OA\Property(
 *         property="table",
 *         type="object",
 *         @OA\Property(property="id", type="integer", example=1),
 *         @OA\Property(property="name", type="string", example="leads_data")
 *     ),
 *     @OA\Property(
 *         property="attributes",
 *         type="array",
 *         @OA\Items(
 *             type="object",
 *             @OA\Property(property="id", type="integer", example=10),
 *             @OA\Property(property="name", type="string", example="first_name"),
 *             @OA\Property(property="type", type="string", example="string"),
 *             @OA\Property(property="is_nullable", type="boolean", example=true),
 *             @OA\Property(property="is_foreign", type="boolean", example=false)
 *         )
 *     ),
 *     @OA\Property(
 *         property="data",
 *         type="array",
 *         description="List of records for this custom table",
 *         @OA\Items(type="object")
 *     )
 * )
 */
class CustomTableRecordsResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'table' => [
                'id'   => $this['table']['id'],
                'name' => $this['table']['name'],
            ],
            'attributes' => collect($this['attributes'])->map(function ($attr) {
                return [
                    'id'          => $attr->id,
                    'name'        => $attr->name,
                    'type'        => $attr->type,
                    'is_nullable' => (bool) $attr->is_nullable,
                    'is_foreign'  => (bool) $attr->is_foreign,
                ];
            }),
            'data' => $this['data'],
        ];
    }
}
