-- SQL statements to add image attribute to product and event tables

-- Add image column to products table
ALTER TABLE products 
ADD COLUMN image VARCHAR(500) NULL AFTER quantity;

-- Add image column to events table
ALTER TABLE events 
ADD COLUMN image VARCHAR(500) NULL AFTER discount_percentage;

-- Verify the columns were added successfully
DESCRIBE products;
DESCRIBE events;