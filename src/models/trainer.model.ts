import mongoose, { Schema, Document, Model } from "mongoose";

// Interface for Trainer document
export interface ITrainer extends Document {
  email: string;
  name: string;
  mpin: string;
  isInvitationAccepted: boolean;
  gyms: { gymId: mongoose.Types.ObjectId; gymName: string }[];
  invitationToken: string;
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
    name: {
      type: String,
      trim: true,
    },
    mpin: {
      type: String,
      required: true,
    },
    isInvitationAccepted: {
      type: Boolean,
      default: false,
    },
    gyms: [
      {
        gymId: {
          type: Schema.Types.ObjectId,
          ref: "Gym",
          required: true,
        },
        gymName: {
          type: String,
          required: true,
        },
      },
    ],
    invitationToken: {
      type: String,
    },
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
