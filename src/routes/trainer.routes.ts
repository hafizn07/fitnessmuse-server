import { Router } from "express";
import { acceptTrainerInvitation } from "../controllers/trainer.controller";

const router = Router();

// Route to accept a trainer invitation
router.route("/accept-invitation").get(acceptTrainerInvitation);

export default router;
