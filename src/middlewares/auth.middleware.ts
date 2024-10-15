import { NextFunction, Request } from "express";
import { User } from "../models/user.model";
import { Trainer } from "../models/trainer.model";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import jwt, { JwtPayload } from "jsonwebtoken";

// Interface for the decoded token
interface DecodedToken extends JwtPayload {
  _id: string;
}

/**
 * Middleware to verify JWT and attach user or trainer to the request object
 */
export const verifyJWT = asyncHandler(
  async (req: Request, _, next: NextFunction) => {
    try {
      // Get token from cookies or Authorization header
      const token =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "");

      if (!token) {
        throw new ApiError(401, "Unauthorized request: No token provided.");
      }

      // Verify the token
      const decodedToken = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET as string
      ) as DecodedToken;

      // Check for the user in both User and Trainer collections
      const user =
        (await User.findById(decodedToken?._id).select(
          "-password -refreshToken"
        )) ||
        (await Trainer.findById(decodedToken?._id).select(
          "-mpin -gyms.invitationTokens.token"
        ));

      if (!user) {
        throw new ApiError(401, "Unauthorized request: Invalid token.");
      }

      // Attach user to request object
      req.user = user;
      next();
    } catch (error) {
      throw new ApiError(
        401,
        error instanceof Error ? error.message : "Invalid access token"
      );
    }
  }
);
