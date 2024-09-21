import mongoose, { Schema, Document, Model } from "mongoose";

// Interface for the gym document
export interface IGym extends Document {
  name: string;
  contactNumber: string;
  emergencyContact: string;
  gymEmail: string;
  adminOwnerName: string;
  description: string;
  openingHours: string;
  amenities: string[];
  socialMediaLinks: { platform: string; url: string }[];
  websiteUrl?: string;
  membershipTypes: string[];
  facilities: string[];
  admin: mongoose.Types.ObjectId;
}

// Gym schema definition
const gymSchema = new Schema<IGym>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },
    emergencyContact: {
      type: String,
      required: true,
      trim: true,
    },
    gymEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    adminOwnerName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    openingHours: {
      type: String,
      required: true,
      trim: true,
    },
    amenities: {
      type: [String],
      default: [],
    },
    socialMediaLinks: [
      {
        platform: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
    websiteUrl: {
      type: String,
      trim: true,
    },
    membershipTypes: {
      type: [String],
      default: [],
    },
    facilities: {
      type: [String],
      default: [],
    },
    admin: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Gym model
const Gym: Model<IGym> = mongoose.model<IGym>("Gym", gymSchema);

export { Gym };
