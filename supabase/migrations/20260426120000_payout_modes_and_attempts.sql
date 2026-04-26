alter table public.users
  add column if not exists claim_nonce bigint not null default 0;

alter table public.earnings_ledger
  add column if not exists payout_mode text not null default 'mock',
  add column if not exists chain_id integer,
  add column if not exists recipient_wallet text,
  add column if not exists payout_contract_address text,
  add column if not exists payout_token_address text,
  add column if not exists payout_tx_hash text,
  add column if not exists payout_error text,
  add column if not exists mock_tx_id text;

update public.earnings_ledger
set payout_mode = 'mock'
where payout_mode is null;

alter table public.earnings_ledger
  drop constraint if exists earnings_ledger_payout_mode_check;

alter table public.earnings_ledger
  add constraint earnings_ledger_payout_mode_check
    check (payout_mode in ('mock', 'real'));

create index if not exists earnings_ledger_user_mode_status_idx
  on public.earnings_ledger(user_id, payout_mode, status);

create unique index if not exists earnings_ledger_mock_tx_id_idx
  on public.earnings_ledger(mock_tx_id)
  where mock_tx_id is not null;

create unique index if not exists earnings_ledger_payout_tx_hash_idx
  on public.earnings_ledger(payout_tx_hash)
  where payout_tx_hash is not null;

create table if not exists public.payout_attempts (
  id uuid primary key default gen_random_uuid(),
  earning_id uuid not null references public.earnings_ledger(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  payout_mode text not null,
  token text not null default 'WLD',
  amount numeric not null,
  recipient_wallet text,
  status text not null default 'pending',
  chain_id integer,
  payout_contract_address text,
  payout_token_address text,
  payout_tx_hash text,
  mock_tx_id text,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  confirmed_at timestamptz,
  constraint payout_attempts_payout_mode_check
    check (payout_mode in ('mock', 'real')),
  constraint payout_attempts_status_check
    check (status in ('pending', 'submitted', 'confirmed', 'failed', 'blocked')),
  constraint payout_attempts_confirmed_metadata_check
    check (
      status <> 'confirmed'
      or (payout_mode = 'mock' and mock_tx_id is not null and payout_tx_hash is null)
      or (payout_mode = 'real' and payout_tx_hash is not null and mock_tx_id is null)
    )
);

create index if not exists payout_attempts_earning_id_idx
  on public.payout_attempts(earning_id);

create index if not exists payout_attempts_user_mode_status_idx
  on public.payout_attempts(user_id, payout_mode, status);

create unique index if not exists payout_attempts_mock_tx_id_idx
  on public.payout_attempts(mock_tx_id)
  where mock_tx_id is not null;

create unique index if not exists payout_attempts_payout_tx_hash_idx
  on public.payout_attempts(payout_tx_hash)
  where payout_tx_hash is not null;

alter table public.payout_attempts enable row level security;

create or replace function public.claim_mock_earnings(
  p_user_id uuid,
  p_recipient_wallet text
)
returns table (
  id uuid,
  amount numeric,
  token text,
  status text,
  mock_tx_id text,
  paid_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paid_at timestamptz := now();
begin
  return query
  with selected as (
    select
      e.id,
      e.amount,
      e.token
    from public.earnings_ledger e
    where e.user_id = p_user_id
      and e.status = 'pending'
      and e.payout_mode = 'mock'
    order by e.created_at
    for update
  ),
  updated as (
    update public.earnings_ledger e
    set
      status = 'paid',
      paid_at = v_paid_at,
      recipient_wallet = p_recipient_wallet,
      payout_error = null,
      chain_id = null,
      payout_contract_address = null,
      payout_token_address = null,
      payout_tx_hash = null,
      mock_tx_id = 'mock_' || replace(e.id::text, '-', '') || '_' || floor(extract(epoch from v_paid_at) * 1000)::bigint
    from selected s
    where e.id = s.id
    returning
      e.id,
      e.user_id,
      e.amount,
      e.token,
      e.status,
      e.mock_tx_id,
      e.paid_at,
      e.recipient_wallet,
      e.payout_mode
  ),
  attempts as (
    insert into public.payout_attempts (
      earning_id,
      user_id,
      payout_mode,
      token,
      amount,
      recipient_wallet,
      status,
      mock_tx_id,
      submitted_at,
      confirmed_at
    )
    select
      u.id,
      u.user_id,
      u.payout_mode,
      u.token,
      u.amount,
      u.recipient_wallet,
      'confirmed',
      u.mock_tx_id,
      v_paid_at,
      v_paid_at
    from updated u
    returning earning_id
  )
  select
    u.id,
    u.amount,
    u.token,
    u.status,
    u.mock_tx_id,
    u.paid_at
  from updated u;
end;
$$;
