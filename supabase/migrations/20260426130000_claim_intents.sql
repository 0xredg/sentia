create table if not exists public.claim_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  payout_mode text not null default 'real',
  earning_ids uuid[] not null,
  earning_ids_hash text not null,
  amount_wei text not null,
  amount_formatted text not null,
  nonce bigint not null,
  deadline bigint not null,
  wallet_address text not null,
  vault_address text not null,
  chain_id integer not null,
  token_address text not null,
  message text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  consumed_at timestamptz,
  constraint claim_intents_payout_mode_check
    check (payout_mode = 'real'),
  constraint claim_intents_status_check
    check (status in ('pending', 'consumed', 'expired')),
  constraint claim_intents_consumed_at_check
    check (
      (status = 'consumed' and consumed_at is not null)
      or (status <> 'consumed')
    )
);

create index if not exists claim_intents_user_status_idx
  on public.claim_intents(user_id, status, created_at desc);

create index if not exists claim_intents_deadline_idx
  on public.claim_intents(deadline);

alter table public.claim_intents enable row level security;
