# RALPH_PRD.md - DeHyl Financials JSON-Render Enhancement

> Ralph Loop PRD for enhancing DeHyl Financials with AI-generated dynamic dashboards using json-render.

## Overview

This PRD defines user stories for integrating the json-render framework into DeHyl Financials. The goal is to enable AI-generated, schema-validated dashboard components that JP can customize via natural language.

## Tech Context

- **Framework**: `@json-render/core` + `@json-render/react` for AI-to-UI pipeline
- **Schema**: Zod-based component catalog at `src/lib/json-render/catalog.ts`
- **Renderer**: React component at `src/lib/json-render/renderer.tsx`
- **Existing Stack**: Next.js 16, Tailwind 4, shadcn/ui, Recharts, Supabase

---

## Phase 1: Foundation (US-001 to US-003)

### US-001: Create JSON-Render Demo Page

**As a** developer
**I want** a demo page showing json-render capabilities
**So that** I can validate the component catalog works correctly

**Acceptance Criteria:**
- [ ] Create `/demo/json-render` page (route: `src/app/demo/json-render/page.tsx`)
- [ ] Import and render `exampleDashboard` from `src/lib/json-render/examples.ts`
- [ ] Use `JsonRenderer` component to render the dashboard
- [ ] Page displays: 4 KPI cards, line chart, alerts card, data table, quick actions
- [ ] All components render without console errors
- [ ] Responsive layout works on mobile (test at 375px width)
- [ ] Run `npm run lint && npm run build` - no errors

---

### US-002: Add Dashboard JSON Editor

**As a** developer
**I want** a JSON editor alongside the rendered dashboard
**So that** I can test different JSON configurations live

