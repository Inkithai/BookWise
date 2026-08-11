<?php

namespace Modules\Accounting\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @OA\Schema(
 *     schema="JournalEntryResource",
 *     type="object",
 *     title="Journal Entry Resource",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="entry_number", type="string", example="JE-000012"),
 *     @OA\Property(property="entry_date", type="string", format="date", example="2026-08-11"),
 *     @OA\Property(property="status", type="string", example="posted"),
 *     @OA\Property(property="total_amount", type="number", format="float", example=1200.00)
 * )
 */
class JournalEntryResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'entry_number' => $this->entry_number,
            'entry_date' => (string) $this->entry_date,
            'description' => $this->description,
            'status' => $this->status?->value,
            'total_amount' => (float) $this->total_amount,
            'reference_type' => $this->reference_type,
            'reference_id' => $this->reference_id,
            'posted_at' => $this->posted_at,
            'created_by' => $this->created_by,
            'lines' => JournalEntryLineResource::collection($this->whenLoaded('lines')),
        ];
    }
}
