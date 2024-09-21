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
 * @description Invite multiple trainers to join a specific gym. This controller
 *              validates the input, checks for existing invitations, and sends
 *              invitation emails with a secure link and MPIN. The trainer's
 *              details are sanitized before responding.
 * @route POST /gyms/:gymId/trainers/invite
 * @access Private (Gym Admin)
 */
export const inviteTrainers = asyncHandler(
  async (req: Request, res: Response) => {
    const { emails } = req.body;
    const gymId = req.params.gymId;

    // Validate that emails are provided and not empty
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      throw new ApiError(400, "A list of emails is required");
    }

    // Retrieve the gym by its ID to ensure it exists
    const gym = await Gym.findById(gymId);
    if (!gym) {
      throw new ApiError(404, "Gym not found");
    }

    const invitedTrainers = [];
    const failedInvitations = [];

    for (const email of emails) {
      // Validate email format and check if already invited
      if (!email?.trim()) {
        failedInvitations.push({ email, error: "Invalid email format" });
        continue;
      }

      const existingTrainer = await Trainer.findOne({ email, gym: gymId });
      if (existingTrainer) {
        failedInvitations.push({
          email,
          error: "Trainer already invited to this gym",
        });
        continue;
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

      // Sanitize the trainer data before sending the response
      const sanitizedTrainer = await Trainer.findById(trainer._id).select(
        "-mpin -invitationToken"
      );

      // Send the invitation email
      const confirmationLink = `${process.env.FRONTEND_URL}/trainer/confirm-invite?token=${invitationToken}`;
      try {
        await sendEmail({
          to: email,
          subject: "Gym Invitation",
          text: `You have been invited to join the gym. Your MPIN is ${mpin}. Please click the link to accept the invitation: ${confirmationLink}`,
        });
        invitedTrainers.push(sanitizedTrainer); // Add sanitized trainer to invitedTrainers
      } catch (error) {
        failedInvitations.push({
          email,
          error: "Failed to send invitation email",
        });
      }
    }

    res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { invitedTrainers, failedInvitations },
          "Trainers invitation process completed"
        )
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

/**
 * @description Retrieve all trainers for a specific gym
 * @route GET /gyms/:gymId/trainers
 * @access Private (Gym Admin)
 */
export const getTrainersForGym = asyncHandler(
  async (req: Request, res: Response) => {
    const gymId = req.params.gymId;

    // Fetch trainers associated with the gym
    const trainers = await Trainer.find({ gym: gymId });

    // If no trainers found, respond accordingly
    if (!trainers || trainers.length === 0) {
      throw new ApiError(404, "No trainers found for this gym");
    }

    res.status(200).json({
      status: 200,
      data: trainers,
      message: "Trainers retrieved successfully",
    });
  }
);
