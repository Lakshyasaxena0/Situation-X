import type { NextFunction, Request, Response } from "express";
import { currentUserId } from "./requireUser.js";
import { hasAccess } from "../services/subscription.service.js";

/**
 * Lets the request through only for users with an active subscription (HTTP 402 otherwise).
 * Does nothing unless BILLING_PAYWALL=on, so the paywall can be switched on when the
 * payment flow has been tested. Must run after `requireUser`.
 */
export async function requireSubscription(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (await hasAccess(currentUserId(res))) {
      next();
      return;
    }
    res.status(402).json({
      error: "subscription_required",
      message: "An active subscription is required. Choose a plan to continue.",
    });
  } catch (err) {
    next(err);
  }
}
