# Bella Digital Hub — NOWPayments integration

This folder contains a Cloudflare Worker backend starter for Bella Digital Hub. **It is not live until deployed, configured with private secrets, connected to the website, and tested.**

## What is implemented
- Creates a NOWPayments invoice from a server-side allowlist of product IDs and prices.
- Sends a payment notification callback URL to the Worker.
- Verifies NOWPayments IPN signatures using the configured IPN secret.
- Stores order/payment status in Cloudflare KV for up to 90 days.
- Exposes a health check and order-status endpoint.
- Adds CORS headers for the GitHub Pages origin.

## Important before launch
- The public website does not yet call this API; no customer checkout is currently active on the website.
- No digital file is automatically delivered and custom services still require manual fulfilment.
- The starter prices are $10 for content-pack, promo-design, short-video, and digital-template; $25 for website-basic. Confirm that these prices and descriptions match the offers before accepting payments.
- NOWPayments previously rejected a $5 invoice as below its minimum. Do not promise $5 crypto checkout until the provider confirms the minimum for the chosen currency/network.
- Use a real paid transaction only when ready. Do not pay yourself simply to test.
- The order status endpoint is not an identity system. Treat order IDs as private links and do not expose them publicly.

## Deploy via Cloudflare dashboard
1. Sign in to Cloudflare and open **Workers & Pages**.
2. Create a Worker using Git integration and select repository `shekubellabendu91-create/bella-digital-hub`.
3. Set the root/build directory to `worker` so the deployment uses this folder's `index.js` and `wrangler.toml`.
4. If Cloudflare asks for a KV namespace ID, create a KV namespace and add its ID to `wrangler.toml` under the `ORDERS` binding. Keep the namespace binding name exactly `ORDERS`.
5. Deploy the Worker. Record the public Worker URL, for example `https://<worker-name>.<account-subdomain>.workers.dev`.
6. Under Worker **Settings → Variables and Secrets**, add these as **Secret** values (not plain text variables):
   - `NOWPAYMENTS_API_KEY` — your private NOWPayments API key
   - `IPN_SECRET` — a newly generated IPN secret from NOWPayments
7. Redeploy if prompted and check `https://<worker-url>/health`. It should return JSON with `"ok":true`.
8. In NOWPayments → Payments Settings → Instant payment notifications, set the webhook URL to `https://<worker-url>/webhook/nowpayments`.
9. Confirm the website's frontend API base URL is configured to the exact Worker URL before enabling checkout buttons. Do not place API keys or the IPN secret in `index.html` or any public repository file.
10. Test invoice creation, payment status updates, error handling, and delivery steps before announcing that checkout is live.

## API
- `POST /api/create-invoice` with JSON such as `{"product":"promo-design"}`.
- Allowed product IDs: `content-pack`, `promo-design`, `short-video`, `website-basic`, `digital-template`.
- `GET /api/order-status?id=BDH-...`
- `POST /webhook/nowpayments` — NOWPayments IPN callback.
- `GET /health`

## Safety and fulfilment
- Never commit `NOWPAYMENTS_API_KEY` or `IPN_SECRET` to GitHub or share them in chat.
- Regenerate the IPN secret if it was exposed in a message or other untrusted location.
- The Worker marks an order paid only when a valid signature is received and NOWPayments reports `payment_status: finished`.
- This backend currently records payment status only. It does not email files, host protected downloads, or automatically complete custom service work. A paid order must not be advertised as instant delivery until a secure delivery workflow is implemented and tested.
