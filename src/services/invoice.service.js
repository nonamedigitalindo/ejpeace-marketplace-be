const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const ProductRepository = require("../models/product.repository");
const qrCodePath = path.join(__dirname, "../../uploads/qr");

const uploadDir = path.join(__dirname, "../../uploads/invoices");

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(amount);
};

const generateInvoicePDF = async (
  purchase,
  cartItems,
  user,
  orderAddress = null
) => {
  console.log(
    "Generating invoice with cart items:",
    JSON.stringify(cartItems, null, 2)
  );
  console.log(
    "Generating invoice with orderAddress:",
    JSON.stringify(orderAddress, null, 2)
  );

  // --- PREPARE DATA (ASYNC) ---
  // Handle items - prefer cart items, fallback to purchase data
  let itemsToRender = [];

  if (cartItems && cartItems.length > 0) {
    itemsToRender = cartItems.map((item) => ({
      name: item.product_name,
      size: item.product_size,
      category: item.product_category,
      quantity: item.quantity,
      price: item.product_price,
      total: item.product_price * item.quantity,
    }));
  } else {
    // Fallback: Query product from database using orderAddress.product_id or purchase.product_id
    const productId = orderAddress?.product_id || purchase.product_id;

    if (productId) {
      try {
        const product = await ProductRepository.findById(productId);

        if (product) {
          // Fetch vouchers to get discount amount safely
          let totalDiscount = 0;
          try {
            const VoucherRepository = require("../models/voucher.repository");
            const vouchers = await VoucherRepository.getVouchersForPurchase(
              purchase.id
            );
            console.log(
              `[InvoiceService] Found ${vouchers.length} vouchers for purchase ${purchase.id}`
            );

            if (vouchers && Array.isArray(vouchers)) {
              totalDiscount = vouchers.reduce(
                (sum, v) => sum + (parseFloat(v.discount_amount) || 0),
                0
              );
              console.log(`[InvoiceService] Total discount: ${totalDiscount}`);
            }
          } catch (vErr) {
            console.error(
              "Error fetching vouchers for invoice quantity calc:",
              vErr
            );
          }

          const productPrice = parseFloat(product.getDiscountedPrice());
          // Recover original amount to calculate quantity accurately
          const originalAmount =
            parseFloat(purchase.total_amount) + totalDiscount;

          console.log(
            `[InvoiceService] Calc Quantity: Total=${purchase.total_amount}, Disc=${totalDiscount}, Orig=${originalAmount}, Price=${productPrice}`
          );

          // Calculate quantity: originalAmount / price
          // Use Math.round to handle floating point issues and cases like 2.5 -> 3
          let quantity = Math.round(originalAmount / productPrice);
          if (quantity < 1) quantity = 1;

          itemsToRender.push({
            name: product.name,
            size: product.size,
            category: product.category,
            quantity: quantity,
            price: productPrice,
            total: purchase.total_amount, // Use actual paid amount for total
          });
        } else {
          // Product not found in database
          itemsToRender.push({
            name: `Product ID: ${productId} (Not Found)`,
            quantity: 1,
            price: purchase.total_amount,
            total: purchase.total_amount,
          });
        }
      } catch (error) {
        console.error("Error fetching product for invoice:", error);
        itemsToRender.push({
          name: "Product (Error loading details)",
          quantity: 1,
          price: purchase.total_amount,
          total: purchase.total_amount,
        });
      }
    } else {
      // No product info available
      itemsToRender.push({
        name: "Product information unavailable",
        quantity: 1,
        price: purchase.total_amount,
        total: purchase.total_amount,
      });
    }
  }

  // --- GENERATE PDF (SYNC/STREAM) ---
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });

      // --- Customer Info ---
      const customerName =
        orderAddress?.full_name || user.username || user.email;
      const customerEmail = orderAddress?.email || user.email;

      // Generate filename with buyer name and date
      // Format: receipt.ejpeace - buyer_name - date.pdf
      const sanitizeFilename = (str) => {
        return str.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_{2,}/g, "_");
      };
      const formattedDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const sanitizedName = sanitizeFilename(customerName);
      const filename = `receipt.ejpeace - ${sanitizedName} - ${formattedDate}.pdf`;
      const filepath = path.join(uploadDir, filename);
      const publicUrl = `/api/v1/uploads/invoices/${filename}`;

      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // --- Header ---
      doc
        .fontSize(20)
        .text("eJPeace", { align: "center" })
        .fontSize(10)
        .text("Official Merchandise & Ticket Store", { align: "center" })
        .moveDown();
      doc
        .fontSize(12)
        .text(`Receipt Number: ${purchase.payment_id || purchase.id}`, {
          align: "right",
        })
        .text(`Date: ${new Date().toLocaleDateString("id-ID")}`, {
          align: "right",
        })
        .text(`Status: ${purchase.status.toUpperCase()}`, { align: "right" })
        .moveDown();

      doc
        .fontSize(12)
        .text(`Bill To:`, { underline: true })
        .fontSize(10)
        .text(customerName)
        .text(customerEmail);

      // --- Shipping Address (if available) ---
      if (orderAddress) {
        doc.moveDown(0.5);
        doc
          .fontSize(12)
          .text(`Ship To:`, { underline: true })
          .fontSize(10)
          .text(orderAddress.address_line1);

        if (orderAddress.address_line2) {
          doc.text(orderAddress.address_line2);
        }

        doc.text(
          `${orderAddress.city}, ${orderAddress.state || ""} ${
            orderAddress.postal_code
          }`
        );
        doc.text(orderAddress.country || "Indonesia");
        doc.text(`Phone: ${orderAddress.phone}`);
      }

      doc.moveDown();

      // --- Table Header ---
      const tableTop = doc.y + 10;
      const itemX = 50;
      const qtyX = 300;
      const priceX = 370;
      const totalX = 470;

      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("Item", itemX, tableTop)
        .text("Qty", qtyX, tableTop)
        .text("Price", priceX, tableTop)
        .text("Total", totalX, tableTop);

      doc
        .moveTo(50, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke();

      // --- Table Items ---
      let y = tableTop + 25;
      let totalAmount = 0;

      doc.font("Helvetica").fontSize(9);

      // Render items
      itemsToRender.forEach((item) => {
        totalAmount += item.total;

        // Display: Product Name (Size) - Category
        let productDisplayName = item.name || "Product";
        if (item.size) {
          productDisplayName += ` (${item.size})`;
        }
        if (item.category) {
          productDisplayName += ` - ${item.category}`;
        }

        doc
          .text(productDisplayName, itemX, y, { width: 240 })
          .text(item.quantity.toString(), qtyX, y)
          .text(formatCurrency(item.price), priceX, y)
          .text(formatCurrency(item.total), totalX, y);

        y += 20;
      });

      doc.moveTo(50, y).lineTo(550, y).stroke();

      // --- Total ---
      y += 10;
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("Grand Total:", priceX, y)
        .text(formatCurrency(purchase.total_amount), totalX, y);

      // --- QR Code ---
      const qrFilename = `qr_purchase_${purchase.id}.png`;
      const qrFilepath = path.join(qrCodePath, qrFilename);

      if (fs.existsSync(qrFilepath)) {
        try {
          y += 30;
          doc
            .fontSize(12)
            .text("Scan QR Code for Order Verification:", 50, y, {
              underline: true,
            })
            .moveDown();

          doc.image(qrFilepath, 250, y + 20, { width: 100, height: 100 });

          doc
            .fontSize(8)
            .text("Use this QR code for order verification", 50, y + 130, {
              align: "center",
            });

          y += 150;
        } catch (qrError) {
          console.error("Error adding QR code to invoice:", qrError);
        }
      }

      // --- Footer ---
      const footerY = 700;
      doc.fontSize(10).text("Thank you for your purchase!", 50, footerY, {
        align: "center",
        width: 500,
      });

      doc.end();

      stream.on("finish", () => {
        resolve({
          filepath,
          filename,
          publicUrl,
        });
      });

      stream.on("error", (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateInvoicePDF,
};
