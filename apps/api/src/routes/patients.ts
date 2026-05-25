import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";
import * as patientsController from "../controllers/patients.controller";

const router: Router = Router();

router.use(authenticate);

router.get("/", requireRole("clinician", "facility_admin", "carevault_admin"), patientsController.searchPatients);
router.get("/:id", requireRole("clinician", "facility_admin", "carevault_admin"), patientsController.getPatient);

export default router;
