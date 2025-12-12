const QRCodeService = require("./src/services/qrcode.service");

// Test the updated QR code service
async function testQRCodeService() {
  try {
    console.log("Testing QR Code Service with new URL format...");

    const purchaseId = 201;
    const result = await QRCodeService.generatePurchaseQR(purchaseId);

    console.log("QR Code generated successfully!");
    console.log("Filename:", result.filename);
    console.log("Public URL:", result.publicUrl);

    // Check if the file was created
    const fs = require("fs");
    const path = require("path");
    const filePath = path.join(__dirname, "uploads/qr", result.filename);

    if (fs.existsSync(filePath)) {
      console.log("QR Code file created successfully at:", filePath);
    } else {
      console.log("QR Code file was not found at:", filePath);
    }
  } catch (error) {
    console.error("Error testing QR Code Service:", error);
  }
}

testQRCodeService();
