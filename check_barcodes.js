require("dotenv").config();
const db = require("./src/config/db.config");

async function checkBarcodes() {
  try {
    console.log("Fetching latest barcodes...");
    const [rows] = await db.execute(
      "SELECT * FROM barcodes ORDER BY created_at DESC LIMIT 5"
    );
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("Error fetching barcodes:", err);
    process.exit(1);
  }
}

checkBarcodes();
