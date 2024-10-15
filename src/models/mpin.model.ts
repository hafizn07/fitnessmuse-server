import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcrypt";

// Interface for the MPIN document
export interface IMPIN extends Document {
  trainerId: mongoose.Types.ObjectId;
  gymId: mongoose.Types.ObjectId;
  mpin: string;

  // Method definitions
  isMpinCorrect(mpin: string): Promise<boolean>;
}

// MPIN schema definition
const mpinSchema = new Schema<IMPIN>(
  {
    trainerId: { type: Schema.Types.ObjectId, ref: "Trainer", required: true },
    gymId: { type: Schema.Types.ObjectId, ref: "Gym", required: true },
    mpin: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to hash the MPIN
mpinSchema.pre<IMPIN>("save", async function (next) {
  if (!this.isModified("mpin")) return next();

  this.mpin = await bcrypt.hash(this.mpin, 10);
  next();
});

// Method to check if the provided MPIN matches the hashed MPIN
mpinSchema.methods.isMpinCorrect = async function (
  mpin: string
): Promise<boolean> {
  return await bcrypt.compare(mpin, this.mpin);
};

// MPIN model
const MPIN: Model<IMPIN> = mongoose.model<IMPIN>("MPIN", mpinSchema);

export { MPIN };
