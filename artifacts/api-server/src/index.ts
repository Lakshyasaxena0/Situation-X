import app from "./app";
import { logger } from "./lib/logger";
import { paywallEnabled } from "./services/billing.service";
import { razorpayConfigured } from "./lib/razorpay";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Billing readiness, so a missing key is noticed at deploy time and not by a customer.
  if (paywallEnabled() && !razorpayConfigured()) {
    logger.warn("Credits are charged but RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set: users cannot buy credits yet");
  }
  if (razorpayConfigured() && !process.env["RAZORPAY_WEBHOOK_SECRET"]?.trim()) {
    logger.warn("RAZORPAY_WEBHOOK_SECRET is not set: payments are confirmed only from the browser, not by Razorpay's webhook");
  }
});
