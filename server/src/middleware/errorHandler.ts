import { Request, Response, NextFunction } from "express";
import { AppError, ValidationError } from "../errrors/AppError";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || null, // only present for validation errors
    });
  }

  // If it's a ZodError (in case you missed wrapping it)
  if (isZodError(err)) {
    const fieldErrors = err.flatten().fieldErrors;
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: fieldErrors,
    });
  }

  if (err instanceof ValidationError) {
    return res.status(400).json({
      message: err.message,
      errors: err.errors, // this contains field-specific messages
    });
  }

  return res.status(500).json({
    success: false,
    message: "Something went wrong",
  });
};

// Helper type guard for ZodError
function isZodError(error: any): error is import("zod").ZodError {
  return error && typeof error === "object" && "issues" in error;
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
