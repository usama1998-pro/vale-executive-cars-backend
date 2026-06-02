import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { API_MESSAGES } from '../messages/api-messages';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<{ method?: string; url?: string }>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const raw =
      exception instanceof HttpException
        ? exception.getResponse()
        : undefined;

    const message = this.resolveMessage(status, raw, exception);

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} → ${status}: ${message}`);
    }

    const errorLabel =
      exception instanceof HttpException
        ? (exception as HttpException).name
        : 'Error';

    const data = this.extractErrorData(raw);

    response.status(status).json({
      success: false,
      message,
      statusCode: status,
      error: errorLabel,
      ...(data !== undefined ? { data } : {}),
    });
  }

  private resolveMessage(
    status: number,
    raw: string | object | undefined,
    exception: unknown,
  ): string {
    const fromException = this.extractRawMessage(raw);
    if (fromException && !this.looksInternal(fromException)) {
      return fromException;
    }

    if (status === HttpStatus.BAD_REQUEST) {
      return API_MESSAGES.generic.validation;
    }
    if (status === HttpStatus.UNAUTHORIZED) {
      return API_MESSAGES.auth.unauthorized;
    }
    if (status === HttpStatus.FORBIDDEN) {
      return API_MESSAGES.auth.forbidden;
    }
    if (status === HttpStatus.NOT_FOUND) {
      return API_MESSAGES.generic.notFound;
    }
    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      const fromException = this.extractRawMessage(raw);
      if (
        fromException &&
        !this.looksInternal(fromException) &&
        !fromException.startsWith('ThrottlerException')
      ) {
        return fromException;
      }
      return API_MESSAGES.generic.throttled();
    }
    if (status >= 500) {
      return API_MESSAGES.generic.server;
    }

    if (exception instanceof Error && exception.message) {
      return exception.message;
    }

    return 'Request could not be completed. Please try again.';
  }

  private extractErrorData(raw: string | object | undefined): unknown | undefined {
    if (!raw || typeof raw !== 'object') {
      return undefined;
    }
    const body = raw as { data?: unknown };
    return body.data !== undefined ? body.data : undefined;
  }

  private extractRawMessage(raw: string | object | undefined): string | null {
    if (!raw) {
      return null;
    }
    if (typeof raw === 'string') {
      return raw;
    }
    const body = raw as { message?: unknown };
    if (Array.isArray(body.message)) {
      return body.message.map(String).join('. ');
    }
    if (typeof body.message === 'string') {
      return body.message;
    }
    return null;
  }

  private looksInternal(message: string): boolean {
    const lower = message.toLowerCase();
    return (
      lower.includes('prisma') ||
      lower.includes('econnrefused') ||
      lower.includes('stack') ||
      lower.includes('internal server')
    );
  }
}
