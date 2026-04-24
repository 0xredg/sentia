# World Integration

Sentia should use World primitives only where they are product-critical: verified humanity, mobile wallet identity, and WLD payouts.

## MiniKit

Use `@worldcoin/minikit-js` and wrap the app in `MiniKitProvider`.

Responsibilities:

- Detect World App environment with `MiniKit.isInstalled()`.
- Run Wallet Auth for wallet-linked sessions.
- Read World user metadata when available.
- Trigger World App-native commands when needed.

Do not use World ID verification as login. Use Wallet Auth/SIWE for login/session, and IDKit verification for proof of humanity.

## Wallet Auth / SIWE

Wallet Auth proves control of the user's wallet.

Flow:

1. Client requests nonce from `POST /api/auth/nonce`.
2. Client calls `MiniKit.walletAuth()`.
3. Client sends payload and nonce to `POST /api/auth/complete-siwe`.
4. Backend verifies with `verifySiweMessage`.
5. Backend creates or updates the `users` row.

Backend must validate:

- nonce matches the server-issued nonce
- SIWE signature is valid
- optional statement/request id matches expected values

Use wallet address as an account binding, not as public display text. Prefer username in the UI.

## World ID 4.0 / IDKit

World ID proves the user is a real, unique human.

Sentia app is in Managed mode. Managed handles on-chain RP management in Developer Portal, but the app still needs backend RP signing for proof requests.

Required environment values:

- `WORLD_APP_ID=app_xxx`
- `WORLD_RP_ID=rp_xxx`
- `RP_SIGNING_KEY=<server-only signing key>`

Profile verification action:

- `sentia-profile-verification`

Recommended for MVP:

- use IDKit 4.x
- set `allow_legacy_proofs: true` while World ID 4.0 migration is ongoing
- use an Orb-compatible preset for hackathon demo
- store proof replay identifiers returned by IDKit

## RP Signature Endpoint

Route: `POST /api/world/rp-signature`

Input:

```json
{
  "action": "sentia-profile-verification"
}
```

Behavior:

- validate action against an allowlist
- call `signRequest` with `RP_SIGNING_KEY`
- return `sig`, `nonce`, `created_at`, and `expires_at`

Never accept arbitrary action strings without validation. Never generate RP signatures on the client.

## Proof Verification Endpoint

Route: `POST /api/world/verify-proof`

Input:

```json
{
  "idkitResponse": {}
}
```

Behavior:

1. Read current authenticated user from server session.
2. Forward `idkitResponse` as-is to `POST https://developer.world.org/api/v4/verify/{WORLD_RP_ID}`.
3. If World verification fails, return a retryable error.
4. Extract action, protocol version, identifier, nullifier/session data.
5. Check replay constraints in Supabase.
6. Store `world_verifications`.
7. Mark user as `verified`.

## Payout Strategy

Sentia pays workers with real WLD from a small treasury wallet.

The payout system is backend-controlled:

- user completes task
- backend creates pending earning
- payout worker batches or processes pending earnings
- treasury wallet signs WLD transfer to worker wallet
- backend records transaction status
- earning becomes paid only after confirmation

Recommended MVP constraints:

- small fixed reward amounts
- one payout attempt per earning at a time
- manual admin retry for failed payouts
- low-balance alert in `treasury_events`
- no smart contract escrow for the hackathon

Do not use MiniKit `Pay` to pay workers from Sentia. `Pay` requests payment from the user. Worker payouts require the Sentia treasury to send funds.

## Developer Portal Requirements

Before production testing:

- complete World ID 4.0 Managed setup
- add `RP_SIGNING_KEY` to server environment
- configure Mini App metadata and test URL
- allowlist contracts/tokens if any MiniKit transaction commands are used
- create or store any Developer Portal API key needed for transaction verification

## Security Checklist

- `RP_SIGNING_KEY` is server-only.
- Treasury private key is server-only and never committed.
- Supabase service role key is server-only.
- Payout route is protected by job/admin auth.
- Proof verification result is checked on backend before marking user verified.
- Client cannot create earnings or payout attempts directly.
- Duplicate task responses are blocked by database constraint.
