# Standardized API Response Format

All API endpoints in this application follow a consistent response format to ensure predictable and uniform responses across all services.

## Success Response Format

```json
{
  "success": true,
  "message": "Description of the action performed",
  "data": {}
}
```

### Fields:

- `success`: Boolean indicating if the request was successful
- `message`: Human-readable description of the action performed
- `data`: Optional payload containing the response data

### HTTP Status Codes:

- `200`: Successful GET, PUT, DELETE requests
- `201`: Successful POST requests (resource created)
- `204`: Successful requests with no content to return

## Error Response Format

```json
{
  "success": false,
  "message": "Description of what went wrong",
  "error": "Detailed error message"
}
```

### Fields:

- `success`: Boolean indicating if the request failed
- `message`: Human-readable description of what went wrong
- `error`: Optional detailed error message for debugging

### HTTP Status Codes:

- `400`: Bad Request - Invalid input or validation errors
- `401`: Unauthorized - Authentication required
- `403`: Forbidden - Access denied
- `404`: Not Found - Resource not found
- `409`: Conflict - Resource conflict (e.g., duplicate entry)
- `500`: Internal Server Error - Unexpected server error
- `503`: Service Unavailable - Temporary service unavailability

## Specialized Response Types

### Validation Error Response

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["Array of validation error messages"]
}
```

### Not Found Response

```json
{
  "success": false,
  "message": "Resource not found"
}
```

## Example Responses

### Successful User Registration (201 Created)

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "created_at": "2023-01-01T00:00:00.000Z"
  }
}
```

### Successful Login (200 OK)

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "johndoe",
      "email": "john@example.com"
    }
  }
}
```

### Resource Not Found (404 Not Found)

```json
{
  "success": false,
  "message": "User not found"
}
```

### Validation Error (400 Bad Request)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["Email is required", "Password must be at least 8 characters"]
}
```

### Server Error (500 Internal Server Error)

```json
{
  "success": false,
  "message": "Failed to retrieve users",
  "error": "Database connection failed"
}
```

## Response Utility Functions

The application provides utility functions in `src/utils/response.util.js` to easily generate standardized responses:

- `successResponse(res, message, data, statusCode)` - Success responses
- `errorResponse(res, message, error, statusCode)` - Error responses
- `validationErrorResponse(res, errors)` - Validation error responses
- `unauthorizedResponse(res, message)` - Unauthorized responses
- `forbiddenResponse(res, message)` - Forbidden responses
- `notFoundResponse(res, message)` - Not found responses
- `conflictResponse(res, message)` - Conflict responses
- `serviceUnavailableResponse(res, message)` - Service unavailable responses

All controllers should use these utility functions to ensure consistent response formatting across the application.
