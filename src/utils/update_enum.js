const db = require("../config/db.config");

const updateEnum = async () => {
    try {
        console.log("Updating voucher_type ENUM...");
        // Modify the column to include 'shipping' and 'general'
        await db.execute("ALTER TABLE vouchers MODIFY COLUMN voucher_type ENUM('product', 'event', 'shipping', 'general') DEFAULT 'product'");
        console.log("Update successful!");
        process.exit(0);
    } catch (err) {
        console.error("Update failed:", err);
        process.exit(1);
    }
};

updateEnum();
