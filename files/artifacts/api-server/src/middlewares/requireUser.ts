import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";

/**
 * Rejects unauthenticated requests with a JSON 401 (Clerk's `requireAuth()`
 * redirects to a sign-in page, which is wrong for an API) and exposes the
 * Clerk user id to handlers via `currentUserId(res)`.
 *
 * Requires `clerkMiddleware()` earlier in the chain (see app.ts).
 */
export function requireUser(req: Request, res: Response, next: NextFunction): void {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized", message: "Sign in required" });
    return;
  }
  res.locals.userId = userId;
  next();
}

export function currentUserId(res: Response): string {
  return res.locals.userId as string;
}
