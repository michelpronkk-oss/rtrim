create extension if not exists pgcrypto;

create table if not exists public.runtrim_early_access (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text,
  agent text,
  use_case text,
  source text default 'homepage',
  status text default 'pending',
  created_at timestamptz default now()
);
