# RunTrim Admin Team Invites v1

Date: 2026-05-27

## Implemented scope
- `/admin` now resolves role from `admin_team_members` for active Supabase-auth users.
- Owner/Admin can invite team members (admin/content_va/analyst).
- Invite tokens are random, only SHA-256 `token_hash` is stored.
- Invite expiry is 7 days.
- Invite accept flow is available at `/admin/invite/[token]`.
- Growth Ops data paths now persist to Supabase tables instead of browser localStorage source-of-truth.

## Invite flow
1. Owner/Admin opens Team tab in `/admin`.
2. Submits email + role (+ optional note).
3. API creates invite record in `admin_invites` with:
   - `token_hash`
   - `status=pending`
   - `expires_at` = now + 7 days
4. API upserts `admin_team_members` with `status=invited`.
5. Resend invite email is sent with `/admin/invite/<token>` link.
6. Invitee opens link, token is validated server-side by hash.
7. Invitee signs in via existing Supabase auth and completes onboarding fields.
8. API marks invite accepted and activates `admin_team_members`.
9. Invitee is redirected to `/admin`.

## Email template
- Subject: `You’ve been invited to RunTrim Growth Ops`
- Dark premium RunTrim style via existing `src/lib/email.ts` shell/tokens.
- Includes inviter name, role, CTA, expiry note, optional note block.

## Role enforcement
- Server helper: `src/lib/admin-roles-server.ts`
- Source of truth: `admin_team_members` where `status=active`.
- Dev fallback: `RUNTRIM_ADMIN_ROLE` is used only when DB role is missing and `NODE_ENV !== production`.
- Role tab access:
  - owner/admin: full admin + Team tab
  - content_va: Growth Ops/Content/Assets/Replies/Checklist/Approvals/Analytics Lite
  - analyst: Analytics Lite only

## Growth persistence
- New growth API route family:
  - `/api/admin/growth/[resource]` for `posts`, `assets`, `replies`, `daily-logs`, `approvals`
- Components moved from localStorage to API-backed Supabase persistence:
  - Content
  - Assets
  - Replies
  - Checklist
  - Approvals
  - Growth Ops summary dependencies
  - Analytics Lite content counts

## Limitation (v1)
- Invite page requires invitee email to match the signed-in Supabase user email.
- No dedicated magic-link bootstrap in invite route yet; uses existing `/login?next=...` flow.

