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

/**
 * @description Retrieve the list of gyms associated with the logged-in admin.
 * @route GET /gyms
 * @access Private (Admin only)
 */
export const getAllGyms = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.user?._id;

  // Ensure admin is authenticated
  if (!adminId) {
    throw new ApiError(403, "Unauthorized access");
  }

  // Retrieve the gyms associated with the admin
  const gyms = await Gym.find({ admin: adminId }).select(
    "-__v -createdAt -updatedAt"
  );

  // Send response with the list of gyms
  res
    .status(200)
    .json(new ApiResponse(200, gyms, "Gyms retrieved successfully"));
});

/**
 * @description Retrieve a gym by its ID for the logged-in admin.
 * @route GET /gyms/:gymId
 * @access Private (Admin only)
 */
export const getGymById = asyncHandler(async (req: Request, res: Response) => {
  const { gymId } = req.params;
  const adminId = req.user?._id;

  // Ensure admin is authenticated
  if (!adminId) {
    throw new ApiError(403, "Unauthorized access");
  }

  // Retrieve the gym by ID and ensure it belongs to the admin
  const gym = await Gym.findOne({ _id: gymId, admin: adminId }).select(
    "-__v -createdAt -updatedAt"
  );

  if (!gym) {
    throw new ApiError(404, "Gym not found or does not belong to you");
  }

  // Send response with the gym details
  res.status(200).json(new ApiResponse(200, gym, "Gym retrieved successfully"));
});

/**
 * @description Update gym details by ID for the logged-in admin.
 * @route PATCH /gyms/:gymId
 * @access Private (Admin only)
 */
export const updateGymDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const { gymId } = req.params;
    const adminId = req.user?._id;

    // Ensure admin is authenticated
    if (!adminId) {
      throw new ApiError(403, "Unauthorized access");
    }

    // Find and update the gym details
    const updatedGym = await Gym.findOneAndUpdate(
      { _id: gymId, admin: adminId },
      { $set: req.body },
      { new: true, runValidators: true }
    ).select("-__v -createdAt -updatedAt");

    if (!updatedGym) {
      throw new ApiError(404, "Gym not found or does not belong to you");
    }

    // Send response with updated gym details
    res
      .status(200)
      .json(new ApiResponse(200, updatedGym, "Gym updated successfully"));
  }
);

/**
 * @description Toggle the status of a gym (active/inactive).
 * @route PATCH /gyms/:gymId/status
 * @access Private (Admin only)
 */
export const updateGymStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { gymId } = req.params;
    const adminId = req.user?._id;

    // Ensure admin is authenticated
    if (!adminId) {
      throw new ApiError(403, "Unauthorized access");
    }

    // Find the gym and ensure it belongs to the logged-in admin
    const gym = await Gym.findOne({ _id: gymId, admin: adminId });
    if (!gym) {
      throw new ApiError(404, "Gym not found or does not belong to you");
    }

    // Toggle the status between active and inactive
    gym.status = gym.status === "active" ? "inactive" : "active";
    await gym.save();

    // Send response with the updated gym status
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { gymId: gym._id, status: gym.status },
          `Gym status updated to ${gym.status}`
        )
      );
  }
);

/**
 * @description Delete a gym by ID for the logged-in admin.
 * @route DELETE /gyms/:gymId
 * @access Private (Admin only)
 */
export const deleteGym = asyncHandler(async (req: Request, res: Response) => {
  const { gymId } = req.params;
  const adminId = req.user?._id;

  // Ensure admin is authenticated
  if (!adminId) {
    throw new ApiError(403, "Unauthorized access");
  }

  // Find and delete the gym by ID, ensuring it belongs to the admin
  const gym = await Gym.findOneAndDelete({ _id: gymId, admin: adminId });

  if (!gym) {
    throw new ApiError(404, "Gym not found or does not belong to you");
  }

  // Send response confirming deletion
  res.status(204).json(new ApiResponse(204, "Gym deleted successfully"));
});
