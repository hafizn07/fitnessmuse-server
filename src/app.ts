import express, { Application } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app: Application = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Routes imports
import userRouter from "./routes/user.routes";
import gymRouter from "./routes/gym.routes";
import trainerRouter from "./routes/trainer.routes";

//Routes declarations
app.use("/api/v1/users", userRouter);
app.use("/api/v1/gyms", gymRouter);
app.use("/api/v1/trainers", trainerRouter);

export { app };
