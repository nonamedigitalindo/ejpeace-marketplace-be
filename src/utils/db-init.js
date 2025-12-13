const db = require("../config/db.config");

const createUsersTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      email VARCHAR(100) NOT NULL UNIQUE,
      phone VARCHAR(20) NULL,
      address TEXT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('user', 'admin') DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL DEFAULT NULL,
      INDEX idx_email (email),
      INDEX idx_phone (phone),
      INDEX idx_deleted_at (deleted_at)
    )
  `;

  try {
    await db.execute(query);
    console.log("Users table created or already exists");
    return true;
  } catch (error) {
    console.error("Error creating users table:", error.message);
    return false;
  }
};

const createProductsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10, 2) NOT NULL,
      discount_percentage DECIMAL(5, 2) DEFAULT 0.00,
      category VARCHAR(100) NOT NULL,
      size VARCHAR(10) NULL,
      quantity INT DEFAULT 0,
      image VARCHAR(500) NULL, -- Add image column for product images
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL DEFAULT NULL,
      INDEX idx_category (category),
      INDEX idx_deleted_at (deleted_at)
    )
  `;

  try {
    await db.execute(query);
    console.log("Products table created or already exists");
    return true;
  } catch (error) {
    console.error("Error creating products table:", error.message);
    return false;
  }
};

const createEventsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      start_date DATETIME NOT NULL,
      end_date DATETIME NOT NULL,
      location VARCHAR(255) NOT NULL,
      price DECIMAL(10, 2) DEFAULT 0.00,
      discount_percentage DECIMAL(5, 2) DEFAULT 0.00,
      image VARCHAR(500) NULL, -- Add image column for event images
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL DEFAULT NULL,
      INDEX idx_start_date (start_date),
      INDEX idx_deleted_at (deleted_at)
    )
  `;

  try {
    await db.execute(query);
    console.log("Events table created or already exists");
    return true;
  } catch (error) {
    console.error("Error creating events table:", error.message);
    return false;
  }
};

const createTicketsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS tickets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      event_id INT NOT NULL,
      ticket_type VARCHAR(50) DEFAULT 'general',
      price DECIMAL(10, 2) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      payment_id VARCHAR(255) NULL,
      attendee_name VARCHAR(255) NOT NULL,
      attendee_email VARCHAR(255) NOT NULL,
      attendee_phone VARCHAR(50) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL DEFAULT NULL,
      INDEX idx_user_id (user_id),
      INDEX idx_event_id (event_id),
      INDEX idx_payment_id (payment_id),
      INDEX idx_status (status),
      INDEX idx_deleted_at (deleted_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    )
  `;

  try {
    await db.execute(query);
    console.log("Tickets table created or already exists");
    return true;
  } catch (error) {
    console.error("Error creating tickets table:", error.message);
    return false;
  }
};

const createCartTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS cart (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_product_id (product_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `;

  try {
    await db.execute(query);
    console.log("Cart table created or already exists");
    return true;
  } catch (error) {
    console.error("Error creating cart table:", error.message);
    return false;
  }
};

// Add this function to create the purchases table
const createPurchasesTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS purchases (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      total_amount DECIMAL(10, 2) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      payment_id VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL DEFAULT NULL,
      INDEX idx_user_id (user_id),
      INDEX idx_payment_id (payment_id),
      INDEX idx_status (status),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `;

  try {
    await db.execute(query);
    console.log("Purchases table created or already exists");
    return true;
  } catch (error) {
    console.error("Error creating purchases table:", error.message);
    return false;
  }
};

// Add this function to create the vouchers table
const createVouchersTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS vouchers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      discount_type ENUM('percentage', 'fixed') DEFAULT 'percentage',
      discount_value DECIMAL(10, 2) NOT NULL,
      max_usage INT DEFAULT NULL,
      used_count INT DEFAULT 0,
      min_order_value DECIMAL(10, 2) DEFAULT NULL,
      valid_from DATETIME NOT NULL,
      valid_until DATETIME NOT NULL,
      is_active BOOLEAN DEFAULT true,
      apply_to_all BOOLEAN DEFAULT TRUE,
      voucher_type ENUM('product', 'event', 'shipping', 'general') DEFAULT 'product', -- New field for voucher classification
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_code (code),
      INDEX idx_valid_from (valid_from),
      INDEX idx_valid_until (valid_until),
      INDEX idx_is_active (is_active),
      INDEX idx_voucher_type (voucher_type)
    )
  `;

  try {
    await db.execute(query);
    console.log("Vouchers table created or already exists");
    return true;
  } catch (error) {
    console.error("Error creating vouchers table:", error.message);
    return false;
  }
};



// Add this function to create the ticket_vouchers table (many-to-many relationship)
const createTicketVouchersTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS ticket_vouchers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_id INT NOT NULL,
      voucher_id INT NOT NULL,
      discount_amount DECIMAL(10, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ticket_id (ticket_id),
      INDEX idx_voucher_id (voucher_id),
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
      FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE,
      UNIQUE KEY unique_ticket_voucher (ticket_id, voucher_id)
    )
  `;

  try {
    await db.execute(query);
    console.log("Ticket vouchers table created or already exists");
    return true;
  } catch (error) {
    console.error("Error creating ticket vouchers table:", error.message);
    return false;
  }
};

