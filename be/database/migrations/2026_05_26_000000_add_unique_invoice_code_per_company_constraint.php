<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Block duplicate invoice codes per company on INSERT.
     *
     * Driver-aware:
     *  - MySQL/MariaDB: BEFORE INSERT trigger using SIGNAL.
     *  - PostgreSQL (e.g. Supabase): plpgsql trigger function using RAISE.
     *
     * Existing duplicate rows are untouched (the trigger only guards new inserts).
     */
    public function up(): void
    {
        if (!Schema::hasTable('invoices')) {
            return;
        }

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP TRIGGER IF EXISTS prevent_duplicate_invoice_code ON invoices');
            DB::statement("
                CREATE OR REPLACE FUNCTION prevent_duplicate_invoice_code_fn()
                RETURNS trigger AS \$\$
                DECLARE duplicate_count INT;
                BEGIN
                    SELECT COUNT(*) INTO duplicate_count
                    FROM invoices
                    WHERE code = NEW.code
                      AND company_id = NEW.company_id;

                    IF duplicate_count > 0 THEN
                        RAISE EXCEPTION 'Duplicate invoice number for this company';
                    END IF;

                    RETURN NEW;
                END;
                \$\$ LANGUAGE plpgsql
            ");
            DB::statement('
                CREATE TRIGGER prevent_duplicate_invoice_code
                BEFORE INSERT ON invoices
                FOR EACH ROW
                EXECUTE FUNCTION prevent_duplicate_invoice_code_fn()
            ');
        } else {
            DB::statement('DROP TRIGGER IF EXISTS prevent_duplicate_invoice_code');
            DB::statement('
                CREATE TRIGGER prevent_duplicate_invoice_code
                BEFORE INSERT ON invoices
                FOR EACH ROW
                BEGIN
                    DECLARE duplicate_count INT;

                    SELECT COUNT(*) INTO duplicate_count
                    FROM invoices
                    WHERE code = NEW.code
                    AND company_id = NEW.company_id;

                    IF duplicate_count > 0 THEN
                        SIGNAL SQLSTATE \'45000\'
                        SET MESSAGE_TEXT = \'Duplicate invoice number for this company\';
                    END IF;
                END
            ');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP TRIGGER IF EXISTS prevent_duplicate_invoice_code ON invoices');
            DB::statement('DROP FUNCTION IF EXISTS prevent_duplicate_invoice_code_fn()');
        } else {
            DB::statement('DROP TRIGGER IF EXISTS prevent_duplicate_invoice_code');
        }

        // The unique index was only created in some historical environments —
        // drop it defensively and ignore if it doesn't exist.
        if (Schema::hasTable('invoices')) {
            try {
                Schema::table('invoices', function ($table) {
                    $table->dropUnique('unique_invoice_code_per_company');
                });
            } catch (\Throwable $e) {
                // Ignore if index does not exist.
            }
        }
    }
};
