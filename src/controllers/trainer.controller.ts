import { Request, Response } from "express";
import crypto from "crypto";
import { Trainer } from "../models/trainer.model";
import { Gym } from "../models/gym.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { sendEmail } from "../utils/sendEmail";
import { asyncHandler } from "../utils/asyncHandler";

// Function to generate a secure random token
const generateToken = () => crypto.randomBytes(32).toString("hex");

// Helper function to generate a random 6-digit numeric MPIN for trainer access
const generateMPIN = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/**
 * @description Invite a trainer to join a specific gym. This controller
 *              validates the input, checks for existing invitations, and sends
 *              an invitation email with a secure link and MPIN. The trainer's
 *              details are sanitized before responding.
 * @route POST /gyms/:gymId/invite-trainer
 * @access Private (Gym Admin)
 */
export const inviteTrainer = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body;
    const gymId = req.params.gymId;

    // Validate that the email field is provided and not empty
    if (!email?.trim()) {
      throw new ApiError(400, "Email is required");
    }

    // Retrieve the gym by its ID to ensure it exists
    const gym = await Gym.findById(gymId);
    if (!gym) {
      throw new ApiError(404, "Gym not found");
    }

    // Check if a trainer has already been invited to the gym with the same email
    const existingTrainer = await Trainer.findOne({ email, gym: gymId });
    if (existingTrainer) {
      throw new ApiError(400, "Trainer already invited to this gym");
    }

    // Generate a 6-digit MPIN and a secure invitation token
    const mpin = generateMPIN();
    const invitationToken = generateToken();

    // Create a new trainer document with the initial invitation details
    const trainer = new Trainer({
      email,
      mpin,
      gym: gymId,
      isInvitationAccepted: false,
      invitationToken,
    });

    // Save the trainer
    await trainer.save();

    // Send the invitation email with the secure confirmation link
    const confirmationLink = `${process.env.FRONTEND_URL}/trainer/confirm-invite?token=${invitationToken}`;
    await sendEmail({
      to: email,
      subject: "Gym Invitation",
      text: `You have been invited to join the gym. Your MPIN is ${mpin}. Please click the link to accept the invitation: ${confirmationLink}`,
    });

    // Retrieve the trainer data without sensitive fields for the response
    const sanitizedTrainer = await Trainer.findById(trainer._id).select(
      "-mpin -invitationToken"
    );

    // Send response
    res
      .status(201)
      .json(
        new ApiResponse(201, sanitizedTrainer, "Trainer invited successfully")
      );
  }
);

/**
 * @description Accept a trainer's invitation using a secure token.
 *              This controller verifies the token, updates the trainer's
 *              acceptance status, and sanitizes the trainer data before responding.
 * @route GET /trainer/confirm-invite
 * @access Public
 */
export const acceptTrainerInvitation = asyncHandler(
  async (req: Request, res: Response) => {
    const { token } = req.query;

    // Validate the token
    if (!token) {
      throw new ApiError(400, "Token is required");
    }

    // Find the trainer with the matching invitation token
    const trainer = await Trainer.findOne({
      invitationToken: token,
      isInvitationAccepted: false,
    });

    if (!trainer) {
      throw new ApiError(400, "Invalid or expired invitation link.");
    }

    // Update the trainer's acceptance status and clear the token
    trainer.isInvitationAccepted = true;
    trainer.invitationToken = "";
    await trainer.save();

    // Sanitize the trainer data to avoid exposing sensitive fields
    const sanitizedTrainer = await Trainer.findById(trainer._id).select(
      "-mpin -invitationToken"
    );

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          sanitizedTrainer,
          "Invitation accepted successfully."
        )
      );
  }
);
