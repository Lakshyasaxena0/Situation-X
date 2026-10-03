import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import analysisRouter from "./analysis.js";
import feedbackRouter from "./feedback.js";
import followUpRouter from "./followup.js";
import { requireUser } from "../middlewares/requireUser.js";

const router: IRouter = Router();

router.use(healthRouter); // public (health checks)

// Everything below belongs to a signed-in user.
router.use(requireUser);
router.use(analysisRouter);
router.use(feedbackRouter);
router.use(followUpRouter);

export default router;
