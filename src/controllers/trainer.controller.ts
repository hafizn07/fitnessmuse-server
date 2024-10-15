import { Request, Response } from "express";
import crypto from "crypto";
import { Trainer } from "../models/trainer.model";
import { MPIN } from "../models/mpin.model";
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

      // Store MPIN in the MPIN model
      const mpinRecord = new MPIN({
        trainerId: trainer._id,
        gymId: gym._id,
        mpin,
      });
      await mpinRecord.save();

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

    return res
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

    return res
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

    // Prepare an array of promises for fetching MPINs
    const sanitizedTrainersPromises = trainers.map(async (trainer) => {
      const gyms = trainer.gyms.filter((g) => g.gymId.toString() === gymId);

      // Fetch MPINs for each trainer that accepted the invitation
      const mpinPromises = gyms.map(async (g) => {
        if (g.isInvitationAccepted) {
          const mpinDoc = await MPIN.findOne({ trainerId: trainer._id, gymId });
          return mpinDoc?.mpin || null; // Optional chaining to avoid TypeScript error
        }
        return null; // Return null if invitation not accepted
      });

      const mpins = await Promise.all(mpinPromises);

      return {
        email: trainer.email,
        gyms: gyms.map((g, index) => ({
          gymId: g.gymId,
          gymName: g.gymName,
          isInvitationAccepted: g.isInvitationAccepted,
          mpin: mpins[index], // Corresponding MPIN
        })),
      };
    });

    // Resolve all promises to get the sanitized trainers
    const sanitizedTrainers = await Promise.all(sanitizedTrainersPromises);

    return res
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

/**
 * @description Trainer login using email and MPIN
 * @route POST /trainers/login
 * @access Public
 */
export const loginTrainer = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, mpin } = req.body;

    // Validations
    if (!email || !mpin) {
      throw new ApiError(400, "Email and MPIN are required.");
    }

    // Find the trainer by email
    const trainer = await Trainer.findOne({ email });
    if (!trainer) {
      throw new ApiError(401, "Invalid email or MPIN.");
    }

    // Check MPIN stored in the MPIN model for all gyms associated with the trainer
    const mpinRecord = await MPIN.findOne({ trainerId: trainer._id });

    if (!mpinRecord || !(await mpinRecord.isMpinCorrect(mpin))) {
      throw new ApiError(401, "Invalid MPIN.");
    }

    // Retrieve the specific gym details where the MPIN is valid
    const gymDetails = await MPIN.findOne({
      trainerId: trainer._id,
    }).populate("gymId");

    if (!gymDetails) {
      throw new ApiError(401, "Invalid MPIN for the associated gym.");
    }

    // Generate JWT using model method
    const token = trainer.generateAccessToken();

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          token,
          gymId: gymDetails.gymId._id,
        },
        "Login successful."
      )
    );
  }
);
