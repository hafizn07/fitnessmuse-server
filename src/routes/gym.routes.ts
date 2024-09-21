import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
  createGym,
  deleteGym,
  getAllGyms,
  getGymById,
  updateGymDetails,
  updateGymStatus,
} from "../controllers/gym.controller";
import {
  getTrainersForGym,
  inviteTrainers,
} from "../controllers/trainer.controller";

const router = Router();

router.route("/add-gyms").post(verifyJWT, createGym);
router.route("/").get(verifyJWT, getAllGyms);
router.route("/:gymId/trainers/invite").post(verifyJWT, inviteTrainers);
router.route("/:gymId/trainers").get(verifyJWT, getTrainersForGym);
router.route("/:gymId").get(verifyJWT, getGymById);
router.route("/:gymId").patch(verifyJWT, updateGymDetails);
router.route("/:gymId/status").patch(verifyJWT, updateGymStatus);
router.route("/:gymId").delete(verifyJWT, deleteGym);

export default router;
