// Debug script untuk Order #303
const PurchaseRepository = require("./src/models/purchase.repository");
const CartRepository = require("./src/models/cart.repository");
const ProductRepository = require("./src/models/product.repository");
const OrderAddressRepository = require("./src/models/orderAddress.repository");

async function debugPurchase303() {
  try {
    console.log("=== DEBUGGING PURCHASE #303 ===\n");

    const purchaseId = 303;

    // 1. Get purchase details
    console.log("1. FETCHING PURCHASE DETAILS...");
    const purchase = await PurchaseRepository.findById(purchaseId);

    if (!purchase) {
      console.error("❌ Purchase not found!");
      process.exit(1);
    }

    console.log("Purchase found:");
    console.log("  ID:", purchase.id);
    console.log("  User ID:", purchase.user_id);
    console.log("  Product ID:", purchase.product_id);
    console.log("  Status:", purchase.status);
    console.log("  Total Amount:", purchase.total_amount);
    console.log("  Payment ID:", purchase.payment_id);
    console.log("  Created:", purchase.created_at);
    console.log("  Completed:", purchase.completed_at);
    console.log();

    // 2. Get cart items by user ID
    console.log("2. CHECKING CART ITEMS BY USER ID...");
    const cartItemsByUser = await CartRepository.getCartItemsByUserId(
      purchase.user_id
    );

    console.log(
      `Found ${cartItemsByUser.length} cart items for user ${purchase.user_id}:`
    );
    cartItemsByUser.forEach((item, index) => {
      console.log(`  Item ${index + 1}:`);
      console.log(`    Cart Item ID: ${item.id}`);
      console.log(`    Product ID: ${item.product_id}`);
      console.log(`    Quantity: ${item.quantity}`);
      console.log(`    Purchase ID: ${item.purchase_id || "NULL"}`);
      console.log(`    Product Name: ${item.product_name || "N/A"}`);
    });
    console.log();

    // 3. Get cart items by purchase ID
    console.log("3. CHECKING CART ITEMS BY PURCHASE ID...");
    const cartItemsByPurchase = await CartRepository.getCartItemsByPurchaseId(
      purchaseId
    );

    console.log(
      `Found ${cartItemsByPurchase.length} cart items linked to purchase ${purchaseId}:`
    );
    cartItemsByPurchase.forEach((item, index) => {
      console.log(`  Item ${index + 1}:`);
      console.log(`    Cart Item ID: ${item.id}`);
      console.log(`    Product ID: ${item.product_id}`);
      console.log(`    Quantity: ${item.quantity}`);
      console.log(`    Product Name: ${item.product_name || "N/A"}`);
    });
    console.log();

    // 4. Check product details
    if (purchase.product_id) {
      console.log("4. CHECKING PRODUCT DETAILS...");
      const product = await ProductRepository.findById(purchase.product_id);

      if (product) {
        console.log("Product found:");
        console.log("  ID:", product.id);
        console.log("  Name:", product.name);
        console.log("  Category:", product.category);
        console.log("  Current Quantity:", product.quantity);
        console.log("  Price:", product.price);
      } else {
        console.log("❌ Product not found!");
      }
      console.log();
    }

    // 5. Check order address
    console.log("5. CHECKING ORDER ADDRESS...");
    const address = await OrderAddressRepository.findByPurchaseId(purchaseId);

    if (address) {
      console.log("Order address found:");
      console.log("  Full Name:", address.full_name);
      console.log("  Phone:", address.phone);
      console.log("  Address:", address.address_line1);
      console.log("  City:", address.city);
    } else {
      console.log("❌ Order address not found!");
    }
    console.log();

    // 6. Analyze the issue
    console.log("=== ANALYSIS ===");

    if (cartItemsByUser.length === 0) {
      console.log("❌ ISSUE: No cart items found for user!");
      console.log("   Possible causes:");
      console.log("   1. Cart was cleared before webhook was called");
      console.log("   2. Items were never added to cart");
      console.log("   3. User ID mismatch");
    } else if (cartItemsByPurchase.length === 0) {
      console.log("❌ ISSUE: Cart items NOT linked to purchase!");
      console.log("   Possible causes:");
      console.log("   1. linkCartItemToPurchase() failed");
      console.log("   2. Webhook callback not executed");
      console.log("   3. Purchase ID mismatch");
    } else {
      console.log("✅ Cart items properly linked to purchase");
      console.log("   Stock reduction should have happened");
      console.log("   Check product quantity to verify");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error debugging purchase:", error);
    process.exit(1);
  }
}

debugPurchase303();
