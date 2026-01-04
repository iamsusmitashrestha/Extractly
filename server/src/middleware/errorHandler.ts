import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { AppError, ValidationError } from "../errrors/AppError";
import {
  ProviderError,
  ProviderAuthenticationError,
  ProviderRateLimitError,
  ProviderTimeoutError,
  ProviderResponseError
} from "../services/providers/ProviderError";
import logger from "../utils/logger";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // CRITICAL: If headers are already sent (e.g. streaming), we cannot send a JSON response.
  if (res.headersSent) {
    return next(err);
  }

  logger.error(`Error processing request ${req.method} ${req.url}:`, {
    message: err.message,
    stack: err.stack,
    name: err.name
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || null,
    });
  }

  if (isZodError(err)) {
    const fieldErrors = err.flatten().fieldErrors;
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: fieldErrors,
    });
  }

  if (err instanceof ProviderError) {
    let statusCode = 502; // Default to Bad Gateway
    let message = "AI Provider Error";

    if (err instanceof ProviderAuthenticationError) {
      statusCode = 500; // Server configuration issue
      message = "AI Provider Authentication Failed";
    } else if (err instanceof ProviderRateLimitError) {
      statusCode = 429;
      message = "AI Provider Rate Limit Exceeded";
    } else if (err instanceof ProviderTimeoutError) {
      statusCode = 504;
      message = "AI Provider Timeout";
    } else if (err instanceof ProviderResponseError) {
      statusCode = 502;
      message = "Invalid Response from AI Provider";
    }

    return res.status(statusCode).json({
      success: false,
      message: message,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: Unique constraint violation
    if (err.code === 'P2002') {
      const field = (err.meta?.target as string[])?.join(', ') || 'field';
      return res.status(409).json({
        success: false,
        message: `A record with this ${field} already exists.`,
      });
    }

    // P2025: Record not found (if using rejectOnNotFound)
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Record not found.',
      });
    }

    return res.status(400).json({
      success: false,
      message: "Database operation failed",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // 5. Handle Generic/Unknown Errors
  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
    // Only show error details in development
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
};

// Helper type guard for ZodError
function isZodError(error: any): error is import("zod").ZodError {
  return error && typeof error === "object" && "issues" in error && Array.isArray(error.issues);
}


