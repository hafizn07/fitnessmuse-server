import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import { createGym } from "../controllers/gym.controller";
import { inviteTrainer } from "../controllers/trainer.controller";

const router = Router();

// Route to create a gym
router.route("/add-gyms").post(verifyJWT, createGym);

// Nested route to invite a trainer under a specific gym
router.route("/:gymId/trainers/invite").post(verifyJWT, inviteTrainer);

export default router;
