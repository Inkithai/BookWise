# BookWise - Multi-Tenant Accounting & Bookkeeping SaaS

A multi-tenant **Accounting & Bookkeeping platform for Sri Lankan SMBs**, built with a
Laravel 12 (nwidart/modules) backend and Next.js 16 frontend.


## Overview

BookWise is a comprehensive accounting and bookkeeping SaaS designed for Sri Lankan businesses. It provides double-entry bookkeeping, invoicing, banking reconciliation, expense tracking, and financial reporting — all in a secure, multi-tenant architecture.

## What's inside

- **Double-entry general ledger** — Chart of Accounts, Journal Entries, live
  account balances, and a balanced postings guarantee.
- **Banking** — bank/cash accounts in LKR, deposits, withdrawals and reconciliation,
  each movement posted to the ledger.
- **Accounts Payable** — vendors, supplier bills and payments.
- **Expenses** — categorised overhead capture.
- **Financial statements** — Trial Balance, Profit & Loss, Balance Sheet and
  Cash Flow, computed from posted entries.
- **Invoicing → ledger** — invoices post accounts receivable (and receipts) to
  the ledger, idempotently.
- **Row-level multi-tenancy** — every record is scoped to an organisation
  (`host_id`) via a global Eloquent scope with a hard tenant boundary.

## Architecture

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full design: tenant model,
module map, double-entry mechanics, integration matrix, API surface and the
roadmap.

## Setup

**Prerequisites:** PHP ≥ 8.2, Composer, Node ≥ 18, a database (MySQL/PostgreSQL), and Redis (recommended for queues/cache).

### Backend (`be/`)

```bash
cd be
cp .env.example .env          # set DB_*, STRIPE_*, PASSPORT_*, APP_KEY
php artisan key:generate
php artisan passport:keys      # OAuth keys used by Passport API auth
composer install
php artisan migrate            # creates the accounting module tables
php artisan accounting:seed-defaults {host_id}   # provision a tenant's books
php artisan invoice:sync-ledger {host_id?}       # back-post existing invoices
php artisan test               # includes tests/Feature/AccountingLedgerTest.php
php artisan serve --port=8001
```

### Frontend (`fe/`)

```bash
cd fe
cp .env.example .env.local     # NEXT_PUBLIC_API_BASE_URL=http://localhost:8001/api
npm install
npm run dev                     # http://localhost:3000
```

The accounting workspace lives under `/accounting` and talks to the backend
through `src/services/accounting.service.ts`.

## Tech stack

- **Backend:** Laravel 12, nwidart/laravel-modules, Passport/Sanctum,
  spatie/laravel-permission, Stripe, dompdf, DataTables, l5-swagger.
- **Frontend:** Next.js 16 (App Router), React 19, Redux Toolkit, shadcn/ui
  (Radix), Stripe, recharts.

## Environment Configuration

See `.env.example` in both `be/` and `fe/` directories for all available
environment variables. Key variables include:

- **Database:** `DB_CONNECTION`, `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
- **Authentication:** `PASSPORT_PRIVATE_KEY`, `PASSPORT_PUBLIC_KEY`
- **Stripe:** `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **API URL:** `NEXT_PUBLIC_API_BASE_URL` (frontend), `APP_URL` (backend)

## Currency & Localization

BookWise is localized for Sri Lanka:
- Default currency: **LKR (Rs.)**
- Timezone: **Asia/Colombo (UTC+5:30)**
- Date format: **DD/MM/YYYY**
- Phone format: **+94 XX XXX XXXX**

## Copyright & Usage

© 2026 Inkithai Meiyalagan. All rights reserved.

This repository is provided for **viewing and portfolio purposes only**. The source code, architecture, design, and implementation are proprietary and may not be copied, reused, modified, distributed, republished, or used to create another product or commercial service without explicit written permission from the author.

This project is under active development and is intended to be expanded into a commercial SaaS product. **Please do not copy, clone, or use this project as your own.**

**No open-source license is granted for this repository.**
