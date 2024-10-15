import { Router } from "express";
import {
  acceptTrainerInvitation,
  loginTrainer,
} from "../controllers/trainer.controller";

const router = Router();

// Route to accept a trainer invitation
router.route("/accept-invitation").get(acceptTrainerInvitation);
router.route("/login").post(loginTrainer);

export default router;
