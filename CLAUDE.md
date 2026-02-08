# CLAUDE.md - DeHyl Project Financial System

> This file provides context for AI assistants (Claude, Cursor, etc.) working on this codebase.

## Project Overview

**What is this?** A financial dashboard for DeHyl Constructors Corp, a demolition & restoration company in BC, Canada (~$500K/year revenue).

**Problem it solves:** Scattered project data across Google Drive and QuickBooks. Owner (JP) needs one place to see: "Who owes me money?", "What do I owe?", and "Are my projects profitable?"

**Key Users:** JP (owner) - uses MacBook and iPhone

## Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Framework | Next.js 16 (App Router) | Modern React, API routes, great DX |
| Styling | Tailwind CSS 4 | Rapid development |
| UI Components | shadcn/ui + Radix | Accessible, customizable |
| Charts | Recharts | Easy React integration |
| Database | Supabase (PostgreSQL) | Free tier, easy auth |
| Auth | Supabase Auth | Handles OAuth for QB + Google |
| Hosting | Vercel | Free tier, easy Next.js deploy |

## Project Structure

```
dehyl/
├── CLAUDE.md              # This file - AI context
├── docs/
│   └── PRD.md             # Full product requirements
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── page.tsx       # Dashboard (home)
│   │   ├── projects/      # Projects list & detail
│   │   ├── receivables/   # Invoices owed to DeHyl
│   │   ├── payables/      # Bills DeHyl owes
│   │   ├── settings/      # Connections & config
│   │   └── api/           # API routes
│   ├── components/        # React components
│   │   ├── ui/            # shadcn/ui components
│   │   ├── dashboard/     # Dashboard-specific
│   │   ├── projects/      # Project-related
│   │   └── layout/        # Navigation, sidebar
│   ├── lib/               # Utilities & helpers
│   │   ├── supabase/      # Supabase client & queries
│   │   ├── quickbooks/    # QB API integration
│   │   ├── google-drive/  # Drive API integration
│   │   └── utils/         # General utilities
│   └── types/             # TypeScript interfaces
├── public/                # Static assets
└── supabase/
    └── migrations/        # Database schema
```

## Key Integrations

### QuickBooks Online API
- **Purpose:** Read invoices (receivables) and bills (payables)
- **Auth:** OAuth 2.0 with refresh tokens
- **Endpoints:**
  - `GET /v3/company/{realmId}/query` - Query invoices/bills
  - Invoice query: `SELECT * FROM Invoice WHERE Balance > '0'`
  - Bill query: `SELECT * FROM Bill WHERE Balance > '0'`
- **Docs:** https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice

### Google Drive API
- **Purpose:** Read project folder structure
- **Auth:** OAuth 2.0
- **Scope:** `drive.readonly`
- **Key folder ID:** `1qRGYL7NylTEkjjvoZStyjPWJyWR9fI6n`
- **Folder name pattern:** `YYMM### - ClientCode - Description`
  - Example: `2601007 - CD - PetroCan Kamloops`
  - Regex: `/^(\d{7})\s*-\s*(\w+)\s*-\s*(.+)$/`

## Data Models

