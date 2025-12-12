// Test voucher discount calculation fix
const Voucher = require("./src/models/Voucher.model");

console.log("=== TESTING VOUCHER DISCOUNT CALCULATION FIX ===\n");

// Test Case 1: Voucher with NUMBER discount_value (old voucher)
console.log("Test 1: Number discount_value (old voucher)");
const oldVoucher = new Voucher({
  id: 1,
  code: "OLD50",
  discount_type: "percentage",
  discount_value: 50, // NUMBER
  min_order_value: 1000,
  valid_from: "2024-01-01",
  valid_until: "2025-12-31",
  is_active: true,
  voucher_type: "product",
});

console.log(`  discount_value type: ${typeof oldVoucher.discount_value}`);
console.log(`  discount_value value: ${oldVoucher.discount_value}`);

const orderAmount1 = 2000;
const discount1 = oldVoucher.calculateDiscount(orderAmount1);
console.log(`  Order: Rp ${orderAmount1}`);
console.log(`  Discount: Rp ${discount1}`);
console.log(`  Final: Rp ${orderAmount1 - discount1}`);
console.log(`  ✅ Expected: Rp 1000 (50% off)\n`);

// Test Case 2: Voucher with STRING discount_value (new voucher)
console.log("Test 2: String discount_value (new voucher)");
const newVoucher = new Voucher({
  id: 2,
  code: "NEW50",
  discount_type: "percentage",
  discount_value: "50", // STRING (from database)
  min_order_value: "1000", // STRING (from database)
  valid_from: "2024-01-01",
  valid_until: "2025-12-31",
  is_active: true,
  voucher_type: "product",
});

console.log(`  discount_value type: ${typeof newVoucher.discount_value}`);
console.log(`  discount_value value: ${newVoucher.discount_value}`);
console.log(`  min_order_value type: ${typeof newVoucher.min_order_value}`);
console.log(`  min_order_value value: ${newVoucher.min_order_value}`);

const orderAmount2 = 2000;
const discount2 = newVoucher.calculateDiscount(orderAmount2);
console.log(`  Order: Rp ${orderAmount2}`);
console.log(`  Discount: Rp ${discount2}`);
console.log(`  Final: Rp ${orderAmount2 - discount2}`);
console.log(`  ✅ Expected: Rp 1000 (50% off)\n`);

// Test Case 3: Fixed amount voucher
console.log("Test 3: Fixed amount discount");
const fixedVoucher = new Voucher({
  id: 3,
  code: "SAVE100",
  discount_type: "fixed",
  discount_value: "100000", // STRING
  min_order_value: "500000", // STRING
  valid_from: "2024-01-01",
  valid_until: "2025-12-31",
  is_active: true,
  voucher_type: "product",
});

console.log(`  discount_value type: ${typeof fixedVoucher.discount_value}`);
console.log(`  discount_value value: ${fixedVoucher.discount_value}`);

const orderAmount3 = 500000;
const discount3 = fixedVoucher.calculateDiscount(orderAmount3);
console.log(`  Order: Rp ${orderAmount3}`);
console.log(`  Discount: Rp ${discount3}`);
console.log(`  Final: Rp ${orderAmount3 - discount3}`);
console.log(`  ✅ Expected: Rp 400000 (Rp 100k off)\n`);

// Test Case 4: Invalid values
console.log("Test 4: Invalid discount_value");
const invalidVoucher = new Voucher({
  id: 4,
  code: "INVALID",
  discount_type: "percentage",
  discount_value: "abc", // INVALID STRING
  min_order_value: 1000,
  valid_from: "2024-01-01",
  valid_until: "2025-12-31",
  is_active: true,
  voucher_type: "product",
});

console.log(`  discount_value type: ${typeof invalidVoucher.discount_value}`);
console.log(`  discount_value value: ${invalidVoucher.discount_value}`);
console.log(`  isNaN: ${isNaN(invalidVoucher.discount_value)}`);

const discount4 = invalidVoucher.calculateDiscount(1000);
console.log(`  Discount: Rp ${discount4}`);
console.log(`  ✅ Expected: 0 (should return 0 for invalid values)\n`);

// Summary
console.log("=== SUMMARY ===");
if (
  discount1 === 1000 &&
  discount2 === 1000 &&
  discount3 === 100000 &&
  discount4 === 0
) {
  console.log("✅ ALL TESTS PASSED!");
  console.log("✅ Old vouchers work correctly");
  console.log("✅ New vouchers with string values work correctly");
  console.log("✅ Fixed amount vouchers work correctly");
  console.log("✅ Invalid values are handled gracefully");
} else {
  console.log("❌ SOME TESTS FAILED");
  console.log(`  Test 1: ${discount1 === 1000 ? "PASS" : "FAIL"}`);
  console.log(`  Test 2: ${discount2 === 1000 ? "PASS" : "FAIL"}`);
  console.log(`  Test 3: ${discount3 === 100000 ? "PASS" : "FAIL"}`);
  console.log(`  Test 4: ${discount4 === 0 ? "PASS" : "FAIL"}`);
}
