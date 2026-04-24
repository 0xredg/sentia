# MVP Build Plan

This plan optimizes for a clear hackathon demo: verified human completes one task and receives a real WLD reward.

## Phase 1: App Scaffold

- Create a Next.js Mini App from the World template.
- Add bottom tabs: Feed, Earnings, Profile.
- Add `MiniKitProvider`.
- Configure environment variables with public/server-only separation.
- Add mobile-first layout using `100dvh` and bottom navigation.

Acceptance:

- App opens locally.
- Tabs switch without reload.
- App detects whether MiniKit is installed.

## Phase 2: Supabase Foundation

- Create Supabase project.
- Add tables from [Data Model](./data-model.md).
- Add seed tasks for demo.
- Add server-side Supabase client with service role.
- Add client read path for safe user-facing data.

Acceptance:

- Backend can create/fetch a user.
- Feed can read one open task.
- Earnings can read an empty ledger.

## Phase 3: Wallet Session

- Implement `POST /api/auth/nonce`.
- Implement `POST /api/auth/complete-siwe`.
- Add Wallet Auth action in app startup or Profile.
- Store wallet address and username metadata when available.

Acceptance:

- User can authenticate with World wallet.
- Backend verifies SIWE payload.
- UI does not display raw wallet address as primary identity.

## Phase 4: World ID Profile Verification

- Add `POST /api/world/rp-signature`.
- Add `POST /api/world/verify-proof`.
- Implement Profile verification flow with IDKit.
- Store verification record and update user status.

Acceptance:

- Unverified user sees Feed locked.
- Verified user unlocks Feed.
- `RP_SIGNING_KEY` stays server-only.
- Backend verifies proof through World Developer Portal.

## Phase 5: Feed Task Completion

- Implement `GET /api/tasks/next`.
- Implement `POST /api/tasks/:taskId/responses`.
- Validate verified user, task status, expiry, duplicate response, and response schema.
- Create pending earning when response is accepted.
- Advance Feed after successful response.

Acceptance:

- Verified user can complete a seeded task.
- Duplicate response is rejected.
- Unverified user cannot earn.
- Earnings tab shows pending WLD after completion.

## Phase 6: Treasury Payouts

- Add treasury wallet configuration.
- Implement protected payout worker endpoint.
- Select pending earnings and mark them `processing`.
- Send WLD to user wallet.
- Store payout attempt with transaction hash/status.
- Confirm transaction and mark earning `paid`.

Acceptance:

- A completed task can trigger a real WLD payout.
- Failed payout remains visible and retryable.
- Earnings tab shows pending, paid, and failed states correctly.

## Phase 7: Demo Polish

- Add one strong demo task where human judgment is obvious.
- Add loading, empty, error, and success states.
- Add compact transaction status in Earnings.
- Add seed/reset script for demo environment.
- Record the shortest complete loop.

Acceptance:

- Demo can be completed in under 90 seconds.
- Product is understandable without narration.
- The World-native moments are visible: verification and payout.

## Final Hackathon Checks

- README includes setup and World/Supabase env vars.
- License file exists.
- Repo is public before submission.
- No secrets are committed.
- Demo video is under 3 minutes.
- No commits are pushed after the official deadline.
