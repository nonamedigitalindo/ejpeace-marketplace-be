const axios = require("axios");

// Test data
const testData = {
  purchase_data: {
    product_id: 1,
    total_amount: 150000,
    description: "Test Product",
  },
  shipping_address: {
    full_name: "Test User",
    phone: "08123456789",
    address_line1: "Test Address",
    city: "Test City",
    postal_code: "12345",
  },
};

// Make the request
axios
  .post("http://localhost:3000/api/v1/purchases/direct", testData, {
    headers: {
      Authorization:
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJpYXQiOjE3MzI4Njg2MzksImV4cCI6MTczMjk1NTAzOX0.5V5qKqF8Q8J8Q8J8Q8J8Q8J8Q8J8Q8J8Q8J8Q8J8Q8J8",
      "Content-Type": "application/json",
    },
  })
  .then((response) => {
    console.log("Response:", response.data);
  })
  .catch((error) => {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
  });
