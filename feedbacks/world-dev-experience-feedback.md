# World Mini App developer experience feedback

Context: Sentia was built during the World Build Labs hackathon. This note captures early feedback from testing the World Mini App development flow with another builder.

## Feedback source

Conversation with another developer after they got their Mini App running in World App:

> "But bro, it's fucking smooth"

The overall sentiment is positive once the app is working. The friction showed up specifically around understanding how local development, tunneling, the Developer Portal URL, and the World App test link / QR code fit together.

## What was confusing

The key confusion was around this flow:

1. Run the Mini App locally, usually on `localhost:3000`.
2. Expose the local app publicly with a tunnel such as ngrok, zrok, or tunnelmole.
3. Paste that public tunnel URL into the World Developer Portal.
4. Use the generated test link / QR code to open the app inside World App.

This was not immediately obvious to at least one developer. Their reaction was essentially:

> "Tunnel url? Just pasted everything and submitted; had Claude walk me through it and then I could scan."

The main ambiguity: builders may not realize that the Developer Portal needs a publicly reachable URL, and that `localhost` cannot be opened by World App on their phone unless it is exposed through a tunnel or deployed somewhere like Vercel.

## Why this matters

For Mini Apps, the working test environment is not just the browser. MiniKit only works inside World App, so mobile testing requires opening the app in World App. That means local development has an extra mental model compared with a standard Next.js app:

- local server: `localhost:3000`
- public tunnel URL: `https://...ngrok...`
- Developer Portal app URL
- generated test link / QR code
- World App runtime

The docs mention this, but the relationship between those pieces could be made more explicit and hard to miss.

## Docs context

Relevant World docs found during the hackathon:

- [Testing your mini app](https://docs.world.org/mini-apps/quick-start/testing) says to enter the App ID and scan the generated QR code, and includes a tip that ngrok, zrok, or tunnelmole can be used for local testing.
- [FAQ: How do I test my mini app on mobile?](https://docs.world.org/mini-apps/more/faq#how-do-i-test-my-mini-app-on-mobile) says MiniKit only works inside World App and that developers should expose the app publicly with ngrok or another tunneling service, then configure the generated URL in the Developer Portal.

The information exists, but during fast hackathon development it is easy to miss or misunderstand.

## Suggested improvements

### 1. Add a very explicit local testing diagram

Something like:

```text
Your laptop
localhost:3000
   ↓
Tunnel provider
https://abc.ngrok-free.app
   ↓
World Developer Portal
Mini App URL = https://abc.ngrok-free.app
   ↓
Test link / QR code
   ↓
World App on phone
```

### 2. Add a checklist before showing the test QR code

For example:

- [ ] My app is running locally.
- [ ] I created a public tunnel to my local port.
- [ ] I pasted the tunnel URL into the Developer Portal.
- [ ] I regenerated or reopened the test link / QR code after changing the URL.
- [ ] I am opening the app inside World App, not a normal mobile browser.

### 3. Make the Developer Portal field copy more instructive

If the field currently just asks for an app URL, consider helper text like:

> For local development, do not use `localhost`. Use a public tunnel URL such as ngrok, zrok, or tunnelmole. Example: run `ngrok http http://localhost:3000`, then paste the generated `https://...` URL here.

### 4. Add a "local vs deployed" path split

Many builders will ask: "Do I need Vercel, or can I test locally?"

A simple split would help:

- **If deployed:** paste your Vercel / production URL in the Developer Portal.
- **If local:** create a tunnel, paste the tunnel URL in the Developer Portal, then scan the test QR code.

### 5. Add a common failure note

A very practical warning:

> If the QR code opens but the app does not load, check that the URL configured in the Developer Portal is publicly reachable from your phone. `localhost` only points to the phone itself, not your laptop.

## Product takeaway

The Mini App experience feels smooth once configured, but the first successful mobile test has a hidden dependency: the Developer Portal must point to a public URL. Making that dependency unavoidable in the docs and portal UI would likely reduce setup time for hackathon builders.
