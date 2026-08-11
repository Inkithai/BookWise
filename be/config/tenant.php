<?php

return [
    /*
     * Column used to scope tenant data at the database row level.
     * The tenant is the SMB organization (Host) that subscribes to the SaaS.
     */
    'column' => 'host_id',

    /*
     * Header a super-admin may send to impersonate a specific tenant when
     * performing cross-tenant administration or support.
     */
    'header' => 'X-Host-Id',
];
