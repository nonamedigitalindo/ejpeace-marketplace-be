// Script to check the products table schema
const mysql = require("mysql2/promise");
require("dotenv").config();

async function checkProductsSchema() {
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

    // Check current schema of products table
    const [schema] = await connection.execute("DESCRIBE products");
    console.log("\nProducts table schema:");
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

checkProductsSchema();
