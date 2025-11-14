import { Router } from "express";
import { oauthController } from "../controllers/oauthController";

const router = Router();

router.get("/google/start", oauthController.googleStart);
router.get("/google/callback", oauthController.googleCallback);

export default router;
