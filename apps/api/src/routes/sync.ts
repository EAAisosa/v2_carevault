import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requireAnyAdmin } from "../middleware/requireRole";
import * as syncController from "../controllers/sync.controller";
import { config } from "../config";
import { AppError } from "../middleware/errorHandler";
import { StatusCodes } from "http-status-codes";
import { internalLimiter } from "../middleware/rateLimiter";

const router: Router = Router();

router.use("/logs", authenticate, requireAnyAdmin, syncController.getSyncLogs);
router.post("/pull", authenticate, requireAnyAdmin, syncController.pullSync);
router.post("/simulate", authenticate, requireAnyAdmin, syncController.simulateSync);

// Internal cron endpoint — authenticated by shared secret, not by JWT
router.post(
  "/internal/auto-sync",
  internalLimiter,
  (req, _res, next) => {
    const secret = req.headers["x-cron-secret"];
    if (!secret || secret !== config.cronSecret) {
      throw new AppError("Forbidden", StatusCodes.FORBIDDEN);
    }
    next();
  },
  syncController.runAutoSync,
);

export default router;
