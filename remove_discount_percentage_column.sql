-- SQL script to remove discount_percentage column from products table
ALTER TABLE products 
DROP COLUMN discount_percentage;

-- Verify the column was removed successfully
DESCRIBE products;