import {
  Catch,
  HttpException,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ZodError } from 'zod';
import type { Response } from 'express';
@Catch()
export class ErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    let status = 500,
      code = 'INTERNAL_ERROR',
      message = 'No se pudo completar la operación.';
    if (error instanceof ZodError) {
      status = 422;
      code = 'VALIDATION_ERROR';
      message = 'Revisá los campos ingresados.';
    } else if (error instanceof HttpException) {
      status = error.getStatus();
      const body = error.getResponse();
      if (typeof body === 'object' && body && 'code' in body) {
        code = String(body.code);
        message = code;
      } else {
        code = status === 404 ? 'NOT_FOUND' : 'REQUEST_REJECTED';
      }
    }
    const cause =
      error && typeof error === 'object' && 'cause' in error
        ? error.cause
        : error;
    if (error && typeof error === 'object' && 'type' in error) {
      if (error.type === 'entity.too.large') {
        status = 413;
        code = 'REQUEST_TOO_LARGE';
      }
      if (error.type === 'entity.parse.failed') {
        status = 400;
        code = 'INVALID_JSON';
      }
    }
    if (cause && typeof cause === 'object' && 'code' in cause) {
      const c = String(cause.code);
      if (c === '23505') {
        status = 409;
        code = 'ALREADY_EXISTS';
      }
      if (c === '23503' || c === '23514') {
        status = 422;
        code = 'INVALID_REFERENCE_OR_VALUE';
      }
      if (c === '55P03' || c === '40P01' || c === '40001') {
        status = 409;
        code = 'RETRY_SAME_ATTEMPT';
      }
      if (c === 'ECONNREFUSED') {
        status = 503;
        code = 'DATABASE_UNAVAILABLE';
      }
    }
    if (status === 429) response.setHeader('Retry-After', '60');
    response.status(status).json({
      code,
      message,
      requestId: randomUUID(),
      ...(error instanceof ZodError
        ? {
            fieldErrors: error.issues.map((i) => ({
              field: i.path.join('.'),
              message: i.message,
            })),
          }
        : {}),
    });
  }
}
