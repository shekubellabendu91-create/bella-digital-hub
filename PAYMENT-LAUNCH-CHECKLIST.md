# Bella Digital Hub payment launch checklist

Use this checklist to finish deployment safely. The payment system is not live until all required steps pass.

## Account access needed from the owner
- [ ] Sign in to Cloudflare.
- [ ] Confirm access to NOWPayments.
- [ ] Generate a fresh IPN secret in NOWPayments if the previous secret may have been exposed.
- [ ] Store the API key and fresh IPN secret only in Cloudflare Worker Secrets.

## Deploy backend
- [ ] Import GitHub repository: https://github.com/shekubellabendu91-create/bella-digital-hub
- [ ] Worker root directory: `worker`
- [ ] Create a Cloudflare KV namespace if required.
- [ ] Bind the KV namespace as `ORDERS`; put its ID in `worker/wrangler.toml` if Cloudflare requests one.
- [ ] Add Worker secrets `NOWPAYMENTS_API_KEY` and `IPN_SECRET`.
- [ ] Deploy and verify `/health` returns `{"ok":true,...}`.
- [ ] Set NOWPayments IPN callback to `https://YOUR-WORKER-URL/webhook/nowpayments`.

## Before enabling customer checkout
- [ ] Confirm final offer names, prices, and minimum payment amounts.
- [ ] Connect the website frontend to the deployed Worker URL.
- [ ] Add customer contact/order details collection without requesting sensitive information.
- [ ] Decide how customers receive digital files or how custom services are fulfilled.
- [ ] Test webhook signature verification and order status updates.
- [ ] Test mobile checkout and failed/cancelled payments.
- [ ] Publish clear terms, privacy, refund, delivery, and support information.
- [ ] Only then announce payments as live.

## Never do these
- Never put private keys or webhook secrets in website HTML or GitHub.
- Never ask a customer to send a wallet recovery phrase or password.
- Never mark an order paid from a browser redirect; use verified provider notifications.
- Never claim automatic delivery until it has been implemented and tested.
