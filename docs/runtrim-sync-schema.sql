-- RunTrim Sync V0 schema
-- Private beta setup. This schema stores metadata only.
-- RLS hardening is required before multi-user production.

create extension if not exists pgcrypto;

create table if not exists runtrim_projects (
  id uuid primary key default gen_random_uuid(),
  local_project_id text unique not null,
  name text not null,
  stack jsonb default '[]'::jsonb,
  package_manager text,
  last_status text,
  last_task text,
  next_safe_action text,
  next_safe_prompt text,
  estimated_tokens_trimmed bigint default 0,
  estimated_dollars_standard numeric default 0,
  estimated_dollars_expensive numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists runtrim_project_memory (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references runtrim_projects(id) on delete cascade,
  markdown text,
  current_state text,
  previous_task text,
  latest_status text,
  next_safe_action text,
  next_safe_prompt text,
  updated_at timestamptz default now(),
  unique(project_id)
);

create table if not exists runtrim_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references runtrim_projects(id) on delete cascade,
  local_id text not null,
  task text,
  status text,
  created_at_local text,
  evaluated_at_local text,
  risk_before text,
  risk_after text,
  score_before int,
  score_after int,
  risk_reduction_percent int,
  estimated_tokens_trimmed bigint default 0,
  estimated_dollars_standard numeric default 0,
  estimated_dollars_expensive numeric default 0,
  changed_files jsonb default '[]'::jsonb,
  missing_proof_items jsonb default '[]'::jsonb,
  detected_risks jsonb default '[]'::jsonb,
  sensitive_areas jsonb default '[]'::jsonb,
  watch_status text,
  watch_warnings jsonb default '[]'::jsonb,
  watch_changed_files jsonb default '[]'::jsonb,
  next_safe_prompt text,
  latest_prompt text,
  continuation_prompt text,
  synced_at timestamptz default now(),
  unique(project_id, local_id)
);

-- Safe migration for existing tables
alter table public.runtrim_runs add column if not exists next_safe_prompt text;
alter table public.runtrim_runs add column if not exists latest_prompt text;
alter table public.runtrim_runs add column if not exists continuation_prompt text;
alter table public.runtrim_project_memory add column if not exists next_safe_prompt text;
