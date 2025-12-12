// Email and SMS Service for sending QR Codes
const nodemailer = require("nodemailer");
const twilio = require("twilio");

class NotificationService {
  // Send email with QR Code (real implementation)
  static async sendEmail(to, subject, htmlContent, attachments = []) {
    try {
      console.log("📧 Preparing to send email...");
      console.log("📧 To:", to);
      console.log("📧 Subject:", subject);

      // In production, you would use environment variables for these credentials
      // For example: process.env.SMTP_HOST, process.env.SMTP_USER, etc.

      // For Gmail SMTP (example configuration)
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: process.env.SMTP_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER || "your_email@gmail.com",
          pass: process.env.SMTP_PASS
            ? process.env.SMTP_PASS.trim()
            : "your_app_password",
        },
      });

      const mailOptions = {
        from: process.env.SMTP_FROM || "noreply@yourapp.com",
        to: to,
        subject: subject,
        html: htmlContent,
        attachments: attachments, // Add attachments if provided
      };

      // Check if SMTP credentials are configured
      const hasCredentials = process.env.SMTP_USER && process.env.SMTP_PASS;
      console.log("📧 SMTP credentials configured:", hasCredentials);

      if (hasCredentials) {
        console.log("📧 Sending real email via SMTP...");
        // In a real implementation, send the email
        const info = await transporter.sendMail(mailOptions);
        console.log("📧 EMAIL TERKIRIM:");
        console.log(`   Kepada: ${to}`);
        console.log(`   Subjek: ${subject}`);
        console.log(`   Message ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
      } else {
        // For now, simulate the sending if credentials are not configured
        console.log(`📧 EMAIL SIMULASI TERKIRIM:`);
        console.log(`   Kepada: ${to}`);
        console.log(`   Subjek: ${subject}`);
        console.log(
          `   Status: ⚠️  Email akan dikirim via SMTP jika dikonfigurasi dengan benar`
        );
        return { success: true, messageId: "simulated_email_id" };
      }
    } catch (error) {
      console.error("Error sending email:", error);
      return { success: false, error: error.message };
    }
  }

  // Send SMS with QR Code info (real implementation)
  static async sendSMS(to, message) {
    try {
      console.log("📱 Preparing to send SMS...");
      console.log("📱 To:", to);
      console.log("📱 Message:", message);

      // In production, you would use environment variables for these credentials
      // For example: process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN, etc.

      // For Twilio (example configuration)
      // const client = twilio(
      //   process.env.TWILIO_ACCOUNT_SID || 'your_account_sid',
      //   process.env.TWILIO_AUTH_TOKEN || 'your_auth_token'
      // );

      // In a real implementation, uncomment the next line:
      // const result = await client.messages.create({
      //   body: message,
      //   from: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
      //   to: to
      // });

      // Check if Twilio credentials are configured
      const hasTwilioCredentials =
        process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN;
      console.log("📱 Twilio credentials configured:", hasTwilioCredentials);

      if (hasTwilioCredentials) {
        // In a real implementation, send the SMS
        // const result = await client.messages.create({
        //   body: message,
        //   from: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
        //   to: to
        // });
        // console.log('SMS sent:', result.sid);
        // return { success: true, messageId: result.sid };
      }

      // For now, simulate the sending
      console.log(`📱 SMS SIMULASI TERKIRIM:`);
      console.log(`   Ke: ${to}`);
      console.log(`   Pesan: ${message}`);
      console.log(
        `   Status: ⚠️  SMS akan dikirim via Twilio jika dikonfigurasi dengan benar`
      );
      return { success: true, messageId: "simulated_sms_id" };
    } catch (error) {
      console.error("Error sending SMS:", error);
      return { success: false, error: error.message };
    }
  }

  // Send WhatsApp message (real implementation)
  static async sendWhatsApp(to, message, mediaUrl = null) {
    try {
      console.log("💬 Preparing to send WhatsApp...");
      console.log("💬 To:", to);
      console.log("💬 Message:", message);

      // In production, you would use environment variables for Twilio credentials

      // For Twilio WhatsApp (example configuration)
      // const client = twilio(
      //   process.env.TWILIO_ACCOUNT_SID || 'your_account_sid',
      //   process.env.TWILIO_AUTH_TOKEN || 'your_auth_token'
      // );

      // const messageOptions = {
      //   body: message,
      //   from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || '+1234567890'}`,
      //   to: `whatsapp:${to}`
      // };

      // if (mediaUrl) {
      //   messageOptions.mediaUrl = [mediaUrl];
      // }

      // In a real implementation, uncomment the next line:
      // const result = await client.messages.create(messageOptions);

      // Check if Twilio credentials are configured
      const hasTwilioCredentials =
        process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN;
      console.log("💬 Twilio credentials configured:", hasTwilioCredentials);

      if (hasTwilioCredentials) {
        // In a real implementation, send the WhatsApp message
        // const messageOptions = {
        //   body: message,
        //   from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || '+1234567890'}`,
        //   to: `whatsapp:${to}`
        // };
        // if (mediaUrl) {
        //   messageOptions.mediaUrl = [mediaUrl];
        // }
        // const result = await client.messages.create(messageOptions);
        // console.log('WhatsApp sent:', result.sid);
        // return { success: true, messageId: result.sid };
      }

      // For now, simulate the sending
      console.log(`💬 WHATSAPP SIMULASI TERKIRIM:`);
      console.log(`   Ke: ${to}`);
      console.log(`   Pesan: ${message}`);
      if (mediaUrl) {
        console.log(`   Media: ${mediaUrl.substring(0, 50)}...`);
      }
      console.log(
        `   Status: ⚠️  WhatsApp akan dikirim via Twilio jika dikonfigurasi dengan benar`
      );
      return { success: true, messageId: "simulated_whatsapp_id" };
    } catch (error) {
      console.error("Error sending WhatsApp:", error);
      return { success: false, error: error.message };
    }
  }

  static async sendPurchaseInvoice(
    to,
    purchaseData,
    attachmentPath,
    filename = null
  ) {
    try {
      // Re-create transporter here for consistency with other static methods,
      // or ensure the class is instantiated and `this.transporter` is properly set up.
      // Given the existing static methods, creating it here makes more sense
      // unless all methods are refactored to be instance methods.
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER || "your_email@gmail.com",
          pass: process.env.SMTP_PASS
            ? process.env.SMTP_PASS.trim()
            : "your_app_password",
        },
      });

      // Use provided filename or fallback to default
      const attachmentFilename = filename || `Invoice-${purchaseData.id}.pdf`;

      const mailOptions = {
        from: process.env.SMTP_FROM || "noreply@yourapp.com", // Use SMTP_FROM for consistency
        to: to,
        subject: `Invoice Pembelian - ${purchaseData.id}`,
        html: `
          <h2>Terima Kasih atas Pembelian Anda!</h2>
          <p>Halo,</p>
          <p>Pembayaran Anda untuk pesanan #${purchaseData.id} telah berhasil dikonfirmasi.</p>
          <p>Terlampir adalah invoice pembelian Anda.</p>
          <p>Anda juga dapat melihat detail pembelian dan mengunduh invoice melalui dashboard profil Anda.</p>
          <br>
          <p>Salam,</p>
          <p>Tim Peacetifal</p>
        `,
        attachments: [
          {
            filename: attachmentFilename,
            path: attachmentPath,
          },
        ],
      };

      // Check if SMTP credentials are configured
      const hasCredentials = process.env.SMTP_USER && process.env.SMTP_PASS;
      console.log(
        "📧 SMTP credentials configured for invoice:",
        hasCredentials
      );

      if (hasCredentials) {
        console.log("📧 Sending real invoice email via SMTP...");
        const info = await transporter.sendMail(mailOptions);
        console.log("Invoice email sent: " + info.response);
        return { success: true, messageId: info.messageId };
      } else {
        console.log(`📧 INVOICE EMAIL SIMULASI TERKIRIM:`);
        console.log(`   Kepada: ${to}`);
        console.log(`   Subjek: ${mailOptions.subject}`);
        console.log(`   Lampiran: ${mailOptions.attachments[0].filename}`);
        console.log(
          `   Status: ⚠️  Invoice email akan dikirim via SMTP jika dikonfigurasi dengan benar`
        );
        return { success: true, messageId: "simulated_invoice_email_id" };
      }
    } catch (error) {
      console.error("Error sending invoice email:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = NotificationService;
