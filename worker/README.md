# Bella Digital Hub — NOWPayments backend starter

This is a server-side starter for creating NOWPayments invoices, validating IPN signatures, and recording order statuses. It is **not live until deployed and configured**.

## Security
- Never commit NOWPAYMENTS_API_KEY or IPN_SECRET into this repository.
- Add both as Cloudflare Worker secrets.
- Regenerate the IPN secret if it was exposed anywhere public or in a chat.
- The Worker only marks an order paid when NOWPayments reports `payment_status: finished` and the HMAC-SHA512 signature verifies.
- Prices are allowlisted server-side; the browser cannot set arbitrary amounts.

## Deploy requirements
1. Create a Cloudflare account and a Workers KV namespace.
2. Replace the placeholder KV namespace ID in `wrangler.toml`.
3. Deploy this Worker from the `worker` directory using Wrangler or Cloudflare's Git integration.
4. Add Worker secrets named `NOWPAYMENTS_API_KEY` and `IPN_SECRET`.
5. In NOWPayments > Payments Settings > Instant payment notifications, set Webhook URL to:
   `https://<your-worker-subdomain>.workers.dev/webhook/nowpayments`
6. Test `/health`, create a test invoice, and check NOWPayments IPN delivery logs.

## API
- `POST /api/create-invoice` with JSON `{"product":"content-pack"}` (or `promo-design`, `short-video`, `website-basic`, `digital-template`).
- `GET /api/order-status?id=BDH-...`
- `POST /webhook/nowpayments` (NOWPayments IPN callback).

## Important limitations
- This backend does not yet deliver downloadable files or automatically fulfil custom creative services. It records verified payment status and provides an order status response; actual fulfilment needs the final digital files/service workflow to be configured.
- The current GitHub Pages site does not yet call the invoice endpoint. A frontend checkout button and a tested deployment are still required before customers can use this integration.
- The listed prices are starter examples and must be reviewed against your actual prices and NOWPayments minimums before going live.
