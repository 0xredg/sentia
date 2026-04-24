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

1. Earnings tab reads from `earnings_ledger` and `payout_attempts`.
2. User sees:
   - available or pending earnings
   - paid earnings
   - failed or retrying payouts
   - total earned
3. Backend payout worker selects payable pending earnings.
4. Backend sends WLD from the Sentia treasury wallet to the user's wallet.
5. Backend records transaction hash and status in `payout_attempts`.
6. Backend marks ledger entries as paid only after transaction confirmation.

Payout states:

- `pending`: earning recorded, payout not started
- `processing`: payout transaction submitted or being prepared
- `paid`: payout confirmed
- `failed`: payout failed and can be retried
- `blocked`: payout cannot proceed because wallet, region, balance, or compliance checks fail

## Demo Path

Use one short task that clearly needs human judgment.

Recommended demo sequence:

1. Open Profile and show verified human state.
2. Open Feed and answer one task.
3. Show immediate earned state after backend accepts the response.
4. Open Earnings and show pending/paid WLD payout.
5. If a real transaction is available, show the transaction hash/status.
