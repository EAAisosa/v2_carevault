import { Router } from "express";
import { authLimiter } from "../middleware/rateLimiter";
import { authenticate } from "../middleware/authenticate";
import * as authController from "../controllers/auth.controller";

const router: Router = Router();

router.post("/login", authLimiter, authController.login);
router.post("/refresh", authLimiter, authController.refresh);
router.post("/logout", authenticate, authController.logout);
router.post("/forgot-password", authLimiter, authController.forgotPassword);
router.post("/reset-password", authLimiter, authController.resetPassword);
router.get("/me", authenticate, authController.getMe);

export default router;
