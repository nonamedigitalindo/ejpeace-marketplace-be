const VoucherRepository = require("./src/models/voucher.repository");

async function debugVouchers() {
  try {
    console.log("=== DEBUGGING VOUCHERS ===\n");

    // Get all vouchers
    const vouchers = await VoucherRepository.findAll();

    console.log(`Total vouchers in database: ${vouchers.length}\n`);

    if (vouchers.length === 0) {
      console.log("No vouchers found in database!");
      process.exit(0);
    }

    // Display each voucher
    vouchers.forEach((voucher, index) => {
      console.log(`--- Voucher ${index + 1} ---`);
      console.log(`ID: ${voucher.id}`);
      console.log(`Code: ${voucher.code}`);
      console.log(`Discount Type: ${voucher.discount_type}`);
      console.log(
        `Discount Value: ${
          voucher.discount_value
        } (type: ${typeof voucher.discount_value})`
      );
      console.log(`Min Order Value: ${voucher.min_order_value}`);
      console.log(`Max Usage: ${voucher.max_usage}`);
      console.log(`Used Count: ${voucher.used_count}`);
      console.log(`Is Active: ${voucher.is_active}`);
      console.log(`Voucher Type: ${voucher.voucher_type}`);
      console.log(`Valid From: ${voucher.valid_from}`);
      console.log(`Valid Until: ${voucher.valid_until}`);
      console.log(`Created At: ${voucher.created_at}`);

      // Test validation
      const validity = voucher.isValid();
      console.log(`\nIs Valid: ${validity.valid}`);
      if (!validity.valid) {
        console.log(`Reason: ${validity.reason}`);
      }

      // Test discount calculation for 1000
      const testAmount = 1000;
      const discount = voucher.calculateDiscount(testAmount);
      console.log(`\nDiscount for amount ${testAmount}: ${discount}`);
      console.log(`Final amount: ${testAmount - discount}`);
      console.log(`\n`);
    });

    // Sort by created_at to identify old vs new
    const sortedVouchers = [...vouchers].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );

    console.log("\n=== VOUCHERS SORTED BY AGE (OLDEST TO NEWEST) ===\n");
    sortedVouchers.forEach((voucher, index) => {
      console.log(
        `${index + 1}. ${voucher.code} (created: ${voucher.created_at})`
      );
      console.log(
        `   Type: ${voucher.discount_type}, Value: ${
          voucher.discount_value
        } (${typeof voucher.discount_value})`
      );

      // Check if discount_value might be a string
      if (typeof voucher.discount_value === "string") {
        console.log(
          `   ⚠️  WARNING: discount_value is a STRING, not a NUMBER!`
        );
        console.log(`   ⚠️  This might cause calculation errors!`);
      }

      // Check if discount_value is null or undefined
      if (
        voucher.discount_value === null ||
        voucher.discount_value === undefined
      ) {
        console.log(
          `   ⚠️  WARNING: discount_value is ${voucher.discount_value}!`
        );
      }

      console.log();
    });

    process.exit(0);
  } catch (error) {
    console.error("Error debugging vouchers:", error);
    process.exit(1);
  }
}

debugVouchers();
