# DeHyl Project Financial System

A financial dashboard for DeHyl Constructors Corp to track project profitability, invoices, and bills.

## Features

- 📊 **Dashboard** - KPIs at a glance (receivables, payables, net position)
- 📁 **Projects** - Synced from Google Drive folder structure
- 💰 **Receivables** - Open invoices from QuickBooks
- 📋 **Payables** - Outstanding bills from QuickBooks
- 🔗 **Integrations** - QuickBooks Online + Google Drive

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth + OAuth
- **Hosting:** Vercel

## Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm
- Supabase account (free tier)
- QuickBooks Developer account
- Google Cloud Console project

### Installation

```bash
# Clone the repository
git clone [repo-url]
cd dehyl

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

### Environment Setup

1. **Supabase:** Create a project at [supabase.com](https://supabase.com)
2. **QuickBooks:** Register at [developer.intuit.com](https://developer.intuit.com)
3. **Google:** Create OAuth credentials at [console.cloud.google.com](https://console.cloud.google.com)

See `.env.example` for required variables.

## Project Structure

```
├── docs/           # Documentation (PRD, etc.)
├── src/
│   ├── app/        # Next.js pages & API routes
│   ├── components/ # React components
│   ├── lib/        # Utilities & integrations
│   └── types/      # TypeScript interfaces
├── supabase/       # Database migrations
└── CLAUDE.md       # AI assistant context
```

## Documentation

- [Product Requirements (PRD)](./docs/PRD.md)
- [AI Context (CLAUDE.md)](./CLAUDE.md)

## Development

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # Run linter
```

## License

Private - DeHyl Constructors Corp
