// URL Utility Functions

/**
 * Get the appropriate base URL based on the NODE_ENV environment variable
 * @returns {string} The base URL for frontend callbacks
 */
const getBaseURL = () => {
  // If FRONTEND_URL is explicitly set, use it
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }

  // If BASE_URL is explicitly set, use it
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }

  // Determine URL based on NODE_ENV
  if (process.env.NODE_ENV === "production") {
    return "http://ejpeaceentertainment.com";
  } else {
    // Default to development URL
    return "http://localhost:5173";
  }
};

module.exports = {
  getBaseURL,
};
