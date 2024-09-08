import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * A utility function to handle asynchronous route handlers in Express.
 *
 * This function takes an asynchronous route handler (a function that returns a Promise)
 * and ensures that any errors are properly caught and forwarded to the next middleware.
 *
 * Using this function helps to avoid repetitive try/catch blocks in each route handler
 * and keeps the code cleaner and more readable.
 *
 * @param requestHandler - An asynchronous Express route handler function.
 * @returns A new route handler that automatically catches errors and passes them to the next middleware.
 */
const asyncHandler = (requestHandler: RequestHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(requestHandler(req, res, next)).catch(next);
  };
};

export { asyncHandler };
