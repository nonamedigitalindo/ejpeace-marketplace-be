-- Seeder for Orders (Purchases, Cart, Order Addresses, Tickets)
-- Assumes User ID 1, Product ID 1, and Event ID 1 exist.

-- 1. Create a Product Order (Completed)
INSERT INTO purchases (id, user_id, total_amount, status, payment_id, external_id, created_at, updated_at, completed_at)
VALUES (101, 1, 150000.00, 'completed', 'PAY-101', 'EXT-101', NOW(), NOW(), NOW());

INSERT INTO cart (user_id, product_id, quantity, purchase_id, created_at, updated_at)
VALUES (1, 1, 2, 101, NOW(), NOW());

INSERT INTO order_addresses (purchase_id, full_name, phone, address_line1, address_line2, city, state, postal_code, country, created_at, updated_at)
VALUES (101, 'John Doe', '08123456789', 'Jl. Sudirman No. 1', 'Apt 4B', 'Jakarta', 'DKI Jakarta', '12190', 'Indonesia', NOW(), NOW());

-- 2. Create another Product Order (Pending)
INSERT INTO purchases (id, user_id, total_amount, status, payment_id, external_id, created_at, updated_at)
VALUES (102, 1, 75000.00, 'pending', 'PAY-102', 'EXT-102', NOW(), NOW());

INSERT INTO cart (user_id, product_id, quantity, purchase_id, created_at, updated_at)
VALUES (1, 1, 1, 102, NOW(), NOW());

INSERT INTO order_addresses (purchase_id, full_name, phone, address_line1, city, postal_code, country, created_at, updated_at)
VALUES (102, 'Jane Smith', '08987654321', 'Jl. Thamrin No. 10', 'Jakarta', '10350', 'Indonesia', NOW(), NOW());

-- 3. Create a Ticket Order (Completed)
INSERT INTO tickets (id, user_id, event_id, ticket_type, price, status, payment_id, attendee_name, attendee_email, attendee_phone, created_at, updated_at)
VALUES (201, 1, 1, 'VIP', 500000.00, 'active', 'PAY-TIC-201', 'John Doe', 'john@example.com', '08123456789', NOW(), NOW());

-- 4. Create another Ticket Order (Pending)
INSERT INTO tickets (id, user_id, event_id, ticket_type, price, status, payment_id, attendee_name, attendee_email, attendee_phone, created_at, updated_at)
VALUES (202, 1, 1, 'General', 200000.00, 'pending', 'PAY-TIC-202', 'Jane Smith', 'jane@example.com', '08987654321', NOW(), NOW());

SELECT 'Seeding completed for Orders!' as message;
