import { Router } from "express";
import { authController } from "../controllers/authController";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();

// Authentication Routes

router.post("/register", authController.register.bind(authController));
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.post("/refresh", authController.refresh);
router.get("/me", requireAuth, authController.me.bind(authController));

export default router;
