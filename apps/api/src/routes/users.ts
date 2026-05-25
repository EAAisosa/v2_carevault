import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requireAnyAdmin } from "../middleware/requireRole";
import * as usersController from "../controllers/users.controller";

const router: Router = Router();

router.use(authenticate, requireAnyAdmin);

router.get("/", usersController.listUsers);
router.post("/invite", usersController.inviteUser);
router.patch("/:id/role", usersController.updateRole);
router.post("/:id/deactivate", usersController.deactivateUser);
router.post("/:id/activate", usersController.activateUser);
router.delete("/:id", usersController.deleteUser);
router.post("/:id/reset-password", usersController.resetUserPassword);
router.post("/:id/resend-invite", usersController.resendInvite);

export default router;
