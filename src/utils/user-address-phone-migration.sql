-- SQL script to add address and phone columns to users table
-- This script adds the missing columns for user address and phone information

-- Add phone column to users table
ALTER TABLE users 
ADD COLUMN phone VARCHAR(20) NULL AFTER email;

-- Add address column to users table
ALTER TABLE users 
ADD COLUMN address TEXT NULL AFTER phone;

-- Add indexes for better query performance
ALTER TABLE users 
ADD INDEX idx_phone (phone);