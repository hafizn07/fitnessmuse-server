import { IUser } from "../models/user.model";

// Extend the Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}
