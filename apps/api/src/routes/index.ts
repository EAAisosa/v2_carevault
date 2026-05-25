import { Router } from "express";
import authRoutes from "./auth";
import patientsRoutes from "./patients";
import stagedRecordsRoutes from "./stagedRecords";
import facilitiesRoutes from "./facilities";
import facilityConnectionsRoutes from "./facilityConnections";
import usersRoutes from "./users";
import syncRoutes from "./sync";
import auditLogsRoutes from "./auditLogs";
import dashboardRoutes from "./dashboard";

const router: Router = Router();

router.use("/auth", authRoutes);
router.use("/patients", patientsRoutes);
router.use("/staged-records", stagedRecordsRoutes);
router.use("/facilities", facilitiesRoutes);
router.use("/facility-connections", facilityConnectionsRoutes);
router.use("/users", usersRoutes);
router.use("/sync", syncRoutes);
router.use("/audit-logs", auditLogsRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
