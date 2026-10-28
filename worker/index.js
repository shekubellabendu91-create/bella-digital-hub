const CATALOG = {
  "content-pack": { name: "Social Media Content Pack", amount: 10, kind: "custom" },
  "promo-design": { name: "Promotional Design", amount: 10, kind: "custom" },
  "short-video": { name: "Short-Video Support", amount: 10, kind: "custom" },
  "website-basic": { name: "Simple Website Project Deposit", amount: 25, kind: "custom" },
  "digital-template": { name: "Digital Template Pack", amount: 10, kind: "digital" }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}
function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((out, key) => {
      out[key] = sortDeep(value[key]);
      return out;
    }, {});
  }
  return value;
}
function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function verifyIpn(payload, signature, secret) {
  if (!signature || !secret) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]
  );
  const bytes = new TextEncoder().encode(JSON.stringify(sortDeep(payload)));
  const digest = await crypto.subtle.sign("HMAC", key, bytes);
  const expected = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
  return constantTimeEqual(expected.toLowerCase(), signature.toLowerCase());
}
async function createInvoice(request, env) {
  if (!env.NOWPAYMENTS_API_KEY || !env.IPN_SECRET || !env.ORDERS) {
    return json({ error: "Payment backend is not configured yet." }, 503);
  }
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON." }, 400); }
  const product = CATALOG[body.product];
  if (!product) return json({ error: "Choose a valid product or service." }, 400);
  const orderId = "BDH-" + crypto.randomUUID();
  const origin = new URL(request.url).origin;
  const payload = {
    price_amount: product.amount,
    price_currency: "usd",
    order_id: orderId,
    order_description: product.name,
    ipn_callback_url: origin + "/webhook/nowpayments",
    success_url: "https://shekubellabendu91-create.github.io/bella-digital-hub/?payment=return",
    cancel_url: "https://shekubellabendu91-create.github.io/bella-digital-hub/?payment=cancelled"
  };
  const response = await fetch("https://api.nowpayments.io/v1/invoice", {
    method: "POST",
    headers: { "x-api-key": env.NOWPAYMENTS_API_KEY, "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.invoice_url) {
    return json({ error: "NOWPayments could not create the invoice. Check account settings and minimum amounts." }, 502);
  }
  const record = {
    orderId, product: body.product, productName: product.name, amountUsd: product.amount,
    kind: product.kind, status: "waiting", invoiceId: data.id || null, createdAt: new Date().toISOString()
  };
  await env.ORDERS.put("order:" + orderId, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 90 });
  return json({ orderId, invoiceUrl: data.invoice_url, amountUsd: product.amount });
}
async function receiveWebhook(request, env) {
  if (!env.IPN_SECRET || !env.ORDERS) return json({ error: "Webhook is not configured." }, 503);
  let payload;
  try { payload = await request.json(); } catch { return json({ error: "Invalid JSON." }, 400); }
  const signature = request.headers.get("x-nowpayments-sig") || "";
  if (!(await verifyIpn(payload, signature, env.IPN_SECRET))) {
    return json({ error: "Invalid webhook signature." }, 401);
  }
  const orderId = payload.order_id;
  if (typeof orderId !== "string" || !orderId.startsWith("BDH-")) return json({ ok: true });
  const stored = await env.ORDERS.get("order:" + orderId);
  if (!stored) return json({ ok: true });
  const order = JSON.parse(stored);
  const status = String(payload.payment_status || "").toLowerCase();
  order.status = status;
  order.updatedAt = new Date().toISOString();
  order.paymentId = payload.payment_id || null;
  // Mark payment as paid only after NOWPayments reports "finished".
  order.paid = status === "finished";
  await env.ORDERS.put("order:" + orderId, JSON.stringify(order), { expirationTtl: 60 * 60 * 24 * 90 });
  return json({ ok: true });
}
async function getOrder(request, env) {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^BDH-[0-9a-f-]{36}$/i.test(id)) return json({ error: "Invalid order ID." }, 400);
  const stored = await env.ORDERS?.get("order:" + id);
  if (!stored) return json({ error: "Order not found." }, 404);
  const order = JSON.parse(stored);
  return json({
    orderId: order.orderId, productName: order.productName, amountUsd: order.amountUsd,
    status: order.status, paid: order.paid === true,
    delivery: order.paid ? "Payment confirmed. Check your order email or contact Bella Digital Hub to arrange delivery." : "Delivery is not available until payment is confirmed."
  });
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: {
      "access-control-allow-origin": "https://shekubellabendu91-create.github.io",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "86400"
    }});
    if (url.pathname === "/api/create-invoice" && request.method === "POST") return createInvoice(request, env);
    if (url.pathname === "/webhook/nowpayments" && request.method === "POST") return receiveWebhook(request, env);
    if (url.pathname === "/api/order-status" && request.method === "GET") return getOrder(request, env);
    if (url.pathname === "/health" && request.method === "GET") return json({ ok: true, service: "Bella Digital Hub payment backend" });
    return json({ error: "Not found." }, 404);
  }
};
