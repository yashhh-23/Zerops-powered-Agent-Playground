import { FastifyInstance, FastifyError } from 'fastify';
import { AppError } from './errors';

interface PrismaError extends Error {
  code?: string;
  meta?: {
    target?: string[];
    fieldName?: string;
  };
}

export function registerErrorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler((error: FastifyError, request, reply) => {
    // Log full error server-side
    fastify.log.error({
      err: error,
      req: {
        method: request.method,
        url: request.url,
        headers: request.headers,
        params: request.params,
        query: request.query,
      },
    }, 'Request error');

    // Handle AppError instances
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
        ...(error.validation && { details: error.validation }),
      });
    }

    // Handle Prisma errors
    if (isPrismaError(error)) {
      return handlePrismaError(error as PrismaError, reply);
    }

    // Handle Fastify validation errors
    if (error.validation) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: error.message,
        details: error.validation.map((v: any) => ({
          field: v.instancePath || 'body',
          message: v.message,
        })),
      });
    }

    // Default: generic 500 error (no leak!)
    return reply.status(500).send({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    });
  });
}

function isPrismaError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof (error as any).code === 'string' &&
    (error as any).code?.startsWith('P')
  );
}

function handlePrismaError(error: PrismaError, reply: any) {
  const prismaErrorMessages: Record<string, string> = {
    P2002: 'A record with this value already exists',
    P2025: 'Record not found',
    P2003: 'Foreign key constraint violation',
    P2004: 'A constraint violation occurred',
    P2010: 'Raw database operation failed',
    P2011: 'Null constraint violation',
    P2012: 'Missing required value',
    P2013: 'Missing required argument',
    P2014: 'Relation violation',
    P2015: 'Related record not found',
    P2016: 'Query interpretation error',
    P2017: 'Records not connected',
    P2018: 'Required connected records not found',
    P2019: 'Input error',
    P2020: 'Value out of range',
    P2021: 'Table does not exist',
    P2022: 'Column does not exist',
    P2023: 'Uniforms error',
    P2024: 'Connection timeout',
    P2026: 'Current connection does not support features',
    P2027: 'Multiple errors occurred',
    P2028: 'Transaction API error',
    P2029: 'Query parameter limit exceeded',
    P2030: 'Full-text index not found',
    P2033: 'Number too large for integer',
    P2034: 'Transaction write conflict',
    P2036: 'External connector error',
    P2037: 'Too many database connections',
  };

  const safeMessage = prismaErrorMessages[error.code!] || 'Database operation failed';

  return reply.status(400).send({
    error: 'DATABASE_ERROR',
    message: safeMessage,
    code: error.code,
  });
}
