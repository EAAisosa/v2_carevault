import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requireAnyAdmin } from "../middleware/requireRole";
import * as connectionsController from "../controllers/facilityConnections.controller";

const router: Router = Router();

router.use(authenticate, requireAnyAdmin);

router.get("/", connectionsController.listConnections);
router.post("/", connectionsController.createConnection);
router.patch("/:id", connectionsController.updateConnection);
router.delete("/:id", connectionsController.deleteConnection);
router.post("/:id/test", connectionsController.testConnection);

export default router;
