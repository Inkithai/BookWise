# BookWise — Frontend

A Next.js 16 frontend for the BookWise accounting and bookkeeping platform, targeting Sri Lankan businesses.

## Getting Started

### Prerequisites
- Node.js ≥ 18
- npm or yarn

### Installation

```bash
npm install
cp .env.example .env.local
```

Configure `.env.local` with your backend API URL:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8001/api
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm run start
```

### Lint

```bash
npm run lint
```

## Project Structure

```
src/
├── app/               # Next.js App Router pages
├── components/        # React components
├── hooks/             # Custom React hooks
├── lib/               # Utilities and configuration
├── services/          # API service clients
├── slices/            # Redux Toolkit slices
└── utils/             # Helper functions
```

## Key Features

- Dashboard with financial overview
- Invoice management
- Client management
- Accounting workspace (Chart of Accounts, Journal Entries, Reports)
- Multi-tenant support with tenant isolation
- Responsive design (mobile-first)
- Dark mode support
