import mongoose, { Schema, Document, Model } from "mongoose";

// Interface for the Gym details within the Trainer document
interface IGymDetails {
  gymId: mongoose.Types.ObjectId;
  gymName: string;
  mpin: string;
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
        mpin: { type: String, required: true },
        isInvitationAccepted: { type: Boolean, default: false }, // Moved here
        invitationTokens: [
          {
            token: { type: String, required: true },
            expiresAt: { type: Date, required: true },
          },
        ], // Moved here
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Trainer model
const Trainer: Model<ITrainer> = mongoose.model<ITrainer>(
  "Trainer",
  trainerSchema
);

export { Trainer };
