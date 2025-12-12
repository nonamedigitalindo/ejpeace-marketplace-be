const QRCodeService = require("./src/services/qrcode.service");

async function testQRCodeUpdate() {
  try {
    console.log("Testing updated QR Code Generation with purchaseId 233...");

    const result = await QRCodeService.generatePurchaseQR(233);

    console.log("✅ QR Code generated successfully!");
    console.log("📁 Filename:", result.filename);
    console.log("🔗 Public URL:", result.publicUrl);

    // Clean up test file
    const fs = require("fs");
    const path = require("path");
    const fullPath = path.join(__dirname, "uploads/qr", result.filename);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log("🧹 Cleaned up test file");
    }
  } catch (error) {
    console.error("❌ Error generating QR code:", error.message);
  }
}

testQRCodeUpdate();
