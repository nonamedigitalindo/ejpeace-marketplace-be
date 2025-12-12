-- SQL to add voucher_type column to vouchers table
-- This will add a new column to classify vouchers as either 'product' or 'event'

-- Add the voucher_type column with ENUM type
ALTER TABLE vouchers 
ADD COLUMN voucher_type ENUM('product', 'event') DEFAULT 'product';

-- Add an index for better query performance on this column
ALTER TABLE vouchers 
ADD INDEX idx_voucher_type (voucher_type);

-- Example of how to update existing vouchers to have the correct type
-- You can modify these UPDATE statements based on your business logic
UPDATE vouchers 
SET voucher_type = 'product' 
WHERE voucher_type IS NULL;

-- If you have specific vouchers that should be classified as 'event', you can update them like this:
-- UPDATE vouchers 
-- SET voucher_type = 'event' 
-- WHERE id IN (1, 2, 3); -- Replace with actual voucher IDs that should be event vouchers

-- Verify the column was added successfully
DESCRIBE vouchers;