**Acceptance Criteria:**
- [ ] Add a collapsible JSON editor panel to demo page
- [ ] Editor shows current dashboard JSON (pretty-printed)
- [ ] "Apply" button re-renders dashboard with edited JSON
- [ ] Invalid JSON shows error message (doesn't crash)
- [ ] Schema validation errors display clearly
- [ ] Use Monaco editor or simple textarea (preference: textarea for simplicity)
- [ ] Run `npm run lint && npm run build` - no errors

---

### US-003: Integrate JsonRenderer into Main Dashboard

**As a** user
**I want** the main dashboard to use json-render for KPI cards
**So that** the dashboard layout can be dynamically configured

**Acceptance Criteria:**
- [ ] Refactor `/` dashboard page to use `JsonRenderer` for KPI section
- [ ] Create `createDashboardJson` function that converts API data to Dashboard JSON
- [ ] KPIs display same data as current implementation (Total Receivables, Payables, Net Position, Active Projects)
- [ ] Existing functionality preserved (alerts panel, activity feed, charts)
- [ ] No visual regression - dashboard looks identical to current
- [ ] Loading states work correctly
- [ ] Run `npm run lint && npm run build` - no errors

---

## Phase 2: API Integration (US-004 to US-006)

### US-004: Create Dashboard JSON API Endpoint

**As a** frontend
**I want** an API endpoint that returns dashboard data as json-render JSON
**So that** I can fetch pre-built dashboard configurations

**Acceptance Criteria:**
- [ ] Create `GET /api/dashboard/json` endpoint
- [ ] Returns valid Dashboard JSON matching schema
- [ ] Includes real data from Supabase (KPIs, alerts, recent activity)
- [ ] Supports query param `?layout=full|compact|kpi-only`
- [ ] Response includes `version: 1` and validates against `DashboardSchema`
- [ ] Add proper error handling for database failures
- [ ] Run `npm run lint && npm run build` - no errors

---

### US-005: Add Projects Overview JSON Endpoint

**As a** frontend
**I want** a JSON endpoint for projects overview
**So that** I can render project summaries dynamically

**Acceptance Criteria:**
- [ ] Create `GET /api/projects/json` endpoint
- [ ] Returns Dashboard JSON with:
  - Grid of project stat cards (active, closed, total value)
  - Bar chart of projects by client
  - Data table of recent projects
- [ ] Supports `?status=active|closed|all` filter
- [ ] Uses real Supabase project data
- [ ] Run `npm run lint && npm run build` - no errors

---

### US-006: Add Receivables/Payables JSON Endpoints

**As a** frontend
**I want** JSON endpoints for A/R and A/P summaries
**So that** financial views can be dynamically rendered

**Acceptance Criteria:**
- [ ] Create `GET /api/receivables/json` endpoint
- [ ] Create `GET /api/payables/json` endpoint
- [ ] Each returns Dashboard JSON with:
  - Summary KPIs (total, overdue, due soon)
  - Aging chart (0-30, 31-60, 61-90, 90+ days)
  - Top 5 items table
- [ ] Real data from Supabase invoices/bills tables
- [ ] Run `npm run lint && npm run build` - no errors

---

## Phase 3: Dynamic Layouts (US-007 to US-009)

### US-007: User-Configurable Dashboard Layout

**As a** user
**I want** to save my preferred dashboard layout
**So that** I see the metrics most important to me

**Acceptance Criteria:**
- [ ] Create `user_preferences` table in Supabase (if not exists)
  - `id`, `user_id`, `dashboard_json`, `created_at`, `updated_at`
- [ ] Add "Customize Dashboard" button on main dashboard
- [ ] Opens modal with drag-and-drop or toggle-based layout editor
- [ ] Save preference to Supabase
- [ ] Load user's saved layout on dashboard load
- [ ] Default layout used if no preference saved
- [ ] Run `npm run lint && npm run build` - no errors

---

### US-008: Dashboard Presets

**As a** user
**I want** preset dashboard layouts
**So that** I can quickly switch between views

**Acceptance Criteria:**
- [ ] Create 3 preset layouts:
  - "Executive Summary" - KPIs + trend chart only
  - "Collections Focus" - Receivables heavy, aging breakdown
  - "Project Manager" - Projects + active work emphasis
- [ ] Add preset selector dropdown to dashboard header
- [ ] Switching presets updates dashboard immediately
- [ ] Store preset selection in localStorage
- [ ] Run `npm run lint && npm run build` - no errors

---

### US-009: Mobile-Optimized Layout

**As a** user
**I want** a mobile-specific dashboard layout
**So that** I can check finances on my iPhone at job sites

**Acceptance Criteria:**
- [ ] Detect mobile viewport (< 768px)
- [ ] Auto-switch to mobile-optimized Dashboard JSON
- [ ] Mobile layout prioritizes:
  - Total Receivables (biggest concern)
  - Overdue amount
  - Bills due this week
  - Quick action buttons
- [ ] Single column layout, larger touch targets
- [ ] Test on iPhone Safari (or responsive dev tools)
- [ ] Run `npm run lint && npm run build` - no errors

---

## Phase 4: AI Integration (US-010 to US-012)

### US-010: Add AI Dashboard Generation Endpoint

**As a** user
**I want** to describe a dashboard in plain English
**So that** AI generates the layout for me

**Acceptance Criteria:**
- [ ] Create `POST /api/dashboard/generate` endpoint
- [ ] Accepts `{ prompt: string }` body
- [ ] Calls Claude API with:
  - System prompt from `dashboardGenerationPrompt`
  - Component catalog as context
  - User's prompt
- [ ] Returns valid Dashboard JSON
- [ ] Validates response against `DashboardSchema` before returning
- [ ] Error handling for invalid AI responses
- [ ] Run `npm run lint && npm run build` - no errors

---

### US-011: Streaming Dashboard Generation UI

**As a** user
**I want** to see the dashboard build progressively
**So that** I get feedback while AI generates

**Acceptance Criteria:**
- [ ] Add "Ask AI" button to dashboard
- [ ] Opens modal with text input for prompt
- [ ] Uses `useStreamingJson` hook during generation
- [ ] Dashboard components render as JSON streams in
- [ ] Loading indicator during stream
- [ ] "Apply" and "Cancel" buttons after generation
- [ ] Run `npm run lint && npm run build` - no errors

---

### US-012: Natural Language Dashboard Queries

**As a** user
**I want** to ask questions like "Show me overdue invoices by client"
**So that** I get instant custom views

**Acceptance Criteria:**
- [ ] Add command palette (Cmd+K) with AI input
- [ ] Example prompts shown as suggestions:
  - "Show receivables aging breakdown"
  - "Compare this month vs last month revenue"
  - "Which projects are most profitable?"
- [ ] Query generates appropriate Dashboard JSON
- [ ] Results replace current dashboard view (with "Back" option)
- [ ] Run `npm run lint && npm run build` - no errors

---

## Verification Checklist

Before marking any story complete:
1. [ ] Code compiles: `npm run build` passes
2. [ ] Linting passes: `npm run lint` passes
3. [ ] Feature works as described in acceptance criteria
4. [ ] No console errors in browser
5. [ ] Responsive design works (if applicable)
6. [ ] Commit message follows format: `US-XXX: [title]`

---

## Dependencies

- `@json-render/core` - Installed
- `@json-render/react` - Installed
- `zod` - Installed
- Claude API key (for US-010+) - Required in env

---

## File References

| File | Purpose |
|------|---------|
| `src/lib/json-render/catalog.ts` | Component schemas (Zod) |
| `src/lib/json-render/renderer.tsx` | React renderer |
| `src/lib/json-render/hooks.ts` | Streaming + action hooks |
| `src/lib/json-render/examples.ts` | Example dashboards |
| `src/app/demo/json-render/page.tsx` | Demo page (US-001) |
| `src/app/api/dashboard/json/route.ts` | JSON API (US-004) |
