# Technical Architecture

## System Overview

```mermaid
flowchart TD
  A[World App WebView] --> B[Next.js Mini App]
  B --> C[Next.js Server Routes]
  C --> D[Supabase Postgres]
  C --> E[World Developer Portal APIs]
  C --> F[Sentia Treasury Wallet]
  B --> G[MiniKit + IDKit]
  G --> A
```

Sentia uses Next.js for both the Mini App frontend and the server routes that must keep secrets private. Supabase stores durable app state. World APIs verify humanity and wallet operations. A treasury wallet sends real WLD payouts.

## Frontend Responsibilities

- Render the three-tab mobile UI: Feed, Earnings, Profile.
- Render Feed cards from task data returned by server routes.
- Initialize MiniKit with `MiniKitProvider`.
- Detect whether the app is running inside World App with `MiniKit.isInstalled()`.
- Start Wallet Auth when a wallet-linked session is required.
- Start IDKit verification from Profile.
- Submit task responses and render server-confirmed earning states.
- Never decide final verification, reward, or payout status locally.

## Backend Responsibilities

- Generate SIWE nonces and verify Wallet Auth payloads.
- Generate World ID 4.0 RP signatures using `RP_SIGNING_KEY`.
- Verify IDKit proof payloads against `POST https://developer.world.org/api/v4/verify/{rp_id}`.
- Enforce task completion rules.
- Create earnings ledger entries.
- Execute and reconcile WLD payouts from the treasury wallet.
- Use Supabase service role only from server-side code.

## Supabase Responsibilities

- Store users, verification records, tasks, responses, earnings, payouts, and treasury events.
- Store task metadata and relative paths to static Feed card images.
- Enforce uniqueness constraints for one response per user per task.
- Enforce uniqueness for World ID proof replay protection.
- Provide read APIs for mobile screens.
- Use RLS for direct client reads only if the Supabase anonymous key is exposed.

## API Boundary

Initial server routes:

- `POST /api/auth/nonce`: create SIWE nonce.
- `POST /api/auth/complete-siwe`: verify Wallet Auth payload and create session.
- `POST /api/world/rp-signature`: sign IDKit RP context for a known action.
- `POST /api/world/verify-proof`: forward IDKit result to World and persist verification.
- `GET /api/tasks/next`: return next eligible task for verified user.
- `POST /api/tasks/:taskId/responses`: validate and store task response.
- `GET /api/earnings`: return ledger and payout summary.
- `POST /api/payouts/run`: protected admin/job endpoint to process pending payouts.

Protected routes must identify the current user from a server-verified session, not from a client-submitted wallet address alone.

## Feed Demo Assets

Hackathon Feed card images are versioned in the repo and served by Next.js from `public/demo/feed-cards/images`.

Supabase does not store image blobs. `tasks.input_payload.image_path` stores the relative path used by the frontend, for example `/demo/feed-cards/images/1_ebay.png`.

`demo/feed-cards/feed-card-examples.csv` remains the source catalogue for future demo tasks. Only rows with existing image assets should be seeded into `tasks`.

## Verification Data Flow

```mermaid
sequenceDiagram
  participant User
  participant Client
  participant Backend
  participant World as World Verify API
  participant DB as Supabase

  User->>Client: Tap Verify
  Client->>Backend: Request RP signature(action)
  Backend-->>Client: rp_context
  Client->>User: Open IDKit request
  User-->>Client: IDKit proof result
  Client->>Backend: Submit proof result
  Backend->>World: POST /api/v4/verify/{rp_id}
  World-->>Backend: Verification result
  Backend->>DB: Store verification + user state
  Backend-->>Client: Verified
```

## Task And Reward Data Flow

```mermaid
sequenceDiagram
  participant Client
  participant Backend
  participant DB as Supabase
  participant Treasury

  Client->>Backend: Submit task response
  Backend->>DB: Check user, task, duplicate response
  Backend->>DB: Insert response
  Backend->>DB: Insert pending earning
  Backend-->>Client: Accepted + earning
  Backend->>Treasury: Send WLD payout
  Treasury-->>Backend: Transaction hash/status
  Backend->>DB: Store payout attempt
  Backend->>DB: Mark earning paid after confirmation
```

## Environment Variables

Client-safe:

- `NEXT_PUBLIC_WORLD_APP_ID`
- `NEXT_PUBLIC_WORLD_RP_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Server-only:

- `WORLD_APP_ID`
- `WORLD_RP_ID`
- `RP_SIGNING_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`
- `SENTIA_TREASURY_PRIVATE_KEY`
- `WORLD_DEV_PORTAL_API_KEY`
- `WORLD_CHAIN_RPC_URL`

Use public prefixes only for values intentionally exposed to the browser.

## Deployment Assumptions

- Deploy Next.js to Vercel or another platform with server route support.
- Use Supabase hosted Postgres for the hackathon.
- Use World Chain mainnet only when the treasury wallet is funded and payout amounts are intentionally small.
- Use a protected job trigger for payouts; do not expose payout execution to arbitrary users.
- Add basic structured logging for proof verification, task completion, and payout failures.
