class ApiResponse<T> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;

  /**
   * Creates an instance of ApiResponse.
   *
   * @param statusCode - The HTTP status code for the response.
   * @param data - The data to be included in the response.
   * @param message - A descriptive message for the response (default: "Success").
   */
  constructor(statusCode: number, data: T, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

export { ApiResponse };
