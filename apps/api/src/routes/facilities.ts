import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requireAnyAdmin, requireSuperAdmin } from "../middleware/requireRole";
import * as facilitiesController from "../controllers/facilities.controller";

const router: Router = Router();

router.use(authenticate);

router.get("/", requireAnyAdmin, facilitiesController.listFacilities);
router.post("/", requireSuperAdmin, facilitiesController.createFacility);
router.patch("/:id", requireSuperAdmin, facilitiesController.updateFacility);
router.patch("/:id/status", requireAnyAdmin, facilitiesController.updateFacilityStatus);

export default router;
