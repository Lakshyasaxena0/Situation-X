import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Minimal Razorpay client (Orders API) using plain `fetch`, so no extra package is needed.
 *
 *   RAZORPAY_KEY_ID           public key id (also sent to the browser for Checkout)
 *   RAZORPAY_KEY_SECRET       secret; used for the API and to verify the payment signature
 *   RAZORPAY_WEBHOOK_SECRET   secret set on the webhook in the Razorpay dashboard
 *   RAZORPAY_BASE_URL         optional; default https://api.razorpay.com/v1
 *
 * Errors never contain the key, the secret or the response body.
 */

const DEFAULT_BASE_URL = "https://api.razorpay.com/v1";
const TIMEOUT_MS = 15_000;

export function razorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim());
}

export function razorpayKeyId(): string {
  return process.env.RAZORPAY_KEY_ID?.trim() ?? "";
}

export type RazorpayOrder = { id: string; amount: number; currency: string };

export async function createOrder(input: {
  amountPaise: number;
  receipt: string;
  notes: Record<string, string>;
}): Promise<RazorpayOrder> {
  const baseUrl = (process.env.RAZORPAY_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const res = await fetch(`${baseUrl}/orders`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Basic ${auth}` },
    body: JSON.stringify({ amount: input.amountPaise, currency: "INR", receipt: input.receipt, notes: input.notes }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Razorpay order creation failed with HTTP ${res.status}`);
  const data = (await res.json()) as Partial<RazorpayOrder>;
  if (typeof data.id !== "string" || data.amount !== input.amountPaise) {
    throw new Error("Razorpay returned an unexpected order");
  }
  return { id: data.id, amount: data.amount, currency: data.currency ?? "INR" };
}

function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Checkout success signature: HMAC-SHA256(order_id + "|" + payment_id) with the key secret. */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC-SHA256(raw request body) with the webhook secret. */
export function verifyWebhookSignature(rawBody: Buffer | string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}
