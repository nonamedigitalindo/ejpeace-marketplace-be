const db = require("../config/db.config");

const fixSchema = async () => {
    try {
        console.log("Starting schema fix...");

        // 1. Add apply_to_all to vouchers if not exists
        try {
            await db.execute("ALTER TABLE vouchers ADD COLUMN apply_to_all BOOLEAN DEFAULT TRUE");
            console.log("Added apply_to_all column");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log("apply_to_all column already exists");
            else console.error("Error adding apply_to_all:", e.message);
        }

        // 2. Create voucher_products table
        const createProductsQuery = `
      CREATE TABLE IF NOT EXISTS voucher_products (
        voucher_id INT,
        product_id INT,
        PRIMARY KEY (voucher_id, product_id),
        FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `;
        await db.execute(createProductsQuery);
        console.log("Created voucher_products table");

        // 3. Create voucher_events table
        const createEventsQuery = `
      CREATE TABLE IF NOT EXISTS voucher_events (
        voucher_id INT,
        event_id INT,
        PRIMARY KEY (voucher_id, event_id),
        FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      )
    `;
        await db.execute(createEventsQuery);
        console.log("Created voucher_events table");

        console.log("Schema fix completed!");
        process.exit(0);
    } catch (err) {
        console.error("Schema fix failed:", err);
        process.exit(1);
    }
};

fixSchema();
