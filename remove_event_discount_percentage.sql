-- SQL script to remove discount_percentage column from events table
ALTER TABLE events 
DROP COLUMN discount_percentage;

-- Verify the column was removed successfully
DESCRIBE events;