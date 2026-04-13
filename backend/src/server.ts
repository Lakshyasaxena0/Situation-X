import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { env } from "./config/env";
import { testConnection } from "./config/db";
import { logger } from "./utils/logger";
import analyzeRoutes from "./routes/analyze.route";
import profileRoutes from "./routes/profile.route";
import historyRoutes from "./routes/history.route";
import authRoutes from "./routes/auth.route";

dotenv.config();

const app = express();

// -----------------------------
// CORS CONFIG (env.ALLOWED_ORIGINS is already string[])
// -----------------------------
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || env.ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// -----------------------------
// BODY PARSER
// -----------------------------
app.use(express.json({ limit: "10kb" }));

// -----------------------------
// RATE LIMITING
// -----------------------------
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// -----------------------------
// ROUTES
// -----------------------------
app.use("/api/analyze", analyzeRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/auth", authRoutes);

// -----------------------------
// HEALTH CHECK
// -----------------------------
app.get("/api/healthz", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// -----------------------------
// GLOBAL ERROR HANDLER
// -----------------------------
app.use(
  (err: any, _req: Request, res: Response, _next: NextFunction) => {
    logger.error("Unhandled error", { error: err.message });
    res.status(500).json({
      error: "Internal server error",
    });
  }
);

// -----------------------------
// START SERVER
// -----------------------------
async function startServer() {
  try {
    await testConnection();
    app.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT}`);
    });
  } catch (error: any) {
    logger.error("Server startup failed", { error: error.message });
    process.exit(1);
  }
}

startServer();
