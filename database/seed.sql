-- ============================================================================
-- SmartCart: Seed Data for Initial Application Bootstrap
-- ============================================================================

-- 1. USERS SEED
INSERT INTO users (id, name, email, password_hash, role, phone, address) VALUES
('USR-001', 'Alex Rivera', 'alex@example.com', '$2a$10$wE9K2yG1kI8m...hashed', 'CUSTOMER', '+1 (555) 234-5678', '742 Evergreen Terrace, Springfield, OR 97477'),
('USR-002', 'Sarah Jenkins', 'sarah@example.com', '$2a$10$xL1P8qB3mJ9k...hashed', 'CUSTOMER', '+1 (555) 987-6543', '221B Baker Street, Marylebone, London NW1 6XE'),
('USR-ADMIN', 'System Administrator', 'admin@smartcart.io', '$2a$10$zP4R7tY8nK2l...hashed', 'ADMIN', '+1 (555) 000-8888', 'One Apple Park Way, Cupertino, CA 95014')
ON CONFLICT (id) DO NOTHING;

-- 2. PRODUCTS SEED
INSERT INTO products (id, name, brand, category, description, price, original_price, discount_percent, rating, reviews_count, image_url, specs) VALUES
('PROD-IPHONE17', 'iPhone 17 Pro Max 256GB Titanium', 'Apple', 'Smartphones', 
 'Next-generation flagship smartphone with A19 Pro Bionic chip, Quantum OLED 120Hz ProMotion display, Titanium chassis, and Quad-Lens Periscope camera system.',
 1199.00, 1399.00, 14, 4.9, 1420, 
 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80',
 '{"processor": "Apple A19 Pro (3nm)", "display": "6.9\" Super Retina XDR OLED 120Hz", "ram": "12 GB Unified", "storage": "256 GB NVMe", "camera": "48MP + 48MP + 48MP + Periscope LiDAR", "battery": "4,850 mAh (All-day)", "os": "iOS 19"}'::jsonb),

('PROD-S25', 'Samsung Galaxy S25 Ultra 512GB', 'Samsung', 'Smartphones',
 'AI-infused powerhouse with Snapdragon 8 Elite, 200MP Quad Telephoto camera, embedded S-Pen, and Corning Gorilla Armor 2 anti-reflective display.',
 1299.00, 1499.00, 13, 4.8, 980,
 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=800&q=80',
 '{"processor": "Snapdragon 8 Elite Mobile Platform", "display": "6.8\" Dynamic AMOLED 2X 1-120Hz", "ram": "16 GB LPDDR5X", "storage": "512 GB UFS 4.0", "camera": "200MP + 50MP + 50MP + 12MP", "battery": "5,000 mAh 45W Fast Charge", "os": "One UI 7.0 (Android 15)"}'::jsonb),

('PROD-MACBOOK', 'MacBook Air 15" M3 Chip 16GB', 'Apple', 'Laptops',
 'Impossibly thin and fast laptop featuring Apple M3 chip, liquid retina display with True Tone, 18-hour battery life, and MagSafe 3 charging.',
 1499.00, 1699.00, 12, 4.9, 2150,
 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
 '{"processor": "Apple M3 (8-core CPU, 10-core GPU)", "display": "15.3\" Liquid Retina (2880x1864)", "ram": "16 GB Unified Memory", "storage": "512 GB SSD", "ports": "2x Thunderbolt 4 / USB 4, MagSafe 3", "battery": "66.5Wh Up to 18 hours", "os": "macOS Sonoma"}'::jsonb),

('PROD-HPLAPTOP', 'HP Spectre x360 2-in-1 OLED Touch', 'HP', 'Laptops',
 'Premium convertible laptop with Intel Core Ultra 7 with built-in Intel AI Boost NPU, 2.8K 120Hz OLED touchscreen, and 9MP IR AI camera.',
 1349.00, 1599.00, 16, 4.7, 640,
 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80',
 '{"processor": "Intel Core Ultra 7 155H (16-cores)", "display": "14.0\" 2.8K (2880x1800) OLED 120Hz Touch", "ram": "32 GB LPDDR5x 7467MHz", "storage": "1 TB PCIe Gen4 NVMe", "security": "Fingerprint & IR Face Recognition", "weight": "1.44 kg", "os": "Windows 11 Home"}'::jsonb),

('PROD-SONYHEADPHONES', 'Sony WH-1000XM5 Wireless ANC Headphones', 'Sony', 'Audio',
 'Industry-leading noise canceling headphones with Auto NC Optimizer, 8 microphones, 30mm carbon fiber drivers, and 30-hour battery life.',
 348.00, 399.00, 13, 4.8, 3890,
 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80',
 '{"type": "Over-Ear Wireless", "noise_cancellation": "Dual Processor V1 + QN1 HD NC", "battery_life": "30 Hours ANC ON (40h OFF)", "codecs": "LDAC, AAC, SBC", "connectivity": "Bluetooth 5.2 Multipoint", "weight": "250g"}'::jsonb),

