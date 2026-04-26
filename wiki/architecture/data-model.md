# Data Model

Supabase is the source of truth for Sentia app state. The blockchain is the source of truth for whether a real vault payout hash has been paid.

Use `uuid` primary keys for app records. Use `numeric` for token amounts. Server routes own writes that affect rewards or payouts.

## Modes And Demo Runs

Sentia can run mock and real rewards against the same Supabase project.

- `payout_mode = 'mock'`: local/demo WLD, no chain transaction.
- `payout_mode = 'real'`: World Chain WLD paid from `SentiaRewardVault`.

Real production demos are repeatable through `demo_runs`. Starting a new run changes `users.current_demo_run_id`; it does not delete old responses, earnings, or real payouts.

## Tables

### users

Represents one Sentia worker/requester account.

Fields:

- `id uuid primary key`
- `wallet_address text unique`
- `world_username text`
- `display_name text`
- `avatar_url text`
- `verification_status text not null default 'unverified'`
- `verified_at timestamptz`
- `builder_access_status text not null default 'none'`
- `builder_access_granted_at timestamptz`
- `claim_nonce bigint not null default 0`
- `current_demo_run_id uuid references demo_runs(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Allowed `verification_status` values:

- `unverified`
- `verified`
- `blocked`

Allowed `builder_access_status` values:

- `none`
- `granted`

`claim_nonce` is used in EIP-191 claim messages and increments after a real payout is fully finalized.

### world_verifications

Stores World ID proof verification records and replay-protection data.

Fields:

- `id uuid primary key`
- `user_id uuid not null references users(id)`
- `action text not null`
- `protocol_version text`
- `identifier text`
- `nullifier_numeric numeric(78, 0)`
- `session_id text`
- `session_nullifier text`
- `proof_payload jsonb not null`
- `verified_at timestamptz not null default now()`

Constraints:

- unique `(action, nullifier_numeric)` where `nullifier_numeric is not null`
- unique `(session_id)` where `session_id is not null`

### demo_runs

Scopes repeatable real demos without deleting historical real payouts.

Fields:

- `id uuid primary key`
- `user_id uuid not null references users(id)`
- `payout_mode text not null default 'real'`
- `label text`
- `created_at timestamptz not null default now()`

Current constraint:

- `payout_mode = 'real'`

### tasks

Represents work available in the Feed.

Fields:

- `id uuid primary key`
- `demo_source_id integer unique`
- `requester_name text not null`
- `title text not null`
- `prompt text not null`
- `task_type text not null`
- `input_payload jsonb not null default '{}'`
- `response_schema jsonb not null default '{}'`
- `reward_token text not null default 'WLD'`
- `reward_amount numeric not null`
- `max_responses integer not null default 1`
- `status text not null default 'open'`
- `expires_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Feed card conventions:

- `requester_name` is the company/app shown in the card "From" area.
- `demo_source_id` links seeded rows back to `demo/feed-cards/feed-card-examples.csv`.
- `prompt` is the user-facing question or request shown on the card.
- `input_payload.image_path` stores a relative static asset path.
- `response_schema.type` stores the control type.
- `response_schema.options` stores the ordered answer options rendered as buttons.

Allowed `status` values:

- `draft`
- `open`
- `closed`
- `expired`

### task_responses

Stores answers submitted by eligible humans.

Fields:

- `id uuid primary key`
- `task_id uuid not null references tasks(id)`
- `user_id uuid not null references users(id)`
- `answer_payload jsonb not null`
- `status text not null default 'accepted'`
- `payout_mode text not null default 'mock'`
- `demo_run_id uuid references demo_runs(id)`
- `created_at timestamptz not null default now()`

Constraints:

- unique `(task_id, user_id, payout_mode, coalesce(demo_run_id, zero_uuid))`

Allowed `status` values:

- `accepted`
- `rejected`
- `flagged`

This lets the same user complete the same seeded task once in mock mode and again in real mode, and once per real demo run.

### earnings_ledger

Reward ledger for completed work.

Fields:

- `id uuid primary key`
- `user_id uuid not null references users(id)`
- `task_response_id uuid references task_responses(id)`
- `token text not null default 'WLD'`
- `amount numeric not null`
- `status text not null default 'pending'`
- `payout_mode text not null default 'mock'`
- `demo_run_id uuid references demo_runs(id)`
- `chain_id integer`
- `recipient_wallet text`
- `payout_contract_address text`
- `payout_token_address text`
- `payout_tx_hash text`
- `payout_error text`
- `mock_tx_id text`
- `created_at timestamptz not null default now()`
- `paid_at timestamptz`

Allowed `status` values:

- `pending`
- `processing`
- `paid`
- `failed`
- `blocked`

Rules:

- Create one ledger entry after a task response is accepted.
- Real claim flow moves `pending -> processing -> paid`.
- Mock claim flow can atomically move `pending -> paid`.
- Do not delete real paid ledger entries.
- Do not enforce global uniqueness on `payout_tx_hash`; a batch payout shares one tx hash across multiple earnings.

### claim_intents

Stores short-lived real payout authorizations before the user signs in World App.

Fields:

- `id uuid primary key`
- `user_id uuid not null references users(id)`
- `payout_mode text not null default 'real'`
- `earning_ids uuid[] not null`
- `earning_ids_hash text not null`
- `amount_wei text not null`
- `amount_formatted text not null`
- `nonce bigint not null`
- `deadline bigint not null`
- `wallet_address text not null`
- `vault_address text not null`
- `chain_id integer not null`
- `token_address text not null`
- `message text not null`
- `status text not null default 'pending'`
- `created_at timestamptz not null default now()`
- `consumed_at timestamptz`

Allowed `status` values:

- `pending`
- `consumed`
- `expired`

Claim intents do not mark earnings `processing` by themselves. They only capture the exact message to be signed and later verified.

### payout_attempts

Tracks each payout attempt for mock and real rewards.

Fields:

- `id uuid primary key`
- `earning_id uuid not null references earnings_ledger(id)`
- `user_id uuid not null references users(id)`
- `payout_mode text not null`
- `token text not null default 'WLD'`
- `amount numeric not null`
- `recipient_wallet text`
- `status text not null default 'pending'`
- `chain_id integer`
- `payout_contract_address text`
- `payout_token_address text`
- `payout_tx_hash text`
- `mock_tx_id text`
- `error_code text`
- `error_message text`
- `created_at timestamptz not null default now()`
- `submitted_at timestamptz`
- `confirmed_at timestamptz`

Allowed `status` values:

- `pending`
- `submitted`
- `confirmed`
- `failed`
- `blocked`

Confirmed metadata rules:

- mock confirmed attempts have `mock_tx_id` and no real tx hash;
- real confirmed attempts have `payout_tx_hash` and no mock tx id.

`payout_tx_hash` is not globally unique because a real `payoutBatch` transaction can confirm multiple attempts.

## RLS Guidance

- Client reads may use RLS for the current user's profile, earnings, and payout history.
- Task reads can expose only open tasks.
- Writes that affect rewards, claim intents, or payouts should go through server routes using service role.
- Never allow the client to directly insert paid earnings or payout attempts.