### Project (from Google Drive)
```typescript
interface Project {
  id: string;                    // UUID
  driveId: string;               // Google Drive folder ID
  code: string;                  // "2601007"
  clientCode: string;            // "CD", "ADR", "R&S"
  clientName: string;            // Resolved full name
  description: string;           // "PetroCan Kamloops"
  status: 'active' | 'closed';
  estimateAmount: number | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Invoice (from QuickBooks, cached)
```typescript
interface Invoice {
  id: string;
  qbId: string;                  // QuickBooks ID
  invoiceNumber: string;         // "DC0359"
  clientName: string;
  amount: number;
  balance: number;               // Outstanding
  issueDate: Date;
  dueDate: Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  projectId: string | null;      // Linked project
  memo: string | null;
  syncedAt: Date;
}
```

### Bill (from QuickBooks, cached)
```typescript
interface Bill {
  id: string;
  qbId: string;
  vendorName: string;
  amount: number;
  balance: number;
  billDate: Date;
  dueDate: Date;
  status: 'open' | 'paid' | 'overdue';
  projectId: string | null;
  memo: string | null;
  syncedAt: Date;
}
```

## Client Code Mappings

| Code | Full Name | QB Customer Name |
|------|-----------|------------------|
| CD | Certified Demolition | Certified Demolition Inc. |
| ADR | ADR Construction | ADR Construction |
| R&S | Russell & Sons | Russell & Sons Enterprises Inc. |

*Note: This mapping helps auto-match invoices to projects*

## Business Rules

1. **Invoice matching:** Invoices are matched to projects by:
   - Project code in memo/notes (highest confidence)
   - Client name match + description keywords
   - Date proximity to project dates

2. **Invoice status:**
   - `overdue` = Balance > 0 AND DueDate < Today
   - `sent` = Balance > 0 AND DueDate >= Today
   - `paid` = Balance = 0

3. **Project status:**
   - `active` = Folder in main Projects directory
   - `closed` = Folder in Projects/Closed subdirectory

4. **Canadian tax:** GST @ 5% (no PST for services in BC)

## Development Phases

### Phase 1: Core MVP ✅ COMPLETE
- [x] Project setup (Next.js 16, Tailwind 4, shadcn/ui)
- [x] Supabase schema & connection (3 migrations: projects, invoices, bills, bids, estimates)
- [x] Dashboard page with KPI cards, charts, alerts panel, activity feed
- [x] Projects list with filters (status, client, missing-estimate, missing-pbs)
- [x] Receivables page with status filtering and project assignment UI
- [x] Payables page with status filtering and project assignment UI
- [x] QuickBooks OAuth flow (complete with callbacks)
- [x] Google Drive OAuth flow (complete with callbacks)
- [x] Settings page with connection cards, client mappings, sync buttons
- [x] Sidebar navigation (collapsible) + mobile drawer
- [x] Dark/light theme toggle
- [x] **Connect UI to real API calls** (fetches from Supabase)
- [x] **Sync endpoints implemented** (`/api/sync/quickbooks`, `/api/sync/projects`)
- [x] **Loading/error states** for all async pages
- [ ] Deploy to Vercel

### Phase 2: Project Detail ✅ COMPLETE
- [x] Project detail page (`/projects/[id]`) with header, financials, invoices, bills
- [x] Manual invoice-to-project linking (assign dropdown in tables)
- [x] Basic alerts panel (overdue invoices, bills due soon, missing estimates)
- [x] Bids page (`/bids`) with status tracking
- [x] Estimates page (`/projects/[id]/estimate`) - partial
- [x] **Connected to real Supabase data**

### Phase 3: Smart Features (Planned)
- [x] Invoice matching engine skeleton (`src/lib/matching/invoice-matcher.ts`)
- [x] Client code mapping display in settings
- [ ] Auto-suggest invoice matching (connect matcher to UI)
- [ ] Client code mapping CRUD UI
- [ ] Improved alerts with notifications

### Phase 4: Polish (Planned)
- [x] Dark mode (implemented via next-themes)
- [x] Mobile navigation (responsive sidebar + drawer)
- [x] Loading states and error handling
- [ ] Mobile optimization (test on iPhone)
- [ ] Export features (PDF reports, CSV export)

## Current Status

**What's Built:** Full-stack application with UI connected to Supabase. OAuth flows implemented. Sync endpoints ready.

**Ready to use:**
1. Connect QuickBooks and Google Drive in Settings
2. Click "Sync" to pull data from QB/Drive into Supabase
3. View real financial data on Dashboard, Projects, Receivables, Payables pages

## Next Steps (Priority Order)

1. **Deploy to Vercel** - Push to Vercel for JP to test
2. **Test OAuth with real credentials** - Verify the full flow works in production
3. **Phase 3 Features** - Auto-suggest invoice matching, client mapping UI

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# QuickBooks
QUICKBOOKS_CLIENT_ID=
QUICKBOOKS_CLIENT_SECRET=
QUICKBOOKS_REDIRECT_URI=

# Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Commands

```bash
# Development
npm run dev          # Start dev server (localhost:3000)

# Database
npx supabase start   # Start local Supabase
npx supabase db push # Push schema changes

