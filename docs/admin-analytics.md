# RunTrim Admin Analytics

## Route
- Admin UI: `/admin`
- Login API: `/api/admin/login`
- Logout API: `/api/admin/logout`
- Metrics API: `/api/admin/metrics`
- Event ingest API: `/api/events`

## Required Env Vars
- `RUNTRIM_ADMIN_USERNAME`
- `RUNTRIM_ADMIN_PASSWORD`
- `RUNTRIM_ADMIN_SESSION_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

In production, missing admin vars shows: `Admin access is not configured.`

## SQL Tables Expected
### `public.runtrim_events`
Columns:
- `id`
- `event_name`
- `source`
- `anonymous_id`
- `session_id`
- `project_id`
- `cli_version`
- `page_path`
- `referrer`
- `user_agent`
- `country`
- `metadata` (`jsonb`)
- `created_at`

### Optional: `public.runtrim_early_access`
If missing, admin shows: `Early access table not found.`

## Event Names
Web:
- `page_view`
- `install_cta_clicked`
- `install_command_copied`
- `early_access_opened`
- `early_access_submitted`
- `pricing_cta_clicked`
- `docs_clicked`
- `how_it_works_clicked`

CLI:
- `cli_start`
- `cli_init`
- `cli_prepare`
- `cli_run`
- `cli_watch`
- `cli_check`
- `cli_continue`
- `cli_memory`
- `cli_report`
- `cli_sync`
- `cli_panel`
- `cli_error`

## Privacy Rules
- Never send source code, raw file contents, env values, secrets, raw prompts, or raw repo paths.
- Metadata is sanitized server-side and sensitive keys are dropped.
- CLI telemetry is opt-in only. It stays disabled unless telemetry is enabled in local/global config.
- CLI project identity is hashed before send.

## How To Test
1. Set admin env vars locally.
2. Start app and open `/admin`.
3. Log in with admin username and password.
4. Visit tracked pages (`/`, `/app/install`, `/how-it-works`, `/privacy`, `/terms`, `/security`).
5. Click install CTA and pricing/docs/how-it-works links.
6. Copy install commands (`npm install -g runtrim`, `runtrim start`) on install page.
7. Submit early access form.
8. Refresh `/admin` and confirm summary/funnel/tables update.
