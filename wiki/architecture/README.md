# Sentia Mini App Architecture

This folder is the technical base for the Sentia hackathon MVP.

Sentia is a World Mini App where verified humans complete judgment tasks and receive WLD rewards. The product has three tabs:

- Feed: TikTok-style task queue for verified workers
- Earnings: reward balance, payout status, and payout history
- Profile: World ID verification and worker identity state

## Target Stack

- Frontend: Next.js World Mini App using `@worldcoin/minikit-js` and `@worldcoin/idkit`
- Backend: Next.js server routes plus Supabase
- Database: Supabase Postgres with row-level security where possible
- Identity: World ID 4.0 in Managed mode through IDKit
- Wallet auth: MiniKit Wallet Auth / SIWE, verified on the backend
- Rewards: real WLD payouts from a small Sentia treasury wallet

## Architecture Principles

- Keep the demo loop short: verify, answer, earn, see payout.
- Store all product state in Supabase, not client memory.
- Treat the backend as the authority for verification, task completion, and payouts.
- Keep World secrets and treasury keys server-only.
- Prefer clear operational states over hidden magic.

## Documents

- [Product Flows](./product-flows.md)
- [Technical Architecture](./technical-architecture.md)
- [Data Model](./data-model.md)
- [World Integration](./world-integration.md)
- [MVP Build Plan](./mvp-build-plan.md)

## MVP Definition

The hackathon MVP is successful when a judge can understand and see this complete loop:

1. A user opens Sentia inside World App.
2. The user verifies as a real unique human.
3. The user completes a human judgment task in the Feed.
4. Sentia records the answer and creates an earning.
5. Sentia pays WLD from its treasury wallet.
6. The user sees the earning and payout status in Earnings.

## Non-Goals For Hackathon

- No requester dashboard beyond seeded/demo tasks unless time remains.
- No smart contract escrow in the MVP.
- No full reputation system.
- No complex consensus logic across many workers.
- No generic marketplace mechanics.

## Critical Secrets

These values must never be exposed in client-side code:

- `RP_SIGNING_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- treasury wallet private key
- Developer Portal API key, if used for transaction verification

Public or client-safe values:

- `WORLD_APP_ID`
- `WORLD_RP_ID`
- Supabase anonymous key, if protected by RLS