// Add this function to create the barcodes table
const createBarcodesTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS barcodes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_id INT NOT NULL,
      event_id INT NOT NULL,
      barcode_data VARCHAR(255) UNIQUE NOT NULL,
      qr_code_image TEXT, -- Store base64 encoded QR code image
      status ENUM('active', 'inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_ticket_id (ticket_id),
      INDEX idx_event_id (event_id),
      INDEX idx_barcode_data (barcode_data),
      INDEX idx_status (status),
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    )
  `;

  try {
    await db.execute(query);
    console.log("Barcodes table created or already exists");
    return true;
  } catch (error) {
    console.error("Error creating barcodes table:", error.message);
    return false;
  }
};

// Add this function to create the user_voucher_claims table
const createUserVoucherClaimsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS user_voucher_claims (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      voucher_id INT NOT NULL,
      claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_used BOOLEAN DEFAULT FALSE,
      used_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_voucher_id (voucher_id),
      INDEX idx_claimed_at (claimed_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_voucher (user_id, voucher_id)
    )
  `;

  try {
    await db.execute(query);
    console.log("User voucher claims table created or already exists");
    return true;
  } catch (error) {
    console.error("Error creating user voucher claims table:", error.message);
    return false;
  }
};

// Create voucher_products table for associating vouchers with specific products
const createVoucherProductsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS voucher_products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      voucher_id INT NOT NULL,
      product_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_voucher_id (voucher_id),
      INDEX idx_product_id (product_id),
      FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE KEY unique_voucher_product (voucher_id, product_id)
    )
  `;

  try {
    await db.execute(query);
    console.log("Voucher products table created or already exists");
    return true;
  } catch (error) {
    console.error("Error creating voucher products table:", error.message);
    return false;
  }
};

// Create voucher_events table for associating vouchers with specific events
const createVoucherEventsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS voucher_events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      voucher_id INT NOT NULL,
      event_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_voucher_id (voucher_id),
      INDEX idx_event_id (event_id),
      FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      UNIQUE KEY unique_voucher_event (voucher_id, event_id)
    )
  `;

  try {
    await db.execute(query);
    console.log("Voucher events table created or already exists");
    return true;
  } catch (error) {
    console.error("Error creating voucher events table:", error.message);
    return false;
  }
};

