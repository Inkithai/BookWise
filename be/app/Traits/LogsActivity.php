<?php

namespace App\Traits;

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Log;
use Throwable;

trait LogsActivity
{
    public function logActivity(
        string $type,
        string $action,
        ?int $relatedId = null,
        $details = null
    ) {
        try {
            $adminId = auth()->id();

            ActivityLog::create([
                'type' => $type,
                'action' => $action,
                'related_id' => $relatedId,
                'details' => $details ? json_encode($details) : null,
                'user_id' => $adminId,
            ]);
        } catch (Throwable $e) {
            Log::error('Activity log failed', ['error' => $e->getMessage()]);
        }
    }
}
