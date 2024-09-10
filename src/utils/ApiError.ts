class ApiError<T = unknown> extends Error {
  statusCode: number;
  data?: T;
  success: boolean;
  errors?: string[];

  /**
   * Creates an instance of ApiError.
   *
   * @param statusCode - The HTTP status code for the error.
   * @param message - A descriptive error message (default: "Something went wrong").
   * @param errors - An optional array of additional error details (default: an empty array).
   * @param stack - Optional stack trace for the error.
   */
  constructor(
    statusCode: number,
    message = "Something went wrong",
    errors?: string[],
    stack?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