// Add this function to create the purchase_vouchers table (many-to-many relationship)
const createPurchaseVouchersTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS purchase_vouchers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      purchase_id INT NOT NULL,
      voucher_id INT NOT NULL,
      discount_amount DECIMAL(10, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_purchase_id (purchase_id),
      INDEX idx_voucher_id (voucher_id),
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
      FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE,
      UNIQUE KEY unique_purchase_voucher (purchase_id, voucher_id)
    )
  `;

  try {
    await db.execute(query);
    console.log("Purchase vouchers table created or already exists");
    return true;
  } catch (error) {
    console.error("Error creating purchase vouchers table:", error.message);
    return false;
  }
};

// Add this function to create the order_addresses table
const createOrderAddressesTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS order_addresses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      purchase_id INT NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      address_line1 VARCHAR(255) NOT NULL,
      address_line2 VARCHAR(255),
      city VARCHAR(100) NOT NULL,
      state VARCHAR(100),
      postal_code VARCHAR(20) NOT NULL,
      country VARCHAR(100) NOT NULL DEFAULT 'Indonesia',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_purchase_id (purchase_id),
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
    )
  `;

  try {
    await db.execute(query);
    console.log("Order addresses table created or already exists");
    return true;
  } catch (error) {
    console.error("Error creating order addresses table:", error.message);
    return false;
  }
};

// Add role column to existing users table
const addRoleToUsersTable = async () => {
  // First check if the column exists
  try {
    const [rows] = await db.execute(
      `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'role'
    `,
      [process.env.DB_NAME || "peacetifal_db"]
    );

    if (rows.length === 0) {
      // Column doesn't exist, add it
      const query = `
        ALTER TABLE users 
        ADD COLUMN role ENUM('user', 'admin') DEFAULT 'user' AFTER password
      `;

      await db.execute(query);
      console.log("Role column added to users table");
      return true;
    } else {
      console.log("Role column already exists in users table");
      return true;
    }
  } catch (error) {
    console.error("Error adding role column to users table:", error.message);
    return false;
  }
};

// Add phone column to existing users table
const addPhoneToUsersTable = async () => {
  // First check if the column exists
  try {
    const [rows] = await db.execute(
      `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'phone'
    `,
      [process.env.DB_NAME || "peacetifal_db"]
    );

    if (rows.length === 0) {
      // Column doesn't exist, add it
      const query = `
        ALTER TABLE users 
        ADD COLUMN phone VARCHAR(20) NULL AFTER email
      `;

      await db.execute(query);
      console.log("Phone column added to users table");
      return true;
    } else {
      console.log("Phone column already exists in users table");
      return true;
    }
  } catch (error) {
    console.error("Error adding phone column to users table:", error.message);
    return false;
  }
};

// Add address column to existing users table
const addAddressToUsersTable = async () => {
  // First check if the column exists
  try {
    const [rows] = await db.execute(
      `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'address'
    `,
      [process.env.DB_NAME || "peacetifal_db"]
    );

    if (rows.length === 0) {
      // Column doesn't exist, add it
      const query = `
        ALTER TABLE users 
        ADD COLUMN address TEXT NULL AFTER phone
      `;

      await db.execute(query);
      console.log("Address column added to users table");
      return true;
    } else {
      console.log("Address column already exists in users table");
      return true;
    }
  } catch (error) {
    console.error("Error adding address column to users table:", error.message);
    return false;
  }
};

// Add price column to existing events table
const addPriceToEventsTable = async () => {
  // First check if the column exists
  try {
    const [rows] = await db.execute(
      `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'events' 
      AND COLUMN_NAME = 'price'
    `,
      [process.env.DB_NAME || "peacetifal_db"]
    );

    if (rows.length === 0) {
      // Column doesn't exist, add it
      const query = `
        ALTER TABLE events 
        ADD COLUMN price DECIMAL(10, 2) DEFAULT 0.00 AFTER location
      `;

      await db.execute(query);
      console.log("Price column added to events table");
      return true;
    } else {
      console.log("Price column already exists in events table");
      return true;
    }
  } catch (error) {
    console.error("Error adding price column to events table:", error.message);
    return false;
  }
};

// Add discount_percentage column to existing events table
const addDiscountPercentageToEventsTable = async () => {
  // First check if the column exists
  try {
    const [rows] = await db.execute(
      `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'events' 
      AND COLUMN_NAME = 'discount_percentage'
    `,
      [process.env.DB_NAME || "peacetifal_db"]
    );

    if (rows.length === 0) {
      // Column doesn't exist, add it
      const query = `
        ALTER TABLE events 
        ADD COLUMN discount_percentage DECIMAL(5, 2) DEFAULT 0.00 AFTER price
      `;

      await db.execute(query);
      console.log("Discount percentage column added to events table");
      return true;
    } else {
      console.log("Discount percentage column already exists in events table");
      return true;
    }
  } catch (error) {
    console.error(
      "Error adding discount percentage column to events table:",
      error.message
    );
    return false;
  }
};

