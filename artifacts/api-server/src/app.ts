import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware.js";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(
  express.json({
    // Razorpay signs the exact bytes it sends, so keep them for the webhook route only.
    verify: (req, _res, buf) => {
      if ((req as Request).originalUrl?.startsWith("/api/billing/webhook")) {
        (req as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
      }
    },
  }),
);
app.use(express.urlencoded({ extended: true }));

app.use(clerkMiddleware());

app.use("/api", router);

// One service for everything: when the built website exists (artifacts/situation-x/dist/public), serve it
// from the same server, so the site and the API share one address (no CORS, Clerk cookies just work).
// FRONTEND_DIR overrides the location; without a build nothing is served (the API alone, e.g. in development).
const frontendDir = process.env.FRONTEND_DIR
  ? path.resolve(process.env.FRONTEND_DIR)
  : path.resolve(import.meta.dirname, "../../situation-x/dist/public");
const frontendIndex = path.join(frontendDir, "index.html");
if (fs.existsSync(frontendIndex)) {
  // Built files have hashed names, so browsers may keep them; index.html must always be fetched fresh.
  app.use(express.static(frontendDir, { index: false, maxAge: "1y", immutable: true, setHeaders: (res, file) => {
    if (file === frontendIndex) res.setHeader("Cache-Control", "no-cache");
  } }));
  // Page addresses such as /oracle or /pricing belong to the React app. Unknown /api paths stay JSON 404s.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if ((req.method !== "GET" && req.method !== "HEAD") || req.path.startsWith("/api")) {
      next();
      return;
    }
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(frontendIndex);
  });
  logger.info({ frontendDir }, "Serving the website from this server");
}

// JSON errors for malformed bodies and unhandled route errors (Express's
// default handler returns an HTML page, and a stack trace outside production).
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const status = (err as { status?: number; statusCode?: number } | null)?.status
    ?? (err as { statusCode?: number } | null)?.statusCode;
  const clientError = typeof status === "number" && status >= 400 && status < 500;
  if (!clientError) req.log.error({ err }, "Unhandled error");
  if (res.headersSent) return;
  res.status(clientError ? status : 500).json(
    clientError
      ? { error: "bad_request", message: "Invalid request" }
      : { error: "internal_error", message: "Internal server error" },
  );
});

export default app;
