import { Request, Response } from "express";
import crypto from "crypto";
import { Trainer } from "../models/trainer.model";
import { Gym } from "../models/gym.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { sendEmail } from "../utils/sendEmail";
import { asyncHandler } from "../utils/asyncHandler";
import { generateEmailTemplate } from "../utils/emailTemplate";

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

      const existingTrainer = await Trainer.findOne({
        email,
        "gyms.gymId": gymId,
      });
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
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3); // Token expires in 3 days

      // Check if the trainer exists and add the gym details; otherwise, create a new trainer
      const trainer = await Trainer.findOneAndUpdate(
        { email },
        {
          $push: {
            gyms: {
              gymId,
              gymName: gym.name,
              mpin,
              isInvitationAccepted: false, // Set default value
              invitationTokens: {
                token: invitationToken,
                expiresAt,
              },
            },
          },
          $setOnInsert: { isInvitationAccepted: false },
        },
        { new: true, upsert: true }
      );

      // Sanitize the trainer data before sending the response
      const sanitizedTrainer = await Trainer.findById(trainer._id).select(
        "-mpin -gyms.invitationTokens.token"
      );

      // Send the invitation email
      const confirmationLink = `${process.env.FRONTEND_URL}/trainer/confirm-invite?token=${invitationToken}`;

      const emailBody = generateEmailTemplate({
        title: "You've Been Invited!",
        bodyContent: `Hello! You have been invited to join the ${gym.name}. Use the MPIN below as your Login creds. Make sure you don't share this to nobody`,
        mpin: mpin,
        buttonText: "Accept Invitation",
        buttonLink: confirmationLink,
        gymName: gym.name,
      });

      try {
        await sendEmail({
          to: email,
          subject: `Invitation to Join ${gym.name}`,
          html: emailBody,
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
      "gyms.invitationTokens.token": token,
      "gyms.invitationTokens.expiresAt": { $gt: new Date() }, // Check if token is not expired
      "gyms.isInvitationAccepted": false,
    });

    if (!trainer) {
      throw new ApiError(400, "Invalid or expired invitation link.");
    }

    // Find the specific gym details to update
    const gymIndex = trainer.gyms.findIndex((gym) =>
      gym.invitationTokens.some((t) => t.token === token)
    );

    if (gymIndex === -1) {
      throw new ApiError(400, "Gym not found for this invitation.");
    }

    // Update the trainer's acceptance status and clear the token
    trainer.gyms[gymIndex].isInvitationAccepted = true;
    trainer.gyms[gymIndex].invitationTokens = trainer.gyms[
      gymIndex
    ].invitationTokens.filter((invitation) => invitation.token !== token);

    await trainer.save();

    // Sanitize the trainer data to avoid exposing sensitive fields
    const sanitizedTrainer = await Trainer.findById(trainer._id).select(
      "-mpin -gyms.invitationTokens.token"
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
 * @description Retrieve all trainers for a specific gym, separating accepted and invitation pending trainers
 * @route GET /gyms/:gymId/trainers
 * @access Private (Gym Admin)
 */
export const getTrainersForGym = asyncHandler(
  async (req: Request, res: Response) => {
    const gymId = req.params.gymId;

    // Fetch trainers associated with the gym
    const trainers = await Trainer.find({ "gyms.gymId": gymId });

    // If no trainers found, respond accordingly
    if (!trainers || trainers.length === 0) {
      throw new ApiError(404, "No trainers found for this gym");
    }

    // Sanitize the response to show only relevant gym details for each trainer
    const sanitizedTrainers = trainers.map((trainer) => ({
      email: trainer.email,
      gyms: trainer.gyms
        .filter((g) => g.gymId.toString() === gymId)
        .map((g) => ({
          gymId: g.gymId,
          gymName: g.gymName,
          mpin: g.mpin,
          isInvitationAccepted: g.isInvitationAccepted,
        })),
    }));

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          sanitizedTrainers,
          "Trainers retrieved successfully"
        )
      );
  }
);
