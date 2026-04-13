// backend/src/routes/profile.route.ts

import { Router } from "express";

import { authenticate } from "../middleware/auth";
import {
  getProfileHandler,
  updateProfileHandler,
} from "../controllers/profile.controller";

const router = Router();

// -----------------------------
// GET PROFILE
// -----------------------------
// GET /api/profile
router.get("/", authenticate, getProfileHandler);

// -----------------------------
// UPDATE PROFILE
// -----------------------------
// PUT /api/profile
router.put("/", authenticate, updateProfileHandler);

// -----------------------------
// EXPORT
// -----------------------------

export default router;
