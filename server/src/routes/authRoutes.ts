import { Router } from "express";
import { authController } from "../controllers/authController";

const router = Router();

// Authentication Routes

router.post("/register", authController.register.bind(authController));
router.post("/login", authController.login);
router.post("/logout", authController.logout);
// router.post("/refresh-token", authController.refresh);

export default router;
