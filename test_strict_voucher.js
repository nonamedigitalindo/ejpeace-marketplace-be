
const VoucherRepository = require('./src/models/voucher.repository');
const db = require('./src/config/db.config');

const TEST_CODE = 'STRICT_TZ_TEST_01';

async function verifyStrictTimezone() {
    try {
        console.log("=== STARTING STRICT TIMEZONE VERIFICATION ===");

        // 1. Cleanup existing test voucher
        const existing = await VoucherRepository.findByCode(TEST_CODE);
        if (existing) {
            console.log(`Cleanup: Deleting existing voucher ${existing.id}...`);
            await VoucherRepository.delete(existing.id);
        }

        // 2. Create Voucher with Strict ISO Offset
        const activeTime = "2026-01-01T01:00:00+07:00"; // 01:00 Jakarta
        const expiryTime = "2026-01-01T03:00:00+07:00"; // 03:00 Jakarta

        console.log(`Creating voucher with valid_from: ${activeTime}`);

        // NOTE: Node's new Date() might parse this to local or UTC. 
        // Our Repository logic should catch it and force Jakarta format string.

        const voucherData = {
            code: TEST_CODE,
            discount_type: 'fixed',
            discount_value: 10000,
            max_usage: 100,
            min_order_value: 0,
            valid_from: activeTime,
            valid_until: expiryTime,
            is_active: true,
            voucher_type: 'general'
        };

        const voucherId = await VoucherRepository.create(voucherData);
        console.log(`Voucher created with ID: ${voucherId}`);

        // 3. Verify Database Value
        console.log("Verifying stored value in DB...");
        const [rows] = await db.execute("SELECT valid_from, valid_until FROM vouchers WHERE id = ?", [voucherId]);

        const storedFrom = rows[0].valid_from; // Should be Date object or string depending on driver

        console.log("Raw DB Value (valid_from):", storedFrom);

        // Check if it matches 01:00:00
        // If MySQL stored "2026-01-01 01:00:00", driver might return it as Date object in local time or UTC.
        // The most reliable check is seeing the string representation.

        // Let's force raw string retrieval if possible, or format the date object
        let storedString = storedFrom;
        if (storedFrom instanceof Date) {
            // Driver converted it. We need to see what time it represents.
            // If driver keeps it as "local", getHours() should be 1 if system is Jakarta.
            // Or toISOString().
            console.log("DB returned Date object:", storedFrom.toISOString());
            console.log("DB returned Date (local string):", storedFrom.toString());

            // If we stored "2026-01-01 01:00:00", we expect it to be 01:00:00.
            // If we assumed it's strict string storage, we can select as string.
        }

        const [rawRows] = await db.execute("SELECT CAST(valid_from AS CHAR) as valid_from_str FROM vouchers WHERE id = ?", [voucherId]);
        console.log("CAST(valid_from AS CHAR):", rawRows[0].valid_from_str);

        if (rawRows[0].valid_from_str.includes("01:00:00")) {
            console.log("✅ SUCCESS: Time '01:00:00' preserved strictly!");
        } else {
            console.log("❌ FAILURE: Time did not match 01:00:00. Got:", rawRows[0].valid_from_str);
        }

        process.exit(0);
    } catch (error) {
        console.error("❌ TEST FAILED:", error);
        process.exit(1);
    }
}

verifyStrictTimezone();
