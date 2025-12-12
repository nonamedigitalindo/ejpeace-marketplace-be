-- SQL statements to update the products table to better support multiple images
-- This modifies the image column to be TEXT type to accommodate larger JSON arrays

-- Update the image column in products table to TEXT type
ALTER TABLE products 
MODIFY COLUMN image TEXT NULL;

-- Update the image column in events table to TEXT type (for consistency)
ALTER TABLE events 
MODIFY COLUMN image TEXT NULL;

-- Verify the columns were updated successfully
DESCRIBE products;
DESCRIBE events;