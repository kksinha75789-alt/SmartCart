-- ============================================================================
-- SmartCart: Smart Order Processing System
-- Cloud Computing & Microservices Database Schema (PostgreSQL)
-- ============================================================================

-- Extensions for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'ADMIN')),
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
    original_price DECIMAL(12, 2) NOT NULL CHECK (original_price >= price),
    discount_percent INT DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 4.5 CHECK (rating >= 0 AND rating <= 5),
    reviews_count INT DEFAULT 0,
    image_url TEXT NOT NULL,
    specs JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. INVENTORY TABLE (Atomic Concurrency Control)
-- Invariant: total_quantity = available_quantity + reserved_quantity + sold_quantity
CREATE TABLE IF NOT EXISTS inventory (
    product_id VARCHAR(64) PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    total_quantity INT NOT NULL CHECK (total_quantity >= 0),
    available_quantity INT NOT NULL CHECK (available_quantity >= 0),
    reserved_quantity INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    sold_quantity INT NOT NULL DEFAULT 0 CHECK (sold_quantity >= 0),
    version BIGINT NOT NULL DEFAULT 0, -- Optimistic locking version
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_quantity_consistency CHECK (
        available_quantity + reserved_quantity + sold_quantity = total_quantity
    )
);

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id),
    status VARCHAR(30) NOT NULL DEFAULT 'CREATED' 
        CHECK (status IN ('CREATED', 'RESERVED', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'PAYMENT_FAILED', 'EXPIRED', 'CANCELLED')),
    subtotal DECIMAL(12, 2) NOT NULL CHECK (subtotal >= 0),
    discount DECIMAL(12, 2) DEFAULT 0.00,
    shipping_fee DECIMAL(12, 2) DEFAULT 0.00,
    tax DECIMAL(12, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL CHECK (total_amount >= 0),
    shipping_address TEXT NOT NULL,
    customer_phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL
);

-- 6. RESERVATIONS TABLE (Smart Reservation Lifecycle)
CREATE TABLE IF NOT EXISTS reservations (
    id VARCHAR(64) PRIMARY KEY,                    -- e.g. RES-8F29A4-2026
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id),
    user_id VARCHAR(64) NOT NULL REFERENCES users(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'HELD' 
        CHECK (status IN ('AVAILABLE', 'HELD', 'CONFIRMED', 'RELEASED', 'EXPIRED', 'CANCELLED')),
    held_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,   -- Exactly 5 minutes from held_at
    confirmed_at TIMESTAMP WITH TIME ZONE,
    released_at TIMESTAMP WITH TIME ZONE,
    release_reason VARCHAR(100)                    -- 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'TIMEOUT_EXPIRED', 'USER_CANCELLED', 'ADMIN_OVERRIDE'
);

-- 7. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id),
    user_id VARCHAR(64) NOT NULL REFERENCES users(id),
    reservation_id VARCHAR(64) REFERENCES reservations(id),
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('UPI', 'CREDIT_CARD', 'DEBIT_CARD', 'NET_BANKING')),
    transaction_ref VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'TIMEOUT', 'REFUNDED')),
    gateway_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 8. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL, -- 'RESERVATION_CONFIRMED', 'PAYMENT_SUCCESS', 'ORDER_SHIPPED', 'RESERVATION_EXPIRING'
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. TRANSACTIONAL OUTBOX EVENTS TABLE (Transactional Outbox Pattern)
CREATE TABLE IF NOT EXISTS outbox_events (
    id VARCHAR(64) PRIMARY KEY,
    aggregate_type VARCHAR(50) NOT NULL,  -- 'Inventory', 'Order', 'Payment'
    aggregate_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(100) NOT NULL,     -- 'InventoryReservedEvent', 'OrderPaidEvent', etc.
    payload JSONB NOT NULL,
    topic VARCHAR(100) NOT NULL,          -- Kafka topic name
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PUBLISHED', 'FAILED', 'DLQ')),
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE
);

-- 10. PROCESSED EVENTS TABLE (Idempotent Consumer Pattern)
CREATE TABLE IF NOT EXISTS processed_events (
    event_id VARCHAR(64) PRIMARY KEY,
    consumer_group VARCHAR(100) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. IDEMPOTENCY KEYS TABLE (Duplicate Request Prevention)
CREATE TABLE IF NOT EXISTS idempotency_keys (
    idempotency_key VARCHAR(128) PRIMARY KEY,
    request_hash VARCHAR(64) NOT NULL,
    response_code INT NOT NULL,
    response_body JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- ============================================================================
-- INDEXES FOR HIGH-THROUGHPUT CONCURRENCY
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status_expires ON reservations(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_reservations_order_id ON reservations(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox_events(status, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);

-- ============================================================================
-- ATOMIC RESERVATION FUNCTION (Conditional Update with Row-Level Lock)
-- ============================================================================
-- This function models the exact PostgreSQL logic that executes in production:
CREATE OR REPLACE FUNCTION reserve_inventory_atomic(
    p_product_id VARCHAR(64),
    p_quantity INT,
    p_order_id VARCHAR(64),
    p_user_id VARCHAR(64),
    p_reservation_id VARCHAR(64),
    p_ttl_seconds INT DEFAULT 300
) RETURNS JSONB AS $$
DECLARE
    v_available INT;
    v_rows_affected INT;
    v_expires_at TIMESTAMP WITH TIME ZONE;
    v_result JSONB;
BEGIN
    -- Atomic conditional update: decreases available, increases reserved ONLY IF available >= requested
    UPDATE inventory 
    SET available_quantity = available_quantity - p_quantity,
        reserved_quantity = reserved_quantity + p_quantity,
        version = version + 1,
        last_updated = CURRENT_TIMESTAMP
    WHERE product_id = p_product_id 
      AND available_quantity >= p_quantity;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

    IF v_rows_affected = 1 THEN
        v_expires_at := CURRENT_TIMESTAMP + (p_ttl_seconds || ' seconds')::INTERVAL;
        
        -- Insert active reservation record
        INSERT INTO reservations (id, order_id, product_id, user_id, quantity, status, held_at, expires_at)
        VALUES (p_reservation_id, p_order_id, p_product_id, p_user_id, p_quantity, 'HELD', CURRENT_TIMESTAMP, v_expires_at);

        -- Insert Outbox Event for Kafka producer
        INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, payload, topic)
        VALUES (
            uuid_generate_v4()::text,
            'Inventory',
            p_product_id,
            'InventoryReservedEvent',
            json_build_object(
                'reservationId', p_reservation_id,
                'orderId', p_order_id,
                'productId', p_product_id,
                'userId', p_user_id,
                'quantity', p_quantity,
                'status', 'HELD',
                'expiresAt', v_expires_at
            )::jsonb,
            'inventory.reserved'
        );

        v_result := json_build_object(
            'success', true,
            'status', 'HELD',
            'reservationId', p_reservation_id,
            'expiresAt', v_expires_at,
            'message', 'Inventory held successfully for ' || p_ttl_seconds || ' seconds.'
        );
        RETURN v_result;
    ELSE
        -- Concurrency conflict: Available stock is insufficient or locked by another concurrent buyer
        SELECT available_quantity INTO v_available FROM inventory WHERE product_id = p_product_id;
        
        v_result := json_build_object(
            'success', false,
            'status', 'FAILED',
            'availableStock', COALESCE(v_available, 0),
            'message', 'This item is currently reserved by another customer. It may become available again if their payment is not completed.'
        );
        RETURN v_result;
    END IF;
END;
$$ LANGUAGE plpgsql;