// Add discount_percentage column to existing products table
const addDiscountPercentageToProductsTable = async () => {
  // First check if the column exists
  try {
    const [rows] = await db.execute(
      `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'products' 
      AND COLUMN_NAME = 'discount_percentage'
    `,
      [process.env.DB_NAME || "peacetifal_db"]
    );

    if (rows.length === 0) {
      // Column doesn't exist, add it
      const query = `
        ALTER TABLE products 
        ADD COLUMN discount_percentage DECIMAL(5, 2) DEFAULT 0.00 AFTER price
      `;

      await db.execute(query);
      console.log("Discount percentage column added to products table");
      return true;
    } else {
      console.log(
        "Discount percentage column already exists in products table"
      );
      return true;
    }
  } catch (error) {
    console.error(
      "Error adding discount percentage column to products table:",
      error.message
    );
    return false;
  }
};

// Add size column to existing products table
const addSizeToProductsTable = async () => {
  // First check if the column exists
  try {
    const [rows] = await db.execute(
      `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'products' 
      AND COLUMN_NAME = 'size'
    `,
      [process.env.DB_NAME || "peacetifal_db"]
    );

    if (rows.length === 0) {
      // Column doesn't exist, add it
      const query = `
        ALTER TABLE products 
        ADD COLUMN size VARCHAR(10) NULL AFTER category
      `;

      await db.execute(query);
      console.log("Size column added to products table");
      return true;
    } else {
      console.log("Size column already exists in products table");
      return true;
    }
  } catch (error) {
    console.error("Error adding size column to products table:", error.message);
    return false;
  }
};

// Add quantity column to existing products table
const addQuantityToProductsTable = async () => {
  // First check if the column exists
  try {
    const [rows] = await db.execute(
      `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'products' 
      AND COLUMN_NAME = 'quantity'
    `,
      [process.env.DB_NAME || "peacetifal_db"]
    );

    if (rows.length === 0) {
      // Column doesn't exist, add it
      const query = `
        ALTER TABLE products 
        ADD COLUMN quantity INT DEFAULT 0 AFTER size
      `;

      await db.execute(query);
      console.log("Quantity column added to products table");
      return true;
    } else {
      console.log("Quantity column already exists in products table");
      return true;
    }
  } catch (error) {
    console.error(
      "Error adding quantity column to products table:",
      error.message
    );
    return false;
  }
};

// Add image column to existing products table
const addImageToProductsTable = async () => {
  // First check if the column exists
  try {
    const [rows] = await db.execute(
      `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'products' 
      AND COLUMN_NAME = 'image'
      `,
      [process.env.DB_NAME || "peacetifal_db"]
    );

    if (rows.length === 0) {
      // Column doesn't exist, add it
      const query = `
        ALTER TABLE products 
        ADD COLUMN image VARCHAR(500) NULL AFTER quantity
      `;

      await db.execute(query);
      console.log("Image column added to products table");
      return true;
    } else {
      console.log("Image column already exists in products table");
      return true;
    }
  } catch (error) {
    console.error(
      "Error adding image column to products table:",
      error.message
    );
    return false;
  }
};

// Add image column to existing events table
const addImageToEventsTable = async () => {
  // First check if the column exists
  try {
    const [rows] = await db.execute(
      `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'events' 
      AND COLUMN_NAME = 'image'
      `,
      [process.env.DB_NAME || "peacetifal_db"]
    );

    if (rows.length === 0) {
      // Column doesn't exist, add it
      const query = `
        ALTER TABLE events 
        ADD COLUMN image VARCHAR(500) NULL AFTER discount_percentage
      `;

      await db.execute(query);
      console.log("Image column added to events table");
      return true;
    } else {
      console.log("Image column already exists in events table");
      return true;
    }
  } catch (error) {
    console.error("Error adding image column to events table:", error.message);
    return false;
  }
};

