# BookWise — Backend

A Laravel 12 (nwidart/modules) backend for the BookWise multi-tenant accounting and bookkeeping SaaS platform.

## Prerequisites

- PHP ≥ 8.2
- Composer
- MySQL or PostgreSQL
- Redis (recommended for cache/queue/session)

## Setup

```bash
cp .env.example .env
php artisan key:generate
php artisan passport:keys
composer install
php artisan migrate
php artisan serve --port=8001
```

## Key Configuration

- **APP_NAME**: BookWise
- **APP_TIMEZONE**: Asia/Colombo
- **DB_***: Database connection settings
- **STRIPE_***: Payment processing (optional)
- **PASSPORT_***: OAuth keys for API authentication

See `.env.example` for all available configuration options.

## Module Structure

The backend uses nwidart/laravel-modules for modular architecture:

| Module | Purpose |
|--------|---------|
| `Accounting` | Double-entry ledger, Chart of Accounts, Journal Entries |
| `Banking` | Bank/cash accounts, transactions, reconciliation |
| `Purchases` | Vendors, bills, bill payments (Accounts Payable) |
| `Expenses` | Expense categories, expense tracking |
| `Invoice` | Invoicing, clients, receipts (posts to ledger) |
| `User` | Authentication, user management, subscriptions |
| `SuperAdmin` | Platform administration |
| `Analytics` | User analytics and reporting |

## Multi-Tenancy

All accounting data is scoped by `host_id` using the `TenantScoped` trait and `TenantManager` service. Each tenant (organization) has fully isolated data.

## API

All API routes are under `/api/v1/admin/` and require authentication via Passport.

## Sri Lankan Localization

- Default currency: LKR (Rs.)
- Timezone: Asia/Colombo (UTC+5:30)
