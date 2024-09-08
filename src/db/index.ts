import mongoose from "mongoose";
import { DB_NAME } from "../constants";

const connectDB = async (): Promise<void> => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log(
      `\nMongoDB connected ✅.\nDB HOST: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.error(`MongoDB connection failed ❌: ${error}`);
    process.exit(1);
  }
};

export default connectDB;
