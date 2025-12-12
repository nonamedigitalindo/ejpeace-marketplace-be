require("dotenv").config();
const db = require("./src/config/db.config");

async function testConnection() {
  try {
    console.log("Testing DB connection...");
    // Find a recent PAID purchase (with payment_id) that has tickets
    const query = `
      SELECT p.id, p.status, p.payment_id, p.user_id 
      FROM purchases p
      WHERE p.status = 'paid' 
      AND p.payment_id IS NOT NULL 
      ORDER BY p.created_at DESC 
      LIMIT 1
    `;

    const [rows] = await db.execute(query);

    if (rows.length > 0) {
      console.log("Found valid purchase:", rows[0]);

      // Check if tickets exist for this purchase (via payment_id)
      const ticketQuery = `SELECT * FROM tickets WHERE payment_id = ?`;
      const [tickets] = await db.execute(ticketQuery, [rows[0].payment_id]);
      console.log(`Found ${tickets.length} tickets for this purchase.`);
    } else {
      console.log("No valid paid purchases found.");
    }

    process.exit(0);
  } catch (error) {
    console.error("DB Error:", error);
    process.exit(1);
  }
}

testConnection();
