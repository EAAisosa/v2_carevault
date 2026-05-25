import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requireAnyAdmin } from "../middleware/requireRole";
import * as dashboardController from "../controllers/dashboard.controller";

const router: Router = Router();

router.get("/stats", authenticate, requireAnyAdmin, dashboardController.getDashboardStats);

export default router;
