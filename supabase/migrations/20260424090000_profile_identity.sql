create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  wallet_address text unique,
  world_username text,
  display_name text,
  avatar_url text,
  verification_status text not null default 'unverified',
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_verification_status_check
    check (verification_status in ('unverified', 'verified', 'blocked'))
);

create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists user_sessions_user_id_idx
  on public.user_sessions(user_id);

create index if not exists user_sessions_expires_at_idx
  on public.user_sessions(expires_at);

create table if not exists public.world_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  action text not null,
  protocol_version text,
  identifier text,
  nullifier_numeric numeric(78, 0),
  session_id text,
  session_nullifier text,
  proof_payload jsonb not null,
  verified_at timestamptz not null default now()
);

create unique index if not exists world_verifications_action_nullifier_idx
  on public.world_verifications(action, nullifier_numeric)
  where nullifier_numeric is not null;

create unique index if not exists world_verifications_session_id_idx
  on public.world_verifications(session_id)
  where session_id is not null;

alter table public.users enable row level security;
alter table public.user_sessions enable row level security;
alter table public.world_verifications enable row level security;
