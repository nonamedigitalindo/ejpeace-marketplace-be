const BarcodeRepository = require("../models/barcode.repository");
const QRCode = require("qrcode");

class BarcodeService {
  // Generate a unique barcode data string
  static generateBarcodeData(ticketId, userId, eventId) {
    // Create a unique barcode using ticket info and timestamp
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, "0");
    return `TICKET:${ticketId}:USER:${userId}:EVENT:${eventId}:${timestamp}${random}`;
  }

  // Generate QR Code image from barcode data
  static async generateQRCode(barcodeData) {
    try {
      // Generate QR Code as data URL (can be used in HTML img tags)
      const qrCodeDataUrl = await QRCode.toDataURL(barcodeData);
      return qrCodeDataUrl;
    } catch (error) {
      console.error("Error generating QR Code:", error);
      return null;
    }
  }

  // Create a new barcode record
  static async createBarcode(ticketId, userId, eventId) {
    try {
      // Generate unique barcode data
      const barcodeData = this.generateBarcodeData(ticketId, userId, eventId);

      // Generate QR code image
      const qrCodeImage = await this.generateQRCode(barcodeData);

      // Create barcode record in database
      const barcodeId = await BarcodeRepository.create({
        ticket_id: ticketId,
        event_id: eventId,
        barcode_data: barcodeData,
        qr_code_image: qrCodeImage,
        status: "active",
      });

      return {
        id: barcodeId,
        ticket_id: ticketId,
        event_id: eventId,
        barcode_data: barcodeData,
        qr_code_image: qrCodeImage,
        status: "active",
      };
    } catch (error) {
      throw new Error("Failed to create barcode: " + error.message);
    }
  }

  // Get barcode by ticket ID
  static async getBarcodeByTicketId(ticketId) {
    try {
      const barcode = await BarcodeRepository.findByTicketId(ticketId);
      return barcode ? barcode.toJSON() : null;
    } catch (error) {
      throw new Error("Failed to retrieve barcode: " + error.message);
    }
  }

  // Validate barcode for check-in
  static async validateForCheckin(barcodeData) {
    try {
      const result = await BarcodeRepository.isValidForCheckin(barcodeData);
      return result;
    } catch (error) {
      throw new Error("Failed to validate barcode: " + error.message);
    }
  }

  // Deactivate barcode after check-in
  static async deactivateBarcode(barcodeId) {
    try {
      const updated = await BarcodeRepository.update(barcodeId, {
        status: "inactive",
      });

      if (!updated) {
        throw new Error("Failed to deactivate barcode");
      }

      return true;
    } catch (error) {
      throw new Error("Failed to deactivate barcode: " + error.message);
    }
  }
}

module.exports = BarcodeService;
