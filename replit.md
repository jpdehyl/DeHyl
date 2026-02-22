# DeHyl - Project Financial System

## Overview
DeHyl is a Next.js 16 construction/project management financial system with features including bids, estimates, invoices, bills, profitability tracking, safety management, and a client portal. It uses Supabase for the database and Clerk for authentication.

## Tech Stack
- **Framework**: Next.js 16.1.3 with Turbopack (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 with shadcn/ui components
- **Database**: Supabase (external)
- **Auth**: Clerk (gracefully disabled when keys not set)
- **State**: Zustand
- **Node.js**: v22

## Project Structure
```
src/
├── app/              # Next.js App Router pages
│   ├── (dashboard)/  # Main dashboard routes
│   ├── (portal)/     # Client portal routes
│   ├── (stories)/    # Stories feature routes
│   └── api/          # API routes
├── components/       # React components
│   ├── ui/           # shadcn/ui base components
│   └── ...           # Feature-specific components
├── hooks/            # Custom React hooks
├── lib/              # Utilities and services
│   ├── supabase/     # Supabase client (server/client)
│   ├── google-drive/ # Google Drive integration
│   ├── quickbooks/   # QuickBooks integration
│   └── stores/       # Zustand stores
├── middleware.ts      # Auth middleware (Clerk)
└── types/            # TypeScript type definitions
supabase/
└── migrations/       # Database migration SQL files
```

## Running the App
- **Dev**: `npm run dev` (port 5000, host 0.0.0.0)
- **Build**: `npm run build`
- **Start**: `npm run start` (port 5000)

## Required Environment Variables
The app needs Supabase credentials to function:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

Optional integrations:
- Clerk auth keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`)
- QuickBooks (`QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET`)
- Google Drive (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- Anthropic AI (`ANTHROPIC_API_KEY`)

## Recent Changes (Feb 2026)
- **Stories redesign**: Converted from tabbed dashboard to blog-style narrative layout (NarrativeStoryView, NarrativeStageSection components)
- **Cost tracking resilience**: All expense/cost API endpoints gracefully handle missing `project_costs` table (PGRST205 error)
- **Admin migration endpoint**: `/api/admin/migrate` (POST) checks table status and provides SQL to apply

## Known Issue: project_costs table
The `project_costs` table does not exist in the Supabase database yet. The migration SQL is in `supabase/migrations/00020_project_costs.sql`. It must be applied via the Supabase SQL Editor. Until then, cost/expense features return empty data gracefully. Hit `POST /api/admin/migrate` to get the SQL to paste into Supabase.

## Deployment
Configured for autoscale deployment with `npm run build` and `npm run start`.
