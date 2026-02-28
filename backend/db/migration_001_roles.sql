-- Migration 001: Add roles, delivering status, courier_id
-- Date: 2026-02-28
-- Description: Support for admin panel and delivery module

-- 1. User role (customer | admin | delivery)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer';

-- 2. New order status: delivering (between ready and delivered)
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'delivering' AFTER 'ready';

-- 3. Courier assigned to order
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_id INTEGER REFERENCES users(id);

-- 4. Index for courier order lookup
CREATE INDEX IF NOT EXISTS idx_orders_courier_id ON orders(courier_id);
