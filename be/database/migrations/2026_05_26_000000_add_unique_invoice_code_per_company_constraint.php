<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Drop trigger if exists
        DB::statement('DROP TRIGGER IF EXISTS prevent_duplicate_invoice_code');
        
        // Create trigger to block new duplicates without affecting existing ones
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

    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS prevent_duplicate_invoice_code');
        
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropUnique('unique_invoice_code_per_company');
        });
    }
};
