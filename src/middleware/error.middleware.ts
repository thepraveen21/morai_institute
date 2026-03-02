import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import AppError from '../utils/AppError';

const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('ERROR:', err);
  }

  // Handle AppError (our custom errors)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
    return;
  }

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const errors = err.errors.map((issue) => ({
      field: issue.path.slice(1).join('.'),
      message: issue.message
    }));
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
    return;
  }

  // Handle PostgreSQL Errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        res.status(400).json({
          success: false,
          message: 'Record already exists — duplicate entry detected'
        });
        return;

      case '23503': // Foreign key violation
        res.status(400).json({
          success: false,
          message: 'Related record not found — invalid reference'
        });
        return;

      case '22P02': // Invalid UUID
        res.status(400).json({
          success: false,
          message: 'Invalid ID format provided'
        });
        return;

      case '23502': // Not null violation
        res.status(400).json({
          success: false,
          message: `Required field missing: ${err.column}`
        });
        return;
    }
  }

  // Handle JWT Errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      message: 'Invalid token — please login again'
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      message: 'Token expired — please login again'
    });
    return;
  }

  // Default — Unknown Server Error
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development'
      ? err.message
      : 'Something went wrong — please try again later'
  });
};

export default errorMiddleware;