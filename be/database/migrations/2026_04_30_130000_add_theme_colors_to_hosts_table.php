<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hosts', function (Blueprint $table) {
            $table->string('theme_color')->nullable()->after('name');
            $table->string('invoice_theme_color')->nullable()->after('theme_color');
        });

        // Seed existing hosts with the theme color from their primary user
        $hosts = DB::table('hosts')->get();
        foreach ($hosts as $host) {
            $primaryUser = DB::table('users')
                ->where('host_id', $host->id)
                ->orderByRaw("CASE LOWER(COALESCE(account_type,'')) WHEN 'company' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END")
                ->orderBy('id')
                ->first();

            if ($primaryUser) {
                DB::table('hosts')->where('id', $host->id)->update([
                    'theme_color' => $primaryUser->theme_color ?? '#1e88e5',
                    'invoice_theme_color' => $primaryUser->invoice_theme_color ?? '#1e88e5',
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('hosts', function (Blueprint $table) {
            $table->dropColumn(['theme_color', 'invoice_theme_color']);
        });
    }
};
