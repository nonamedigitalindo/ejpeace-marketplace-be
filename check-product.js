const db = require("./src/config/db.config");

async function checkProduct() {
  try {
    console.log("Checking Product ID 23...");
    const [rows] = await db.execute("SELECT * FROM products WHERE id = 23");
    console.table(rows);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkProduct();
