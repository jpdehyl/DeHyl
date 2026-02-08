# DeHyl Financials — Authentication & Roles Plan

## Overview
Implement Supabase Auth with role-based access control (RBAC) for DeHyl Financials.

## Roles Definition

| Role | Description | Users |
|------|-------------|-------|
| `admin` | Full access to everything | JP |
| `ops` | Operations - projects, invoices, daily logs, payables, receivables | Paola |
| `field` | Field workers - daily logs, photos for assigned projects only | Oscar, crew |
| `client` | View-only access to their project portal + photos | Clients |

## Access Matrix

| Feature | admin | ops | field | client |
|---------|-------|-----|-------|--------|
| Dashboard | ✅ Full | ✅ Full | ❌ | ❌ |
| Projects List | ✅ All | ✅ All | ✅ Assigned only | ❌ |
| Project Detail | ✅ Full | ✅ Full | ✅ Assigned (limited) | ✅ Portal view |
| Daily Logs | ✅ All | ✅ All | ✅ Create/Edit own | ❌ |
| Internal Notes | ✅ | ✅ | ❌ | ❌ |
| Photos | ✅ All | ✅ All | ✅ Upload to assigned | ✅ View own project |
| Receivables | ✅ | ✅ | ❌ | ❌ |
| Payables | ✅ | ✅ | ❌ | ❌ |
| Bids | ✅ | ✅ | ❌ | ❌ |
| Profitability | ✅ | ❌ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ | ❌ |

## Technical Implementation

### Phase 1: Supabase Auth Setup
1. Enable Supabase Auth in project
2. Create `profiles` table with role
3. Set up RLS policies
4. Add auth middleware to Next.js

### Phase 2: Database Schema

```sql
-- User profiles with roles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'client' 
    CHECK (role IN ('admin', 'ops', 'field', 'client')),
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project assignments for field workers
CREATE TABLE project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'worker', -- worker, supervisor
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),
  UNIQUE(user_id, project_id)
);

-- Client-project links
CREATE TABLE client_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  access_code TEXT, -- Legacy portal code
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES profiles(id),
  UNIQUE(user_id, project_id)
);
```

### Phase 3: RLS Policies

```sql
-- Profiles: users can read their own, admins can read all
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Projects: based on role and assignment
CREATE POLICY "Admin/Ops see all projects" ON projects
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'ops'))
  );

CREATE POLICY "Field sees assigned projects" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_assignments 
      WHERE user_id = auth.uid() AND project_id = projects.id
    )
  );

-- Daily logs: based on role
CREATE POLICY "Admin/Ops see all daily logs" ON daily_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'ops'))
  );

CREATE POLICY "Field can manage own project logs" ON daily_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_assignments 
      WHERE user_id = auth.uid() AND project_id = daily_logs.project_id
    )
  );
```

### Phase 4: Next.js Integration

```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  // Public routes
  const publicRoutes = ['/login', '/portal']
  if (publicRoutes.some(route => req.nextUrl.pathname.startsWith(route))) {
    return res
  }

  // Require auth for everything else
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}
```

### Phase 5: UI Components

1. **Login Page** (`/login`)
   - Email/password login
   - Magic link option
   - "Forgot password" flow

2. **User Menu** (header)
   - Profile dropdown
   - Role badge
   - Sign out

3. **Settings > Users** (admin only)
   - List users
   - Invite new user
   - Change roles
   - Assign to projects

## Migration Strategy

1. **Seed admin user** — JP's email as admin
2. **Seed ops user** — Paola's email as ops
3. **Keep portal codes working** — Backwards compatible for existing clients
4. **Gradual rollout** — Start with login optional, then required

## Timeline

| Phase | Estimate | Priority |
|-------|----------|----------|
| Phase 1: Auth Setup | 2-3 hours | P1 |
| Phase 2: Database | 1 hour | P1 |
| Phase 3: RLS Policies | 2 hours | P1 |
| Phase 4: Middleware | 2 hours | P1 |
| Phase 5: UI | 3-4 hours | P2 |
| Testing & Polish | 2 hours | P2 |

**Total: ~12-14 hours**

## Environment Variables Needed

```env
# Already have these
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# May need for server-side
SUPABASE_SERVICE_ROLE_KEY=
```

## Open Questions

1. **Magic links vs passwords?** — Magic links are simpler, passwords are faster
2. **Oscar's access** — Should he see financials for his projects?
3. **Client self-registration?** — Or invite-only?
4. **2FA for admin?** — Extra security for JP

---

*Created: 2026-01-30*
*Author: Robbie*
