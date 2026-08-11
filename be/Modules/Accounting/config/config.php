<?php

return [
    /*
     * When true, the Invoice module posts AR/receipt entries to the ledger
     * automatically. Disable to keep invoicing and bookkeeping decoupled.
     */
    'post_invoices_to_ledger' => true,

    'default_currency' => 'GBP',

    /*
     * When true, posted journal entries are locked from edits and must be
     * reversed rather than deleted (audit-safe ledger).
     */
    'lock_posted_entries' => true,
];