# Build
npm run build        # Production build
npm run lint         # Run ESLint
```

## UI Design Guidelines

- **Style:** Modern financial dashboard (dark/light mode)
- **Reference:** Aniq-UI Dashboard Template aesthetic
- **Colors:** 
  - Primary: Blue (#3b82f6)
  - Success/Profit: Green (#10b981)
  - Warning/Due Soon: Amber (#f59e0b)
  - Danger/Overdue: Red (#ef4444)
- **Typography:** Clean, readable (system fonts or Inter)
- **Mobile:** Must work on iPhone (JP uses on job sites)

## Important Files

| File | Purpose |
|------|---------|
| `docs/PRD.md` | Full product requirements - READ THIS FIRST |
| `src/lib/quickbooks/client.ts` | QB API wrapper |
| `src/lib/google-drive/client.ts` | Drive API wrapper |
| `src/lib/matching/invoice-matcher.ts` | Invoice-to-project matching logic |
| `src/lib/store.ts` | Zustand global state (connections, sync status) |
| `src/lib/mock-data.ts` | Mock data (to be replaced with real API calls) |
| `src/app/api/sync/quickbooks/route.ts` | QB sync endpoint |
| `src/app/api/sync/projects/route.ts` | Drive sync endpoint |
| `supabase/migrations/*.sql` | Database schema (3 migrations) |

## API Routes Reference

| Endpoint | Method | Status | Purpose |
|----------|--------|--------|---------|
| `/api/dashboard` | GET | ✅ Ready | Dashboard KPIs, alerts, activity |
| `/api/projects` | GET/POST | ✅ Ready | Project CRUD |
| `/api/projects/[id]` | GET | ✅ Ready | Project detail with financials |
| `/api/receivables` | GET | ✅ Ready | Open invoices |
| `/api/payables` | GET | ✅ Ready | Open bills |
| `/api/invoices/[id]/assign` | POST | ✅ Ready | Assign invoice to project |
| `/api/bills/[id]/assign` | POST | ✅ Ready | Assign bill to project |
| `/api/sync/quickbooks` | POST | ✅ Ready | Sync QB invoices & bills |
| `/api/sync/projects` | POST | ✅ Ready | Sync Drive folders |
| `/api/auth/quickbooks` | GET | ✅ Ready | QB OAuth initiation |
| `/api/auth/callback/quickbooks` | GET | ✅ Ready | QB OAuth callback |
| `/api/auth/google` | GET | ✅ Ready | Google OAuth initiation |
| `/api/auth/callback/google` | GET | ✅ Ready | Google OAuth callback |
| `/api/connections` | GET | ✅ Ready | Connection status |
| `/api/client-mappings` | GET/POST | ✅ Ready | Client mapping CRUD |
| `/api/matching` | POST | ✅ Ready | Invoice-to-project suggestions |

## Common Tasks

### Adding a new page
1. Create folder in `src/app/[page-name]/`
2. Add `page.tsx` with component
3. Add to sidebar navigation in `src/components/layout/sidebar.tsx`

### Adding a QB API call
1. Add function in `src/lib/quickbooks/client.ts`
2. Handle token refresh automatically
3. Cache results in Supabase if needed

### Adding a UI component
1. Use `npx shadcn-ui@latest add [component]`
2. Customize in `src/components/ui/`

## Testing Checklist

Before deploying, verify:
- [ ] Dashboard loads with KPIs
- [ ] Projects list shows Drive folders
- [ ] Receivables shows open QB invoices
- [ ] Payables shows open QB bills
- [ ] OAuth flows work (QB + Google)
- [ ] Mobile view works on iPhone
- [ ] Dark mode works (if implemented)

## Troubleshooting

### QB OAuth fails
- Check redirect URI matches exactly in Intuit Developer Console
- Ensure company is in sandbox mode for testing

### Drive folders not loading
- Verify folder ID is correct
- Check OAuth scope includes `drive.readonly`

### Sync takes too long
- QB API has rate limits (500/min) - shouldn't be an issue
- Consider incremental sync instead of full sync

## Contact

- **Product Owner:** JP (jp@dehyl.ca)
- **Company:** DeHyl Constructors Corp
- **Location:** Burnaby, BC, Canada
