<?php

namespace App\Enums;

enum InvoiceStatus: string
{
    case Created = 'Created';
    case MailSent = 'Mail Sent';
    case Rejected = 'Rejected';
    case Paid = 'Paid';
    case InstallmentPayment = 'Installment Payment';
    case NotPaid = 'Not Paid';
    case ReceiptSent = 'Receipt Sent';
    case Draft = 'Draft';
}
