import { Request, Response } from "express";
import { Gym } from "../models/gym.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";

/**
 * @description Create a new gym under the logged-in admin. This controller
 *              validates input, checks for existing gyms with the same email,
 *              and creates a gym record if valid.
 * @route POST /gyms/add-gyms
 * @access Private (Admin only)
 */
export const createGym = asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    contactNumber,
    emergencyContact,
    gymEmail,
    adminOwnerName,
    description,
    openingHours,
    amenities,
    socialMediaLinks,
    websiteUrl,
    membershipTypes,
    facilities,
  } = req.body;

  // Retrieve the admin ID from the authenticated user
  const adminId = req.user?._id;

  // Ensure admin is creating the gym
  if (!adminId) {
    throw new ApiError(403, "Unauthorized access");
  }

  // Validate required fields
  if (!name || !gymEmail) {
    throw new ApiError(400, "Gym name and email are required.");
  }

  // Check if the gym email is already in use
  const existingGym = await Gym.findOne({ gymEmail });
  if (existingGym) {
    throw new ApiError(400, "Gym email is already in use");
  }

  // Create a new gym document
  const newGym = new Gym({
    name,
    contactNumber,
    emergencyContact,
    gymEmail,
    adminOwnerName,
    description,
    openingHours,
    amenities,
    socialMediaLinks,
    websiteUrl,
    membershipTypes,
    facilities,
    admin: adminId,
  });

  // Save the gym
  await newGym.save();

  // Retrieve the newly created gym without sensitive fields for the response
  const sanitizedGym = await Gym.findById(newGym._id).select(
    "-__v -createdAt -updatedAt"
  );

  // Send a formatted response
  res
    .status(201)
    .json(new ApiResponse(201, sanitizedGym, "Gym created successfully"));
});
