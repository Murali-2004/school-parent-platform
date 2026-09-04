// ---------------------------------------------------------------------------
// notFound + errorHandler — the last two middlewares mounted on the app.
// ---------------------------------------------------------------------------
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { isProd } from '../../config/env.js';

export function notFound(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = err.status || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details;

  // --- Normalise common non-ApiError errors --------------------------------
  if (err instanceof mongoose.Error.ValidationError) {
    status = 422;
    message = 'Validation failed';
    details = Object.fromEntries(
      Object.entries(err.errors).map(([k, v]) => [k, v.message]),
    );
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid value for "${err.path}"`;
  } else if (err?.code === 11000) {
    status = 409;
    message = 'Duplicate value violates a unique constraint';
    details = err.keyValue;
  } else if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
    status = 401;
    message = 'Invalid or expired token';
  } else if (/\[tenantPlugin\]/.test(err?.message || '')) {
    // A missing-schoolId guard tripped: this is a server bug, not the client's
    // fault, but we surface it loudly in non-prod to catch it in development.
    status = 500;
    message = isProd ? 'Internal Server Error' : err.message;
  }

  const isServerError = status >= 500;

  if (isServerError) {
    // eslint-disable-next-line no-console
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  }

  const body = {
    error: {
      message: isServerError && isProd ? 'Internal Server Error' : message,
      status,
    },
  };
  if (details !== undefined && !(isServerError && isProd)) body.error.details = details;
  if (!isProd && isServerError) body.error.stack = err.stack;

  res.status(status).json(body);
}
