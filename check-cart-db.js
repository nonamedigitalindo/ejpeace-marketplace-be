const db = require("./src/config/db.config");

async function checkCart() {
  try {
    console.log("Checking latest cart items...");
    // Simple query first
    const [rows] = await db.execute(
      "SELECT * FROM cart ORDER BY created_at DESC LIMIT 5"
    );

    console.log("Latest 5 cart items (raw):");
    console.table(rows);

    if (rows.length > 0) {
      console.log("First item details:", JSON.stringify(rows[0], null, 2));
    } else {
      console.log("No items found in cart table.");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error executing query:");
    console.error(error);
    process.exit(1);
  }
}

checkCart();
