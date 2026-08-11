<?php

namespace App\Helpers;

use App\Models\HostUserDetail;
use Illuminate\Support\Facades\Storage;

class EmailTemplateHelper
{
    /**
     * Resolve company logo URL and company name for email templates.
     *
     * @param int|null $hostId
     * @return array{logoUrl: string|null, companyName: string|null}
     */
    public static function resolveCompanyBranding(?int $hostId, ?int $userId = null): array
    {
        $logoUrl = null;
        $companyName = null;

        if (!$hostId) {
            return compact('logoUrl', 'companyName');
        }

        $companyNameValue = HostUserDetail::where('host_id', $hostId)
            ->where('type', 'company_details')
            ->where('name', 'company_name')
            ->when($userId, fn ($q) => $q->where('user_id', $userId))
            ->value('values');
        $companyName = is_string($companyNameValue) ? trim($companyNameValue) : null;

        $logoPath = HostUserDetail::where('host_id', $hostId)
            ->where('type', 'company_details')
            ->where('name', 'company_logo')
            ->when($userId, fn ($q) => $q->where('user_id', $userId))
            ->value('files');
        if ($logoPath && Storage::disk('public')->exists($logoPath)) {
            // Use hardcoded public URL so email clients can fetch the image
            $logoUrl = 'https://bookwise.io/storage/' . $logoPath;
        }

        return compact('logoUrl', 'companyName');
    }
}
