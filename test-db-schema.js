// Simple script to check if the product_id column exists in purchases table
const mysql = require("mysql2/promise");
require("dotenv").config();

async function checkSchema() {
  try {
    // Create a connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "peacetifal_db",
    });

    console.log("Connected to database successfully");

    // Check if product_id column exists in purchases table
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM purchases LIKE 'product_id'"
    );

    if (columns.length > 0) {
      console.log("Column product_id exists in purchases table");
      console.log("Column details:", columns[0]);
    } else {
      console.log("Column product_id does NOT exist in purchases table");
    }

    // Check current schema of purchases table
    const [schema] = await connection.execute("DESCRIBE purchases");
    console.log("\nPurchases table schema:");
    console.table(schema);

    // Close connection
    await connection.end();
  } catch (error) {
    console.error("Error checking database schema:", error.message);
    if (error.errno) {
      console.error("Error code:", error.errno);
    }
  }
}

checkSchema();
