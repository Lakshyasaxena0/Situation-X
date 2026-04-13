// backend/src/routes/analyze.route.ts
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { ethicalFilter } from "../middleware/ethicalFilter";
import { validateAnalyzeInput } from "../middleware/validation";
import {
  analyzeHandler,
  getHistoryHandler,
  getSingleHandler,
  deleteHandler,
} from "../controllers/analyze.controller";
const router = Router();
// -----------------------------
// ANALYZE ROUTE
// -----------------------------
// POST /api/analyze
router.post(
  "/",
  ethicalFilter,
  validateAnalyzeInput,
  authenticate,
  analyzeHandler
);
// -----------------------------
// HISTORY ROUTES
// -----------------------------
// GET /api/analyze/history
router.get("/history", authenticate, getHistoryHandler);
// GET /api/analyze/history/:id
router.get("/history/:id", authenticate, getSingleHandler);
// DELETE /api/analyze/history/:id
router.delete("/history/:id", authenticate, deleteHandler);
// -----------------------------
// EXPORT
// -----------------------------
export default router;
