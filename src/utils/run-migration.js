// Script to run the user address and phone migration

const fs = require("fs");
const path = require("path");
const db = require("../config/db.config");

async function runMigration() {
  try {
    // Read the SQL migration file
    const migrationSql = fs.readFileSync(
      path.join(__dirname, "user-address-phone-migration.sql"),
      "utf8"
    );

    console.log("Executing migration SQL...");
    console.log(migrationSql);

    // Split the SQL into individual statements
    const statements = migrationSql
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    // Execute each statement
    for (const statement of statements) {
      console.log("Executing:", statement);
      await db.execute(statement);
      console.log("✓ Success");
    }

    console.log("\nMigration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error.message);
  } finally {
    // Close the database connection
    await db.end();
  }
}

// Run the migration
runMigration();
