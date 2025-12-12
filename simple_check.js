const db = require("./src/config/db.config");

async function checkSchema() {
  try {
    const [rows] = await db.execute("DESCRIBE products");
    console.log("Products table schema:");
    console.table(rows);
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    // Close the connection pool
    await db.end();
  }
}

checkSchema();
