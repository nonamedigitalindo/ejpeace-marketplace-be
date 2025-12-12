const index = (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the Express.js Backend API",
    data: {
      version: "1.0.0",
      description: "This is the base API endpoint",
    },
  });
};

const welcome = (req, res) => {
  res.status(200).json({
    success: true,
    message: "Hello and welcome to our API!",
    data: {
      author: "Your Name",
      timestamp: new Date().toISOString(),
    },
  });
};

module.exports = {
  index,
  welcome,
};
