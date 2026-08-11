<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('companies')) {
            Schema::create('companies', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('owner_user_id');
                $table->unsignedBigInteger('host_id');
                $table->string('company_name');
                $table->string('business_email')->nullable();
                $table->string('company_address', 1000)->nullable();
                $table->string('company_currency', 3)->default('GBP');
                $table->timestamps();

                $table->index('owner_user_id');
                $table->index('host_id');
            });
        }

        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (!Schema::hasColumn('users', 'active_context_type')) {
                    $activeContextColumn = $table->string('active_context_type', 20)->default('personal');
                    if (Schema::hasColumn('users', 'company_id')) {
                        $activeContextColumn->after('company_id');
                    } elseif (Schema::hasColumn('users', 'host_id')) {
                        $activeContextColumn->after('host_id');
                    }
                }
                if (!Schema::hasColumn('users', 'active_company_id')) {
                    $activeCompanyColumn = $table->unsignedBigInteger('active_company_id')->nullable();
                    $activeCompanyColumn->after('active_context_type');

                    try {
                        $table->index('active_company_id');
                    } catch (\Throwable $e) {
                        // Ignore duplicate index errors in partially migrated environments.
                    }
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (Schema::hasColumn('users', 'active_company_id')) {
                    $table->dropIndex(['active_company_id']);
                    $table->dropColumn('active_company_id');
                }
                if (Schema::hasColumn('users', 'active_context_type')) {
                    $table->dropColumn('active_context_type');
                }
            });
        }

        Schema::dropIfExists('companies');
    }
};