('PROD-SMARTWATCH', 'Apple Watch Ultra 2 Titanium 49mm', 'Apple', 'Wearables',
 'The most rugged and capable Apple Watch. Engineered for outdoor endurance, ocean sports, 3000 nits display brightness, and dual-frequency GPS.',
 799.00, 849.00, 6, 4.9, 1120,
 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=80',
 '{"case_material": "Aerospace-grade Titanium", "display": "49mm Always-On Retina OLED 3000 nits", "water_resistance": "100m (EN13319 Dive certified)", "battery": "Up to 36 hours (72h Low Power)", "sensors": "ECG, Blood Oxygen, Depth Gauge, Water Temp"}'::jsonb),

('PROD-EARBUDS', 'Sony WF-1000XM5 True Wireless Earbuds', 'Sony', 'Audio',
 'Astonishing sound quality and best-in-class noise cancellation with dynamic driver X, dual processors, bone conduction sensors, and AI speech pickup.',
 279.00, 299.00, 7, 4.6, 890,
 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
 '{"type": "In-Ear True Wireless", "drivers": "8.4mm Dynamic Driver X", "battery": "8h + 16h with Qi Wireless Case", "codecs": "LDAC, LC3, AAC, SBC", "water_resistance": "IPX4 splash-proof", "weight": "5.9g per bud"}'::jsonb),

('PROD-SMARTTV', 'Sony BRAVIA XR 65" 4K HDR OLED Google TV', 'Sony', 'Smart TV',
 'Pure black OLED brilliance powered by Cognitive Processor XR, Acoustic Surface Audio+, Dolby Vision Atmos, and 4K 120Hz HDMI 2.1 for PS5 gaming.',
 1798.00, 2199.00, 18, 4.8, 540,
 'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=800&q=80',
 '{"screen_size": "65 Inch", "display_tech": "4K QD-OLED (3840 x 2160)", "refresh_rate": "120Hz Native", "processor": "Cognitive Processor XR", "audio": "Acoustic Surface Audio+ (50W 3.2ch)", "smart_os": "Google TV with Hands-free Voice"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 3. INVENTORY SEED
-- CRITICAL FOR DEMO: iPhone 17 has ONLY 1 unit available!
INSERT INTO inventory (product_id, total_quantity, available_quantity, reserved_quantity, sold_quantity, version) VALUES
('PROD-IPHONE17', 1, 1, 0, 0, 0),       -- Concurrency testing target!
('PROD-S25', 10, 8, 2, 0, 1),
('PROD-MACBOOK', 15, 12, 1, 2, 2),
('PROD-HPLAPTOP', 8, 7, 0, 1, 1),
('PROD-SONYHEADPHONES', 25, 20, 2, 3, 4),
('PROD-SMARTWATCH', 30, 27, 1, 2, 3),
('PROD-EARBUDS', 50, 45, 3, 2, 5),
('PROD-SMARTTV', 5, 4, 1, 0, 1)
ON CONFLICT (product_id) DO UPDATE SET
  total_quantity = EXCLUDED.total_quantity,
  available_quantity = EXCLUDED.available_quantity,
  reserved_quantity = EXCLUDED.reserved_quantity,
  sold_quantity = EXCLUDED.sold_quantity;

-- 4. INITIAL ORDERS & RESERVATIONS SEED
INSERT INTO orders (id, user_id, status, subtotal, discount, shipping_fee, tax, total_amount, shipping_address, customer_phone) VALUES
('ORD-1001', 'USR-001', 'PAID', 1499.00, 50.00, 0.00, 115.92, 1564.92, '742 Evergreen Terrace, Springfield, OR', '+1 (555) 234-5678'),
('ORD-1002', 'USR-002', 'SHIPPED', 348.00, 0.00, 0.00, 27.84, 375.84, '221B Baker Street, London NW1 6XE', '+1 (555) 987-6543')
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price) VALUES
('ITEM-101', 'ORD-1001', 'PROD-MACBOOK', 1, 1499.00, 1499.00),
('ITEM-102', 'ORD-1002', 'PROD-SONYHEADPHONES', 1, 348.00, 348.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO payments (id, order_id, user_id, reservation_id, payment_method, transaction_ref, amount, status, created_at, completed_at) VALUES
('PAY-901', 'ORD-1001', 'USR-001', NULL, 'CREDIT_CARD', 'TXN-VISA-98214309', 1564.92, 'SUCCESS', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days'),
('PAY-902', 'ORD-1002', 'USR-002', NULL, 'UPI', 'TXN-UPI-88123901', 375.84, 'SUCCESS', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

