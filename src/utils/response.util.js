/**
 * Standardized response utility for API endpoints
 */

// Success response
const successResponse = (res, message, data = null, statusCode = 200) => {
  const response = {
    success: true,
    message: message,
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

// Error response
const errorResponse = (res, message, error = null, statusCode = 500) => {
  const response = {
    success: false,
    message: message,
  };

  if (error !== null) {
    response.error = error;
  }

  return res.status(statusCode).json(response);
};

// Validation error response
const validationErrorResponse = (res, errors) => {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: errors,
  });
};

// Unauthorized response
const unauthorizedResponse = (res, message = "Unauthorized access") => {
  return res.status(401).json({
    success: false,
    message: message,
  });
};

// Forbidden response
const forbiddenResponse = (res, message = "Access forbidden") => {
  return res.status(403).json({
    success: false,
    message: message,
  });
};

// Not found response
const notFoundResponse = (res, message = "Resource not found") => {
  return res.status(404).json({
    success: false,
    message: message,
  });
};

// Conflict response
const conflictResponse = (res, message = "Resource conflict") => {
  return res.status(409).json({
    success: false,
    message: message,
  });
};

// Service unavailable response
const serviceUnavailableResponse = (res, message = "Service unavailable") => {
  return res.status(503).json({
    success: false,
    message: message,
  });
};

module.exports = {
  successResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  conflictResponse,
  serviceUnavailableResponse,
};
