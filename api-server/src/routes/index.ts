import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import analysisRouter from "./analysis.js";
import feedbackRouter from "./feedback.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(analysisRouter);
router.use(feedbackRouter);

export default router;
