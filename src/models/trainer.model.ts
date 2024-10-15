import mongoose, { Schema, Document, Model } from "mongoose";
import jwt from "jsonwebtoken";

// Interface for the Gym details within the Trainer document
interface IGymDetails {
  gymId: mongoose.Types.ObjectId;
  gymName: string;
  isInvitationAccepted: boolean;
  invitationTokens: IInvitationToken[];
}

// Interface for the Invitation Token details
interface IInvitationToken {
  token: string;
  expiresAt: Date;
}

// Interface for Trainer document
export interface ITrainer extends Document {
  email: string;
  gyms: IGymDetails[];

  // Method definitions
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

// Trainer schema definition
const trainerSchema = new Schema<ITrainer>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    gyms: [
      {
        gymId: { type: Schema.Types.ObjectId, ref: "Gym", required: true },
        gymName: { type: String, required: true },
        isInvitationAccepted: { type: Boolean, default: false },
        invitationTokens: [
          {
            token: { type: String, required: true },
            expiresAt: { type: Date, required: true },
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Method to generate an access token
trainerSchema.methods.generateAccessToken = function (): string {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
    },
    process.env.ACCESS_TOKEN_SECRET as string,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

// Method to generate a refresh token (optional)
trainerSchema.methods.generateRefreshToken = function (): string {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET as string,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

// Trainer model
const Trainer: Model<ITrainer> = mongoose.model<ITrainer>(
  "Trainer",
  trainerSchema
);

export { Trainer };
