<?php

namespace App\Enums;

enum InvoicePaymentStatusEnum: string
{
    //
    case UNPAID = 'unpaid';
    case PENDING = 'pending';
    case PAID = 'paid';
    case FAILED = 'failed';
    case EXPIRED = 'expired';
}