// Add this function to remove the barcode column from tickets table
const removeBarcodeFromTicketsTable = async () => {
  // Check if the column exists before trying to remove it
  try {
    const [rows] = await db.execute(
      `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'tickets' 
      AND COLUMN_NAME = 'barcode'
      `,
      [process.env.DB_NAME || "peacetifal_db"]
    );

    // If column exists, remove it
    if (rows.length > 0) {
      const query = `ALTER TABLE tickets DROP COLUMN barcode`;
      await db.execute(query);
      console.log("Barcode column removed from tickets table");
      return true;
    } else {
      console.log("Barcode column already removed from tickets table");
      return true;
    }
  } catch (error) {
    console.error(
      "Error removing barcode column from tickets table:",
      error.message
    );
    return false;
  }
};

// Add this function to add purchase_id column to cart table
const addPurchaseIdToCartTable = async () => {
  // First check if the column exists
  try {
    const [rows] = await db.execute(
      `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'cart' 
      AND COLUMN_NAME = 'purchase_id'
      `,
      [process.env.DB_NAME || "peacetifal_db"]
    );

    if (rows.length === 0) {
      // Column doesn't exist, add it
      const query = `
        ALTER TABLE cart 
        ADD COLUMN purchase_id INT NULL AFTER quantity,
        ADD INDEX idx_purchase_id (purchase_id),
        ADD FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL
      `;

      await db.execute(query);
      console.log("Purchase ID column added to cart table");
      return true;
    } else {
      console.log("Purchase ID column already exists in cart table");
      return true;
    }
  } catch (error) {
    console.error(
      "Error adding purchase ID column to cart table:",
      error.message
    );
    return false;
  }
};

// Add this function to add voucher_type column if it doesn't exist
const addVoucherTypeToVouchersTable = async () => {
  // First check if the column exists
  try {
    const [rows] = await db.execute(
      `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'vouchers' 
      AND COLUMN_NAME = 'voucher_type'
      `,
      [process.env.DB_NAME || "peacetifal_db"]
    );

    if (rows.length === 0) {
      // Column doesn't exist, add it
      const addColumnQuery = `
        ALTER TABLE vouchers 
        ADD COLUMN voucher_type ENUM('product', 'event') DEFAULT 'product'
      `;

      await db.execute(addColumnQuery);
      console.log("voucher_type column added to vouchers table");

      // Add index for the new column
      const addIndexQuery = `
        ALTER TABLE vouchers 
        ADD INDEX idx_voucher_type (voucher_type)
      `;

      await db.execute(addIndexQuery);
      console.log("Index added for voucher_type column");
    } else {
      console.log("voucher_type column already exists in vouchers table");
    }

    return true;
  } catch (error) {
    console.error(
      "Error adding voucher_type column to vouchers table:",
      error.message
    );
    return false;
  }
};

// Add apply_to_all column to vouchers table for scoping
const addApplyToAllToVouchersTable = async () => {
  try {
    const [rows] = await db.execute(
      `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'vouchers' 
      AND COLUMN_NAME = 'apply_to_all'
      `,
      [process.env.DB_NAME || "peacetifal_db"]
    );

    if (rows.length === 0) {
      // Column doesn't exist, add it
      const query = `
        ALTER TABLE vouchers 
        ADD COLUMN apply_to_all BOOLEAN DEFAULT TRUE AFTER voucher_type
      `;

      await db.execute(query);
      console.log("apply_to_all column added to vouchers table");
    } else {
      console.log("apply_to_all column already exists in vouchers table");
    }

    return true;
  } catch (error) {
    console.error(
      "Error adding apply_to_all column to vouchers table:",
      error.message
    );
    return false;
  }
};

