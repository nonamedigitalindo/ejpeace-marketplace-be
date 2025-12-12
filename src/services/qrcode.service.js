const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");

const uploadDir = path.join(__dirname, "../../uploads/qr");

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const generatePurchaseQR = async (purchaseId) => {
  try {
    // Data to be encoded in QR
    // Updated URL as per user request
    const qrData = `https://ejpeaceentertainment.com/ejpeace/qr-scan?purchaseId=${purchaseId}`;

    // Generate Data URL (base64)
    const dataURL = await QRCode.toDataURL(qrData);

    const filename = `qr_purchase_${purchaseId}.png`;
    const filepath = path.join(uploadDir, filename);

    await QRCode.toFile(filepath, qrData);

    return {
      dataURL,
      filepath,
      filename,
      publicUrl: `/api/v1/uploads/qr/${filename}`,
    };
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
};

module.exports = {
  generatePurchaseQR,
};
