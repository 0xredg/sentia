# Data Model

Supabase is the source of truth for Sentia app state.

Use `uuid` primary keys for app records. Use `numeric` for token amounts and World ID nullifier values that can exceed normal integer ranges.

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
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Allowed `verification_status` values:

- `unverified`
- `verified`
- `blocked`

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

For recurring identity continuity, prefer storing `session_id`. For one-time proof replay protection, store the nullifier.

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
- `demo_source_id` links seeded hackathon demo rows back to `demo/feed-cards/feed-card-examples.csv`.
- `prompt` is the user-facing question or request shown on the card.
- `input_payload.image_path` stores a relative static asset path such as `/demo/feed-cards/images/1_ebay.png`.
- `input_payload.company`, `content_idea`, and `why_human` store demo context for operators and future tooling.
- `response_schema.type` stores the control type, such as `thumbs`, `binary`, `choice_number`, `choice_text`, or `rating`.
- `response_schema.options` stores the ordered answer options rendered as buttons.

Allowed `status` values:

- `draft`
- `open`
- `closed`
- `expired`

MVP task types:

- `sentiment_judgment`
- `content_safety`
- `qualitative_feedback`
- `one_human_decision`

### task_responses

Stores answers submitted by verified humans.

Fields:

- `id uuid primary key`
- `task_id uuid not null references tasks(id)`
- `user_id uuid not null references users(id)`
- `answer_payload jsonb not null`
- `status text not null default 'accepted'`
- `created_at timestamptz not null default now()`

Constraints:

- unique `(task_id, user_id)`

Allowed `status` values:

- `accepted`
- `rejected`
- `flagged`

### earnings_ledger

Immutable-ish reward ledger for completed work.

Fields:

- `id uuid primary key`
- `user_id uuid not null references users(id)`
- `task_response_id uuid references task_responses(id)`
- `token text not null default 'WLD'`
- `amount numeric not null`
- `status text not null default 'pending'`
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
- Do not mark an earning as `paid` until the payout transaction is confirmed.
- Do not delete ledger entries; append status changes or update controlled status fields.

### payout_attempts

Tracks attempts to send WLD from Sentia treasury to workers.

Fields:

- `id uuid primary key`
- `user_id uuid not null references users(id)`
- `earning_id uuid references earnings_ledger(id)`
- `token text not null default 'WLD'`
- `amount numeric not null`
- `to_wallet_address text not null`
- `status text not null default 'pending'`
- `transaction_hash text`
- `user_op_hash text`
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

### treasury_events

Operational audit log for treasury activity.

Fields:

- `id uuid primary key`
- `event_type text not null`
- `token text not null default 'WLD'`
- `amount numeric`
- `wallet_address text`
- `transaction_hash text`
- `metadata jsonb not null default '{}'`
- `created_at timestamptz not null default now()`

Example `event_type` values:

- `payout_submitted`
- `payout_confirmed`
- `payout_failed`
- `treasury_low_balance`
- `manual_adjustment`

## Minimal SQL Sketch

This is a planning sketch, not a final migration.

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  wallet_address text unique,
  world_username text,
  display_name text,
  avatar_url text,
  verification_status text not null default 'unverified',
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  demo_source_id integer unique,
  requester_name text not null,
  title text not null,
  prompt text not null,
  task_type text not null,
  input_payload jsonb not null default '{}',
  response_schema jsonb not null default '{}',
  reward_token text not null default 'WLD',
  reward_amount numeric not null,
  max_responses integer not null default 1,
  status text not null default 'open',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table task_responses (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id),
  user_id uuid not null references users(id),
  answer_payload jsonb not null,
  status text not null default 'accepted',
  created_at timestamptz not null default now(),
  unique (task_id, user_id)
);
```

## RLS Guidance

- Client reads may use RLS for the current user's profile, earnings, and payout history.
- Task reads can expose only open tasks.
- Writes that affect rewards or payouts should go through server routes using service role.
- Never allow the client to directly insert paid earnings or payout attempts.
