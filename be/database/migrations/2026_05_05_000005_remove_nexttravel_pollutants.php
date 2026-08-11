<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Remove the remaining nextTravel company data that was incorrectly migrated
 * into super-admin's personal profile (host_id=5).
 *
 * These rows (business_email=nexttravel001, company_address, company_currency)
 * were written by AccountController::createCompany() under the company's own
 * host but swept to host_id=5 by the broad user_id=1 migration.
 *
 * Only keep the original super-admin profile fields (ids 1-5: company_name,
 * social links).  If super-admin needs a currency/address they can set it
 * themselves; the default GBP fallback covers the missing currency.
 */
return new class extends Migration
{
    public function up(): void
    {
        $sa = DB::table('users')->where('account_type', 'super-admin')->orderBy('id')->first();
        if (!$sa) {
            return;
        }

        $hostId = (int) $sa->host_id;
        if ($hostId <= 0) {
            return;
        }

        // Remove any business_email, company_address, company_currency that
        // came from multi-company creation (not set by super-admin personally).
        // We identify them as: they exist on host_id=5 but were NOT part of the
        // original super-admin personal profile (which only has company_name +
        // social_media_links_*).
        $originalKeys = [
            'company_name',
            'social_media_links_facebook',
            'social_media_links_instagram',
            'social_media_links_linkedin',
            'social_media_links_twitter',
            'company_logo',
        ];

        // Delete company-creation pollutants — super-admin can re-enter these
        // from their profile page if needed; the GBP default covers currency.
        DB::table('host_user_details')
            ->where('host_id', $hostId)
            ->where('user_id', $sa->id)
            ->whereIn('name', ['business_email', 'company_address', 'company_currency'])
            ->delete();

        // Additionally ensure super-admin team_id stays null so Spatie uses
        // the global permission context (pivot team_id=1 from seeder).
        DB::table('users')
            ->where('id', $sa->id)
            ->update([
                'team_id'    => null,
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        // Intentionally empty.
    }
};
