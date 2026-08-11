<?php

namespace Modules\Role\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use Spatie\Permission\Models\Role;
use OpenApi\Annotations as OA;

/**
 * @OA\Schema(
 *     schema="RoleResource",
 *     type="object",
 *     @OA\Property(property="id", type="integer", example=1, description="Role ID"),
 *     @OA\Property(property="name", type="string", example="admin", description="Role name"),
 *     @OA\Property(property="guard_name", type="string", example="api", description="Guard name"),
 *     @OA\Property(property="team_id", type="integer", example=1, description="Team ID associated with the role"),
 *     @OA\Property(property="host_id", type="integer", example=1, description="Host ID associated with the role"),
 *     @OA\Property(
 *         property="permissions",
 *         type="array",
 *         @OA\Items(type="string", example="edit posts", description="Permission name")
 *     )
 * )
 */
class RoleResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'guard_name' => $this->guard_name,
            'team_id' => $this->team_id ?? null,
            'host_id' => $this->host_id ?? null,
            'permissions' => $this->permissions->pluck('name')
        ];
    }
}
