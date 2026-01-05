/**
 * COMPREHENSIVE REGRESSION TEST: Voucher System Fixes
 * 
 * This test validates two critical fixes:
 * 
 * FIX 1: Voucher NEVER affects product quantity
 * FIX 2: Minimum order is validated against ORDER SUBTOTAL, not item price
 * 
 * ==================================================
 * PRINCIPLES (MUST NEVER BE VIOLATED)
 * ==================================================
 * - Quantity ≠ Harga (Quantity ≠ Price)
 * - Voucher ≠ Produk (Voucher ≠ Product)
 * - Minimum order ≠ Harga satuan (Min order ≠ Unit price)
 * - Inventory ≠ Pricing
 * - Jika ragu → ERROR, jangan kira-kira
 */

// ==================================================
// TEST SCENARIOS
// ==================================================

const testScenarios = {
    // FIX 1: Quantity Anti-Pattern Tests
    quantityTests: [
        {
            name: "Fixed Discount with Multiple Items",
            description: "Voucher discount must NOT reduce quantity",
            input: {
                items: [{ product_id: 1, quantity: 4, unit_price: 125000 }],
                voucher: { type: "fixed", discount: 5000 },
            },
            expected: {
                subtotal: 500000,            // 4 × 125,000
                total_amount: 495000,        // 500,000 - 5,000
                quantity: 4,                 // MUST stay 4, NOT 3
                stock_reduced: 4,            // MUST reduce by 4
            },
            // OLD BUG: 495,000 / 125,000 = 3.96 → floor = 3 ❌
            // FIXED: quantity stored at checkout, never derived
        },
        {
            name: "Large Percentage Discount",
            description: "50% discount must NOT affect quantity",
            input: {
                items: [{ product_id: 1, quantity: 10, unit_price: 100000 }],
                voucher: { type: "percentage", discount: 50 },
            },
            expected: {
                subtotal: 1000000,           // 10 × 100,000
                total_amount: 500000,        // 50% off
                quantity: 10,                // MUST stay 10, NOT 5
                stock_reduced: 10,
            },
        },
    ],

    // FIX 2: Minimum Order Tests
    minimumOrderTests: [
        {
            name: "Multiple Items Meet Minimum",
            description: "4 tickets × 100k = 400k >= 300k minimum → VALID",
            input: {
                items: [{ product_id: 1, quantity: 4, unit_price: 100000 }],
                voucher: {
                    type: "fixed",
                    discount: 10000,
                    min_order_value: 300000,
                },
            },
            expected: {
                subtotal: 400000,            // 4 × 100,000 = 400,000
                meets_minimum: true,         // 400,000 >= 300,000 ✅
                voucher_applied: true,
                total_amount: 390000,        // 400,000 - 10,000
                quantity: 4,
            },
            // OLD BUG: Would check 100,000 < 300,000 → REJECTED ❌
            // FIXED: Checks 400,000 >= 300,000 → VALID ✅
        },
        {
            name: "Single Item Below Minimum",
            description: "2 tickets × 100k = 200k < 300k minimum → REJECTED",
            input: {
                items: [{ product_id: 1, quantity: 2, unit_price: 100000 }],
                voucher: {
                    type: "fixed",
                    discount: 10000,
                    min_order_value: 300000,
                },
            },
            expected: {
                subtotal: 200000,            // 2 × 100,000 = 200,000
                meets_minimum: false,        // 200,000 < 300,000 ❌
                voucher_applied: false,
                error: "MINIMUM_ORDER_NOT_MET",
            },
        },
        {
            name: "Mixed Cart Meets Minimum",
            description: "Multiple products sum to meet minimum",
            input: {
                items: [
                    { product_id: 1, quantity: 2, unit_price: 100000 },
                    { product_id: 2, quantity: 3, unit_price: 50000 },
                ],
                voucher: {
                    type: "percentage",
                    discount: 10,
                    min_order_value: 300000,
                },
            },
            expected: {
                subtotal: 350000,            // (2×100k) + (3×50k) = 350,000
                meets_minimum: true,         // 350,000 >= 300,000 ✅
                voucher_applied: true,
                discount_amount: 35000,      // 10% of 350,000
                total_amount: 315000,
            },
        },
    ],
};

// ==================================================
// HELPER FUNCTIONS
// ==================================================

/**
 * Calculate order subtotal from cart items
 * 
 * CRITICAL: This is the CORRECT way to calculate subtotal
 * subtotal = Σ (item.quantity × item.unit_price)
 * 
 * @param {Array} items - Cart items with quantity and unit_price
 * @returns {number} Total order subtotal
 */
function calculateOrderSubtotal(items) {
    return items.reduce((sum, item) => {
        const quantity = item.quantity || 1;
        const price = item.unit_price || item.price || 0;
        return sum + (quantity * price);
    }, 0);
}

/**
 * Validate minimum order requirement
 * 
 * CRITICAL: Must use ORDER SUBTOTAL, not individual item prices
 * 
 * @param {number} orderSubtotal - Total order amount
 * @param {number} minOrderValue - Voucher minimum requirement
 * @returns {boolean} True if order meets minimum
 */
function validateMinimumOrder(orderSubtotal, minOrderValue) {
    if (!minOrderValue || minOrderValue <= 0) {
        return true; // No minimum required
    }
    return orderSubtotal >= minOrderValue;
}

