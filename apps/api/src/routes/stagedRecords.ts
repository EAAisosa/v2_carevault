import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requireAnyAdmin } from "../middleware/requireRole";
import * as stagedController from "../controllers/stagedRecords.controller";

const router: Router = Router();

router.use(authenticate, requireAnyAdmin);

router.get("/", stagedController.listStagedRecords);
router.post("/:id/approve", stagedController.approveRecord);
router.post("/:id/reject", stagedController.rejectRecord);
router.post("/:id/flag", stagedController.flagRecord);
router.post("/:id/needs-review", stagedController.needsReviewRecord);

export default router;
