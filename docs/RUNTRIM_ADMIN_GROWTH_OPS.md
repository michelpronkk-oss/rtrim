# RunTrim Admin Growth Ops v1

Internal operating system for RunTrim growth, content, assets, approvals and analytics.

## Role System

Configured via the `RUNTRIM_ADMIN_ROLE` environment variable.

| Value | Role | Access |
|---|---|---|
| (unset or any other value) | Owner | Full access to all tabs |
| `admin` | Admin | Overview, Growth Ops, Content, Assets, Replies, Approvals, Activity, Planning |
| `content_va` | Content VA | Growth Ops, Content, Assets, Replies, Checklist, Analytics (safe) |
| `analyst` | Analyst | Overview, Activity (read-only metrics) |

The role is read server-side in `src/app/admin/page.tsx` via `getAdminRole()` from `src/lib/admin-roles.ts` and passed as a prop to `AdminDashboard`. No auth logic is changed.

## Tabs by Role

### Owner / Admin
1. Overview - existing metrics (traffic, activation, revenue, funnel)
2. Growth Ops - command center
3. Content - content calendar (full CRUD)
4. Assets - asset library (full CRUD)
5. Replies - reply inbox (full CRUD)
6. Approvals - aggregated approval queue
7. Activity - existing activity tab (events, traffic sources, early access)
8. Planning - existing 30-day planning tracker

### Content VA
1. Growth Ops - command center (no revenue data)
2. Content - content calendar (full CRUD)
3. Assets - asset library (full CRUD)
4. Replies - reply inbox (full CRUD)
5. Checklist - daily VA checklist
6. Analytics - traffic and content metrics only (no MRR, no billing)

### Analyst
1. Overview - existing metrics (read-only)
2. Activity - existing activity tab (read-only)

## Data Storage

All Growth Ops data is persisted to browser `localStorage` in v1. No backend tables required.

| localStorage Key | Purpose |
|---|---|
| `runtrim_admin_content_v1` | Content calendar items |
| `runtrim_admin_assets_v1` | Asset library entries |
| `runtrim_admin_replies_v1` | Reply inbox items |
| `runtrim_admin_checklist_v1` | Daily VA checklist state (keyed by date) |
| `runtrim_admin_growth_notes_v1` | Growth Ops next-actions note |

Data is browser-local. Each admin session on each device has independent data.

## Future Database Tables

When the Growth Ops workflow needs multi-device sync or team access, migrate to these Supabase tables:

```sql
-- Stores content calendar items
CREATE TABLE growth_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  hook text,
  platform text,
  post_type text,
  bucket text,
  caption text,
  visual_link text,
  status text DEFAULT 'Idea',
  owner text,
  scheduled_date date,
  posted_url text,
  performance text,
  next_action text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Stores visual and content assets
CREATE TABLE growth_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text,
  source text,
  status text DEFAULT 'raw',
  file_link text,
  notes text,
  related_post_id uuid REFERENCES growth_posts(id),
  created_at timestamptz DEFAULT now()
);

-- Stores reply inbox items
CREATE TABLE growth_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text,
  post_url text,
  comment_text text,
  suggested_reply text,
  priority text DEFAULT 'medium',
  status text DEFAULT 'needs reply',
  owner text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Stores daily VA checklist completion
CREATE TABLE growth_daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date date NOT NULL UNIQUE,
  checked_items integer[] DEFAULT '{}',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Stores approval records (derived from posts/assets/replies)
CREATE TABLE growth_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_type text,  -- 'post' | 'asset' | 'reply'
  ref_id uuid,
  status text DEFAULT 'pending',
  approved_by text,
  approved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Role assignments (future multi-user admin support)
CREATE TABLE admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'content_va',
  created_at timestamptz DEFAULT now()
);
```

## Files

### New files
- `src/lib/admin-roles.ts` - Role types, getAdminRole(), getTabsForRole(), getDefaultTab()
- `src/components/admin/admin-growth-ops.tsx` - Growth Ops command center
- `src/components/admin/admin-content-calendar.tsx` - Content calendar CRUD
- `src/components/admin/admin-asset-library.tsx` - Asset library CRUD
- `src/components/admin/admin-reply-inbox.tsx` - Reply inbox CRUD
- `src/components/admin/admin-va-checklist.tsx` - Daily VA checklist
- `src/components/admin/admin-approvals.tsx` - Aggregated approval queue
- `src/components/admin/admin-analytics-lite.tsx` - Safe analytics for Content VA

### Modified files
- `src/components/admin/admin-dashboard.tsx` - Added role prop, new tabs, imported components
- `src/app/admin/page.tsx` - Reads role from env, passes to AdminDashboard

## Security Notes

- Revenue, MRR, and paid user data are not shown to Content VA or Analyst roles
- No customer email addresses or billing details are accessible to Content VA
- The role is read from an env var server-side, not from any user-controlled input
- All admin routes remain protected by the existing HMAC-signed session cookie
- No changes to auth, billing, webhooks, CLI, or middleware
