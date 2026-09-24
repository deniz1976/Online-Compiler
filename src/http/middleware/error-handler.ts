import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError, NotFoundError } from '../../errors/app-error';

interface HttpError {
  status: number;
  expose: boolean;
  type?: string;
  message: string;
}

const HTTP_ERROR_CODES: Record<string, string> = {
  'entity.parse.failed': 'INVALID_JSON',
  'entity.too.large': 'PAYLOAD_TOO_LARGE',
};

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new NotFoundError('Route not found'));
};

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined && { details: error.details }),
      },
    });
    return;
  }

  if (isExposableHttpError(error)) {
    res.status(error.status).json({
      error: {
        code: (error.type && HTTP_ERROR_CODES[error.type]) ?? 'BAD_REQUEST',
        message: error.message,
      },
    });
    return;
  }

  req.log.error({ err: error }, 'Unhandled error');
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
};

function isExposableHttpError(error: unknown): error is HttpError {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as Partial<HttpError>;
  return (
    candidate.expose === true &&
    typeof candidate.status === 'number' &&
    candidate.status >= 400 &&
    candidate.status < 500
  );
}
