const mysql = require("mysql2/promise");
require("dotenv").config();

async function checkUsers() {
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

    // Query users
    const [users] = await connection.execute(
      "SELECT id, username, email FROM users LIMIT 5"
    );
    console.log("Users in database:");
    console.table(users);

    // Close connection
    await connection.end();
  } catch (error) {
    console.error("Error connecting to database:", error.message);
  }
}

checkUsers();
