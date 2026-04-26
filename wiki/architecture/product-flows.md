# Product Flows

Sentia should feel like a fast mobile work app, not a crypto dashboard. The main screen uses bottom tab navigation with Feed, Earnings, and Profile.

## First Open

1. User opens Sentia inside World App.
2. App initializes MiniKit and loads local app state.
3. Backend creates or fetches a user record after wallet auth or a lightweight session bootstrap.
4. If the user is not verified, Feed shows a locked state with a primary action to verify in Profile.
5. Profile shows World ID verification as the main task.

Success state:

- User has a Supabase `users` row.
- User has a wallet address or World username when available.
- User sees whether they are verified.

## Profile Verification

1. User taps Verify in Profile.
2. Client asks backend for an RP signature for the profile verification action.
3. Backend signs the request with `RP_SIGNING_KEY`.
4. Client opens IDKit verification using `WORLD_APP_ID`, `WORLD_RP_ID`, action, and `rp_context`.
5. IDKit returns a proof payload.
6. Client sends the payload to backend.
7. Backend forwards the payload to World Developer Portal verify endpoint.
8. Backend stores verification data and marks the user as verified.
9. Profile updates to verified state.

Failure states:

- Missing `RP_SIGNING_KEY`: show setup error in development; block production verification.
- User cancels World ID flow: keep user unverified and allow retry.
- Backend verification fails: show retryable failure.
- Duplicate proof/nullifier for the same action: keep existing verified user if it maps to the same account, otherwise reject.

## Feed Task Completion

1. Verified user opens Feed.
2. Backend returns one active open task from `tasks`.
3. User reviews the task card image, requester, prompt, and answer options.
4. User submits an answer.
5. Backend validates:
   - user is verified
   - task is open
   - task is not expired
   - user has not already answered the task
   - answer matches the task schema
6. Backend writes `task_responses`.
7. Backend creates a pending `earnings_ledger` entry.
8. Client advances to the next task and shows earned feedback only after backend success.

Card rendering details:

- The "From" area uses `tasks.requester_name`.
- The image uses `tasks.input_payload.image_path`, which points to a static file served by the app.
- The question uses `tasks.prompt`.
- The answer buttons use `tasks.response_schema.type` and `tasks.response_schema.options`.
- Detailed card UI styling is handled separately from the DB seed.

Failure states:

- Unverified user: return `verification_required`.
- Duplicate answer: return `already_completed`.
- Closed task: return `task_unavailable`.
- Invalid answer: return `invalid_response`.

## Earnings And Payouts

1. Earnings tab reads from `earnings_ledger` and `payout_attempts` for the current payout mode.
2. User sees:
   - available or pending earnings
   - processing payouts
   - paid earnings
   - total earned
3. In mock mode, Claim atomically marks mock earnings as paid and records `mock_tx_id`.
4. In real mode, Claim asks the backend for an EIP-191 claim intent.
5. World App opens a `MiniKit.signMessage` prompt.
6. Backend verifies the signature, moves earnings to `processing`, and calls `SentiaRewardVault.payoutBatch`.
7. Backend records the transaction hash and confirms `payout_attempts`.
8. Backend marks ledger entries as paid only after the World Chain transaction confirms.

Payout states:

- `pending`: earning recorded, payout not started
- `processing`: payout transaction submitted or being prepared
- `paid`: payout confirmed
- `failed`: payout failed and can be retried
- `blocked`: payout cannot proceed because wallet, region, balance, or compliance checks fail

If the chain transaction succeeds but the database finalization is interrupted, `/api/earnings/reconcile` can verify `vault.paid(earningIdHash)` and complete the DB state.

## Mock vs Real Mode

`pnpm run dev:mock` uses mock WLD. It is safe for repeated local testing and mock admin resets.

`pnpm run dev` uses real-mode rows. Real claims require:

- a signed claim intent;
- a funded World Chain vault;
- a server-side payout key that owns the vault.

Mock admin actions never mutate real paid earnings.

## Repeatable Real Demo Runs

Real paid rows are not deleted or reset. To replay the same seeded task cards in a production demo, start a new real demo run.

The new run updates `users.current_demo_run_id`. Feed then treats the seeded tasks as available again for that user, while old responses, earnings, and on-chain payouts remain preserved.

## Demo Path

Use one short task that clearly needs human judgment.

Recommended demo sequence:

1. Open Profile and show verified human state.
2. Open Feed and answer one task.
3. Show immediate earned state after backend accepts the response.
4. Open Earnings and show claimable WLD.
5. Claim, sign in World App, and show WLD paid from the World Chain vault.
6. Show the Worldscan transaction hash/status.
