create table if not exists public.demo_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  payout_mode text not null default 'real',
  label text,
  created_at timestamptz not null default now(),
  constraint demo_runs_payout_mode_check
    check (payout_mode = 'real')
);

alter table public.users
  add column if not exists current_demo_run_id uuid references public.demo_runs(id);

alter table public.task_responses
  add column if not exists demo_run_id uuid references public.demo_runs(id);

alter table public.earnings_ledger
  add column if not exists demo_run_id uuid references public.demo_runs(id);

drop index if exists public.task_responses_task_user_mode_unique;

create unique index if not exists task_responses_task_user_mode_run_unique
  on public.task_responses(
    task_id,
    user_id,
    payout_mode,
    coalesce(demo_run_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create index if not exists task_responses_user_mode_run_idx
  on public.task_responses(user_id, payout_mode, demo_run_id);

create index if not exists earnings_ledger_user_mode_run_status_idx
  on public.earnings_ledger(user_id, payout_mode, demo_run_id, status);

drop index if exists public.earnings_ledger_payout_tx_hash_idx;
drop index if exists public.payout_attempts_payout_tx_hash_idx;

alter table public.demo_runs enable row level security;
