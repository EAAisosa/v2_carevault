import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";
import * as patientsController from "../controllers/patients.controller";

const router: Router = Router();

router.use(authenticate);

// Search via POST to keep PII (names, DOB, phone) out of URLs, query logs, and history.
router.post("/search", requireRole("clinician", "facility_admin", "carevault_admin"), patientsController.searchPatients);
// Legacy GET kept for back-compat; same controller reads from query/body.
router.get("/", requireRole("clinician", "facility_admin", "carevault_admin"), patientsController.searchPatients);
router.get("/:id", requireRole("clinician", "facility_admin", "carevault_admin"), patientsController.getPatient);

export default router;
