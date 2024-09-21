import mongoose, { Schema, Document, Model } from "mongoose";

// Interface for Trainer document
export interface ITrainer extends Document {
  email: string;
  name: string;
  mpin: string;
  isInvitationAccepted: boolean;
  gym: mongoose.Types.ObjectId;
  invitationToken: string;
}

// Trainer schema definition
const trainerSchema = new Schema<ITrainer>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
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
    gym: {
      type: Schema.Types.ObjectId,
      ref: "Gym",
      required: true,
    },
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
