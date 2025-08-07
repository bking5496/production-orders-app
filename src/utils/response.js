// Standardized API Response Utilities

/**
 * Standard response formats for consistent API responses
 */
class ResponseUtils {
  
  /**
   * Success response with data
   */
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Error response
   */
  static error(res, message = 'Internal Server Error', statusCode = 500, details = null) {
    return res.status(statusCode).json({
      success: false,
      error: message,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Validation error response
   */
  static validationError(res, errors, message = 'Validation failed') {
    return res.status(400).json({
      success: false,
      error: message,
      validation_errors: errors,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Not found response
   */
  static notFound(res, resource = 'Resource', message = null) {
    const errorMessage = message || `${resource} not found`;
    return res.status(404).json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Unauthorized response
   */
  static unauthorized(res, message = 'Unauthorized access') {
    return res.status(401).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Forbidden response
   */
  static forbidden(res, message = 'Forbidden access') {
    return res.status(403).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Created response
   */
  static created(res, data = null, message = 'Resource created successfully') {
    return res.status(201).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * No content response
   */
  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * Paginated response
   */
  static paginated(res, data, pagination, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.limit),
        hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
        hasPrevious: pagination.page > 1
      },
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Express middleware to add response utilities to res object
 */
const addResponseUtils = (req, res, next) => {
  res.success = (data, message, statusCode) => ResponseUtils.success(res, data, message, statusCode);
  res.error = (message, statusCode, details) => ResponseUtils.error(res, message, statusCode, details);
  res.validationError = (errors, message) => ResponseUtils.validationError(res, errors, message);
  res.notFound = (resource, message) => ResponseUtils.notFound(res, resource, message);
  res.unauthorized = (message) => ResponseUtils.unauthorized(res, message);
  res.forbidden = (message) => ResponseUtils.forbidden(res, message);
  res.created = (data, message) => ResponseUtils.created(res, data, message);
  res.noContent = () => ResponseUtils.noContent(res);
  res.paginated = (data, pagination, message) => ResponseUtils.paginated(res, data, pagination, message);
  
  next();
};

module.exports = {
  ResponseUtils,
  addResponseUtils
};