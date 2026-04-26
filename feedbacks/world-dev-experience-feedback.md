# World Mini App developer experience feedback

## Testing with a local tunnel

The [Testing your mini app](https://docs.world.org/mini-apps/quick-start/testing#testing-your-mini-app) docs should explicitly say that, when testing locally, the tunnel URL must be added to the Mini App config in the World Developer Portal.

Suggested wording:

> If your app runs locally, expose it with a tunnel such as ngrok, zrok, or tunnelmole, then paste the public tunnel URL into your Mini App config in the World Developer Portal before opening the test link or QR code.

This would make the local testing flow clearer:

1. Run the app locally.
2. Create a public tunnel.
3. Add the tunnel URL in the Developer Portal.
4. Open the generated test link or QR code in World App.

## Typed messages

Typed message signing did not work in my setup.

- The typed message modal opened.
- Signing failed immediately with `Sign typed data failed: disallowed_operation`.
- Personal message signing worked.
- Normal transactions worked.
