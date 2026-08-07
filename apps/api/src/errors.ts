import { FastifyError } from 'fastify';

export class AppError extends Error implements FastifyError {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly validation?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    validation?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.validation = validation;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', validation?: any) {
    super(message, 400, 'VALIDATION_ERROR', validation);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED_ERROR');
  }
}

// Keeping compatibility for helper functions if they were imported elsewhere
export function sanitizeError(error: unknown): { message: string; code?: string } {
  if (error instanceof AppError) {
    return { message: error.message, code: error.code };
  }
  return {
    message: 'An unexpected error occurred. Please try again later.',
    code: 'INTERNAL_ERROR',
  };
}

export function logError(error: unknown, context: string): void {
  console.error(`[${context}] Error details:`, error);
}