// Add ticket_id to order_addresses table to support ticket addresses
const addTicketIdToOrderAddressesTable = async () => {
  try {
    const [rows] = await db.execute(
      `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'order_addresses' 
      AND COLUMN_NAME = 'ticket_id'
      `,
      [process.env.DB_NAME || "peacetifal_db"]
    );

    if (rows.length === 0) {
      // First, modify purchase_id to be nullable
      await db.execute(`
        ALTER TABLE order_addresses 
        MODIFY COLUMN purchase_id INT NULL
      `);

      // Then add ticket_id column
      const query = `
        ALTER TABLE order_addresses 
        ADD COLUMN ticket_id INT NULL AFTER purchase_id,
        ADD INDEX idx_ticket_id (ticket_id),
        ADD FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
      `;

      await db.execute(query);
      console.log("ticket_id column added to order_addresses table");
      return true;
    } else {
      console.log("ticket_id column already exists in order_addresses table");
      return true;
    }
  } catch (error) {
    console.error(
      "Error adding ticket_id column to order_addresses table:",
      error.message
    );
    return false;
  }
};

// Add external_id column to existing purchases table
const addExternalIdToPurchasesTable = async () => {
  // First check if the column exists
  try {
    const [rows] = await db.execute(
      `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'purchases' 
      AND COLUMN_NAME = 'external_id'
      `,
      [process.env.DB_NAME || "peacetifal_db"]
    );

    if (rows.length === 0) {
      // Column doesn't exist, add it
      const query = `
        ALTER TABLE purchases 
        ADD COLUMN external_id VARCHAR(255) NULL AFTER payment_id,
        ADD INDEX idx_external_id (external_id)
      `;

      await db.execute(query);
      console.log("External ID column added to purchases table");
      return true;
    } else {
      console.log("External ID column already exists in purchases table");
      return true;
    }
  } catch (error) {
    console.error(
      "Error adding external ID column to purchases table:",
      error.message
    );
    return false;
  }
};

// Create event_images table to support unlimited images per event
const createEventImagesTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS event_images (
      id INT AUTO_INCREMENT PRIMARY KEY,
      event_id INT NOT NULL,
      image_url VARCHAR(500) NOT NULL,
      position INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_event_id (event_id),
      INDEX idx_position (position),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    )
  `;

  try {
    await db.execute(query);
    console.log("Event images table created or already exists");
    return true;
  } catch (error) {
    console.error("Error creating event images table:", error.message);
    return false;
  }
};

// Update the initializeDatabase function to include the new functions
const initializeDatabase = async () => {
  console.log("Initializing database...");

  try {
    // Test database connection
    await db.execute("SELECT 1");
    console.log("Database connection established");

    // Create tables in order
    await createUsersTable();
    await createEventsTable();
    await createProductsTable();
    await createTicketsTable();
    await createCartTable();
    await createPurchasesTable();
    await createVouchersTable();
    await createTicketVouchersTable();
    await createBarcodesTable();
    await createUserVoucherClaimsTable();
    await createOrderAddressesTable();
    await createPurchaseVouchersTable(); // Add purchase vouchers table
    await createVoucherProductsTable(); // Add voucher-product associations
    await createVoucherEventsTable(); // Add voucher-event associations

    // Add columns to existing tables if needed
    await addRoleToUsersTable();
    await addPhoneToUsersTable(); // Add phone column
    await addAddressToUsersTable(); // Add address column
    await addPriceToEventsTable();
    await addDiscountPercentageToEventsTable();
    await addDiscountPercentageToProductsTable();
    await addSizeToProductsTable();
    await addQuantityToProductsTable();
    await addImageToProductsTable();
    await addImageToEventsTable();
    await removeBarcodeFromTicketsTable();
    await addPurchaseIdToCartTable();
    await addVoucherTypeToVouchersTable(); // Add voucher type
    await addApplyToAllToVouchersTable(); // Add apply_to_all column for voucher scoping
    await addTicketIdToOrderAddressesTable(); // Add ticket support to order addresses
    await addExternalIdToPurchasesTable(); // Add external_id for Xendit tracking
    await createEventImagesTable(); // Create event images table for unlimited images per event

    console.log("Database initialization completed");
    return true;
  } catch (error) {
    console.error("Database initialization failed:", error.message);
    return false;
  }
};

module.exports = initializeDatabase;
