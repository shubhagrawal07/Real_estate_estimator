/**
 * Error with HTTP status code for use in controllers. Caught by error middleware.
 */
export class AppError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
