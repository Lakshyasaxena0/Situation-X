// backend/src/routes/history.route.ts
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validateFeedbackInput } from "../middleware/validation";
import {
  submitFeedbackHandler,
  getFeedbackHandler,
} from "../controllers/history.controller";
const router = Router();
// -----------------------------
// SUBMIT FEEDBACK
// -----------------------------
// POST /api/history/feedback
router.post(
  "/feedback",
  authenticate,
  validateFeedbackInput,
  submitFeedbackHandler
);
// -----------------------------
// GET USER FEEDBACK
// -----------------------------
// GET /api/history/feedback
router.get("/feedback", authenticate, getFeedbackHandler);
// -----------------------------
// EXPORT
// -----------------------------
export default router;
