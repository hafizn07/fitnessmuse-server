import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { IUser, User } from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { sendEmail } from "../utils/sendEmail";

/**
 * @description Sends a verification email to the user with a secure link to verify their email address.
 *              This function constructs a verification URL using a unique token and the frontend URL.
 *              The email contains a clickable link that directs the user to the email verification page.
 * @param {IUser} user - The user object containing the user's details, including the email address to send the verification link to.
 * @param {string} token - A unique verification token used to identify and validate the email verification request.
 * @returns {Promise<void>} - Returns a promise that resolves when the email is successfully sent.
 * @throws {Error} - Throws an error if the email fails to send due to network issues or other unexpected errors.
 *
 * @example
 * // Example usage:
 * const user = await User.findById(userId);
 * const token = generateVerificationToken(user);
 * await sendVerificationEmail(user, token);
 */
const sendVerificationEmail = async (user: IUser, token: string) => {
  const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  await sendEmail({
    to: user.email,
    subject: "Email Verification",
    html: `<p>Please verify your email by clicking the link below:</p><a href="${verificationLink}">Verify Email</a>`,
  });
};

/**
 * Generates access and refresh tokens for a given user ID.
 * @param userId - The ID of the user for whom tokens are being generated.
 * @returns An object containing the access token and refresh token.
 */
const generateAccessAndRefreshTokens = async (userId: unknown) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "An error occurred while generating access and refresh tokens."
    );
  }
};

/**
 * Registers a new user in the system.
 * @route POST /register
 */
const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, email, username, password, phoneNumber } = req.body;

  // Validate input fields
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // Check if user already exists with the provided email or username
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    throw new ApiError(
      409,
      "A user with this email or username already exists."
    );
  }

  // Create a new user
  const newUser = await User.create({
    fullName,
    email,
    password,
    username: username.toLowerCase(),
    phoneNumber,
  });

  const emailVerificationToken = newUser.generateEmailVerificationToken();
  await sendVerificationEmail(newUser, emailVerificationToken);

  // Retrieve the created user without sensitive fields
  const sanitizedUser = await User.findById(newUser._id).select(
    "-password -refreshToken"
  );

  if (!sanitizedUser) {
    throw new ApiError(500, "An error occurred while registering the user");
  }

  // Send response
  return res
    .status(201)
    .json(new ApiResponse(200, sanitizedUser, "User registered successfully"));
});

/**
 * Logs in a user and generates access and refresh tokens.
 * @route POST /login
 */
const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, username, password } = req.body;

  // Validations
  if (!username && !email) {
    throw new ApiError(400, "username or email is required");
  }

  if (!password) {
    throw new ApiError(400, "Password is required.");
  }

  // Find the user by email or username
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  // Check if the provided password is correct
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  // Generate access and refresh tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // Retrieve the user without sensitive fields
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // Set cookie options
  const cookieOptions = {
    httpOnly: true,
    secure: true,
  };

  // Send response with cookies
  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

/**
 * Logs out a user by clearing their refresh token and cookies.
 * @route POST /logout
 */
const logoutUser = asyncHandler(async (req: Request, res: Response) => {
  // Ensure the user is authenticated
  const userId = (req as any).user?._id;

  if (!userId) {
    throw new ApiError(401, "User is not authenticated.");
  }

  // Remove the refreshToken field from the user's record
  await User.findByIdAndUpdate(
    userId,
    { $unset: { refreshToken: 1 } },
    { new: true }
  );

  // Cookie options to clear tokens securely
  const cookieOptions = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

/**
 * Refreshes access token using the provided refresh token.
 * @route POST /refresh-token
 */
const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
  // Retrieve the refresh token from cookies or request body
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request: No refresh token provided.");
  }

  try {
    // Verify the provided refresh token using the secret key
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET as string
    ) as { _id: string };

    // Find the user by ID extracted from the token
    const user = await User.findById(decodedToken._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token.");
    }

    // Validate if the provided refresh token matches the one stored for the user
    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used.");
    }

    // Generate new access and refresh tokens
    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    const cookieOptions = {
      httpOnly: true,
      secure: true,
    };

    // Send response with new tokens as cookies
    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", newRefreshToken, cookieOptions)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed successfully."
        )
      );
  } catch (error) {
    throw new ApiError(
      401,
      error instanceof Error ? error.message : "Invalid refresh token."
    );
  }
});

/**
 * Changes the current password for an authenticated user.
 * @route POST /change-password
 */
const changeCurrentPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { oldPassword, newPassword } = req.body;

    // Ensure the user is authenticated
    const userId = req.user?._id;

    if (!userId) {
      throw new ApiError(401, "User is not authenticated.");
    }

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Check if the provided old password is correct
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
      throw new ApiError(400, "Invalid old password");
    }

    // Update the user's password
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Password changed successfully"));
  }
);

/**
 * Fetches the currently authenticated user.
 * @route GET /current-user
 */
const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  // Ensure the user is authenticated
  if (!user) {
    throw new ApiError(401, "User is not authenticated.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User fetched successfully"));
});

/**
 * Updates the authenticated user's account details.
 * @route PUT /update-account
 */
const updateAccountDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const { fullName, email } = req.body;

    // Validate input fields
    if (!fullName || !email) {
      throw new ApiError(400, "All fields are required");
    }

    const currentUser = (req as any).user;

    // Ensure the user is authenticated
    if (!currentUser) {
      throw new ApiError(401, "User is not authenticated.");
    }

    // Update the user details
    const user = await User.findByIdAndUpdate(
      currentUser._id, // Use the user ID from the authenticated user
      {
        $set: {
          fullName,
          email,
        },
      },
      { new: true }
    ).select("-password");

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, user, "Account details updated successfully"));
  }
);

const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.query;

  if (!token) {
    throw new ApiError(400, "Verification token is missing.");
  }

  let decoded;
  try {
    decoded = jwt.verify(
      token as string,
      process.env.EMAIL_VERIFICATION_SECRET as string
    ) as { _id: string };
  } catch (error) {
    throw new ApiError(400, "Invalid or expired token.");
  }

  const user = await User.findById(decoded._id);

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  if (user.isEmailVerified) {
    throw new ApiError(400, "Email is already verified.");
  }

  user.isEmailVerified = true;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Email verified successfully."));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  verifyEmail,
};
