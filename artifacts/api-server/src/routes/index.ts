import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import analysisRouter from "./analysis.js";
import feedbackRouter from "./feedback.js";
import followUpRouter from "./followup.js";
import billingRouter, { billingPublicRouter } from "./billing.js";
import { requireUser } from "../middlewares/requireUser.js";

const router: IRouter = Router();

router.use(healthRouter); // public (health checks)
router.use(billingPublicRouter); // public: price list + Razorpay webhook (signature-authenticated)

// Everything below belongs to a signed-in user.
router.use(requireUser);
router.use(billingRouter);
// A new analysis is the paid feature: it costs credits (charged inside the route, only while
// unless BILLING_PAYWALL=off). History, feedback and follow-ups stay free so users can always see and
// answer their past readings.
router.use(analysisRouter);
router.use(feedbackRouter);
router.use(followUpRouter);

export default router;