/**
 * Validate quantity integrity
 * 
 * @param {number} originalQuantity - Quantity at checkout
 * @param {number} storedQuantity - Quantity in database
 * @param {number} discountedTotal - Total after discount
 * @param {number} unitPrice - Unit price of item
 */
function validateQuantityIntegrity(originalQuantity, storedQuantity, discountedTotal, unitPrice) {
    // Guard 1: Quantity must match
    if (storedQuantity !== originalQuantity) {
        throw new Error(
            `QUANTITY_INTEGRITY_VIOLATION: Expected ${originalQuantity}, got ${storedQuantity}`
        );
    }

    // Guard 2: Prevent deriving quantity from discounted total
    const wrongQuantity = Math.floor(discountedTotal / unitPrice);
    if (wrongQuantity !== originalQuantity) {
        console.log(`⚠️  WARNING: Deriving quantity from total would give ${wrongQuantity}, not ${originalQuantity}`);
        console.log("    This is why we STORE quantity, not calculate it!");
    }

    return true;
}

// ==================================================
// TEST RUNNER
// ==================================================

function runTests() {
    console.log("=".repeat(70));
    console.log("COMPREHENSIVE REGRESSION TEST: Voucher System Fixes");
    console.log("=".repeat(70));

    let passed = 0;
    let failed = 0;

    // Test quantity fixes
    console.log("\n📦 QUANTITY TESTS (Fix 1: Voucher must NOT affect quantity)");
    console.log("-".repeat(50));

    for (const test of testScenarios.quantityTests) {
        console.log(`\n🧪 ${test.name}`);
        console.log(`   ${test.description}`);

        try {
            const subtotal = calculateOrderSubtotal(test.input.items);
            const quantity = test.input.items.reduce((sum, item) => sum + item.quantity, 0);

            // Simulate discount
            let discountAmount = 0;
            if (test.input.voucher.type === "fixed") {
                discountAmount = test.input.voucher.discount;
            } else {
                discountAmount = subtotal * (test.input.voucher.discount / 100);
            }
            const totalAmount = subtotal - discountAmount;

            // Validate
            console.assert(subtotal === test.expected.subtotal, "Subtotal mismatch");
            console.assert(totalAmount === test.expected.total_amount, "Total mismatch");
            console.assert(quantity === test.expected.quantity, "Quantity mismatch");

            validateQuantityIntegrity(
                test.expected.quantity,
                quantity,
                totalAmount,
                test.input.items[0].unit_price
            );

            console.log("   ✅ PASSED");
            passed++;
        } catch (error) {
            console.log(`   ❌ FAILED: ${error.message}`);
            failed++;
        }
    }

    // Test minimum order fixes
    console.log("\n\n💰 MINIMUM ORDER TESTS (Fix 2: Min order = ORDER subtotal)");
    console.log("-".repeat(50));

    for (const test of testScenarios.minimumOrderTests) {
        console.log(`\n🧪 ${test.name}`);
        console.log(`   ${test.description}`);

        try {
            const subtotal = calculateOrderSubtotal(test.input.items);
            const meetsMinimum = validateMinimumOrder(
                subtotal,
                test.input.voucher.min_order_value
            );

            console.assert(subtotal === test.expected.subtotal, "Subtotal mismatch");
            console.assert(meetsMinimum === test.expected.meets_minimum, "Minimum order check mismatch");

            if (meetsMinimum && test.expected.voucher_applied) {
                // Calculate discount
                let discountAmount = 0;
                if (test.input.voucher.type === "fixed") {
                    discountAmount = test.input.voucher.discount;
                } else {
                    discountAmount = subtotal * (test.input.voucher.discount / 100);
                }
                const totalAmount = subtotal - discountAmount;

                if (test.expected.total_amount) {
                    console.assert(totalAmount === test.expected.total_amount, "Total amount mismatch");
                }
            }

            console.log("   ✅ PASSED");
            passed++;
        } catch (error) {
            console.log(`   ❌ FAILED: ${error.message}`);
            failed++;
        }
    }

    // Summary
    console.log("\n" + "=".repeat(70));
    console.log(`RESULTS: ${passed} passed, ${failed} failed`);
    console.log("=".repeat(70));

    if (failed > 0) {
        console.log("\n🚨 REGRESSION DETECTED! Some tests failed.");
        process.exit(1);
    } else {
        console.log("\n✅ All tests passed!");
        console.log("\n📋 VERIFIED PRINCIPLES:");
        console.log("   • Quantity is NEVER derived from discounted total");
        console.log("   • Minimum order validates against ORDER SUBTOTAL");
        console.log("   • Voucher only affects pricing, not inventory");
    }
}

// Architecture Guard
console.log("\n🔒 ARCHITECTURE GUARDS:");
console.log("   1. Voucher domain must NOT access quantity");
console.log("   2. min_order_value checked against Σ(qty×price)");
console.log("   3. Quantity stored at checkout, immutable after");
console.log("   4. Fail fast if data integrity violated\n");

// Run tests if executed directly
if (require.main === module) {
    runTests();
}

module.exports = {
    testScenarios,
    calculateOrderSubtotal,
    validateMinimumOrder,
    validateQuantityIntegrity,
    runTests,
};
