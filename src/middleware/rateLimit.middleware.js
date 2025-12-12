const { errorResponse } = require("../utils/response.util");

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map();

// Clean up old entries periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    // Remove entries older than 1 hour
    if (now - value.timestamp > 3600000) {
      rateLimitStore.delete(key);
    }
  }
}, 300000); // Clean up every 5 minutes

/**
 * Rate limiting middleware
 * @param {number} maxRequests - Maximum number of requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @param {string} keyPrefix - Prefix for the rate limit key
 */
const rateLimit = (
  maxRequests = 10,
  windowMs = 60000,
  keyPrefix = "rate-limit"
) => {
  return (req, res, next) => {
    try {
      // Create a unique key based on IP address and endpoint
      const clientId = req.ip || req.connection.remoteAddress;
      const key = `${keyPrefix}:${clientId}:${req.path}`;

      const now = Date.now();
      const windowStart = now - windowMs;

      // Get or initialize the rate limit data for this key
      let rateLimitData = rateLimitStore.get(key);

      if (!rateLimitData) {
        rateLimitData = {
          count: 0,
          timestamp: now,
        };
        rateLimitStore.set(key, rateLimitData);
      }

      // Reset count if outside the time window
      if (rateLimitData.timestamp < windowStart) {
        rateLimitData.count = 0;
        rateLimitData.timestamp = now;
      }

      // Increment request count
      rateLimitData.count++;

      // Check if limit has been exceeded
      if (rateLimitData.count > maxRequests) {
        // Calculate reset time
        const resetTime = new Date(rateLimitData.timestamp + windowMs);

        return res.status(429).json({
          success: false,
          message: "Too many requests",
          error: `Rate limit exceeded. Try again after ${resetTime.toISOString()}`,
          retry_after: Math.ceil(
            (rateLimitData.timestamp + windowMs - now) / 1000
          ),
        });
      }

      // Add rate limit headers
      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader(
        "X-RateLimit-Remaining",
        Math.max(0, maxRequests - rateLimitData.count)
      );
      res.setHeader(
        "X-RateLimit-Reset",
        new Date(rateLimitData.timestamp + windowMs).toISOString()
      );

      next();
    } catch (error) {
      console.error("Rate limiting error:", error);
      // If rate limiting fails, allow the request to proceed
      next();
    }
  };
};

/**
 * Specific rate limiters for payment endpoints
 */
const paymentRateLimit = rateLimit(5, 300000, "payment"); // 5 requests per 5 minutes
const callbackRateLimit = rateLimit(20, 60000, "callback"); // 20 requests per minute

module.exports = {
  rateLimit,
  paymentRateLimit,
  callbackRateLimit,
};
