// Error Handling Middleware
const { ResponseUtils } = require('../utils/response');

/**
 * Async handler wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    user: req.user?.username || 'Anonymous',
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return ResponseUtils.validationError(res, err.details || [], err.message);
  }

  if (err.name === 'UnauthorizedError' || err.code === 'INVALID_TOKEN') {
    return ResponseUtils.unauthorized(res, err.message);
  }

  if (err.name === 'ForbiddenError' || err.code === 'INSUFFICIENT_PERMISSIONS') {
    return ResponseUtils.forbidden(res, err.message);
  }

  if (err.name === 'NotFoundError') {
    return ResponseUtils.notFound(res, err.resource, err.message);
  }

  // Database errors
  if (err.code && err.code.startsWith('23')) { // PostgreSQL constraint violations
    if (err.code === '23505') { // Unique violation
      return ResponseUtils.error(res, 'Duplicate entry found', 409, {
        constraint: err.constraint,
        detail: err.detail
      });
    }
    if (err.code === '23503') { // Foreign key violation
      return ResponseUtils.error(res, 'Referenced record not found', 409, {
        constraint: err.constraint,
        detail: err.detail
      });
    }
  }

  // Rate limiting errors
  if (err.type === 'entity.too.large') {
    return ResponseUtils.error(res, 'Request payload too large', 413);
  }

  // Default error response
  const isDevelopment = process.env.NODE_ENV === 'development';
  const message = isDevelopment ? err.message : 'Internal Server Error';
  const details = isDevelopment ? { stack: err.stack } : null;

  return ResponseUtils.error(res, message, 500, details);
};

/**
 * 404 handler for unmatched routes
 */
const notFoundHandler = (req, res) => {
  ResponseUtils.notFound(res, 'Endpoint', `Route ${req.method} ${req.url} not found`);
};

/**
 * Create custom error classes
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.details = details;
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource', message = null) {
    super(message || `${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
    this.resource = resource;
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden access') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

module.exports = {
  asyncHandler,
  errorHandler,
  notFoundHandler,
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError
};