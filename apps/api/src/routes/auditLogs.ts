import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requireAnyAdmin } from "../middleware/requireRole";
import * as auditLogsController from "../controllers/auditLogs.controller";

const router: Router = Router();

router.use(authenticate, requireAnyAdmin);

router.get("/", auditLogsController.listAuditLogs);

export default router;
