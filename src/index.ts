import { Server } from "http";
import { config } from "dotenv";
import connectDB from "./db";
import { app } from "./app";

config();

const PORT: number = Number(process.env.PORT) || 8000;

// Connect to the database and start the server
connectDB()
  .then(() => {
    const server: Server = app.listen(PORT, () => {
      console.log(`Server is running on port: ${PORT} 🚀`);
    });

    // Handle server-level errors
    server.on("error", (err: NodeJS.ErrnoException) => {
      console.error(`Server error: ${err.message}`);
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use.`);
      }
      process.exit(1);
    });
  })
  .catch((err: Error) => {
    console.error(`Failed to connect to MongoDB: ${err.message}`);
    process.exit(1);
  });
