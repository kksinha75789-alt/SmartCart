// ============================================================================
// SmartCart Database Layer (SQLite with Automatic JSON Fallback)
// Supports Node.js 22 built-in 'node:sqlite' with JSON file persistence fallback
// ============================================================================

const fs = require('fs');
const path = require('path');

const DB_DIR = __dirname;
const SQLITE_FILE = path.join(DB_DIR, 'smartcart.db');
const JSON_FILE = path.join(DB_DIR, 'smartcart_data.json');

// Initial Seed Data
const INITIAL_USERS = [
  {
    id: 'USR-001',
    name: 'Alex Rivera',
    email: 'alex@example.com',
    password: 'password123',
    role: 'CUSTOMER',
    phone: '+1 (555) 234-5678',
    address: '742 Evergreen Terrace, Springfield, OR 97477'
  },
  {
    id: 'USR-002',
    name: 'Sarah Jenkins',
    email: 'sarah@example.com',
    password: 'password123',
    role: 'CUSTOMER',
    phone: '+1 (555) 987-6543',
    address: '221B Baker Street, London NW1 6XE'
  },
  {
    id: 'USR-ADMIN',
    name: 'Professor / System Admin',
    email: 'admin@smartcart.io',
    password: 'admin123',
    role: 'ADMIN',
    phone: '+1 (555) 000-8888',
    address: 'Cloud Computing Research Lab, Tech Hall 401'
  }
];

const INITIAL_PRODUCTS = [
  {
    id: 'PROD-IPHONE17',
    name: 'iPhone 17 Pro Max 256GB Titanium',
    brand: 'Apple',
    category: 'Smartphones',
    price: 1199.00,
    originalPrice: 1399.00,
    discountPercent: 14,
    rating: 4.9,
    reviewsCount: 1420,
    totalQuantity: 1,
    availableQuantity: 1, // CONCURRENCY TEST TARGET
    reservedQuantity: 0,
    soldQuantity: 0,
    imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80',
    description: 'Next-generation flagship smartphone with A19 Pro Bionic chip, Quantum OLED 120Hz ProMotion display, Titanium chassis, and Quad-Lens Periscope camera system.',
    specs: {
      'Processor': 'Apple A19 Pro (3nm Ultra)',
      'Display': '6.9" Super Retina XDR OLED 120Hz',
      'RAM': '12 GB Unified Architecture',
      'Storage': '256 GB NVMe High-Speed',
      'Camera': '48MP Main + 48MP Ultra-wide + 48MP Periscope Telephoto',
      'Battery': '4,850 mAh (All-Day 28hr Playback)',
      'OS': 'iOS 19 Pro'
    }
  },
  {
    id: 'PROD-S25',
    name: 'Samsung Galaxy S25 Ultra 512GB',
    brand: 'Samsung',
    category: 'Smartphones',
    price: 1299.00,
    originalPrice: 1499.00,
    discountPercent: 13,
    rating: 4.8,
    reviewsCount: 980,
    totalQuantity: 10,
    availableQuantity: 8,
    reservedQuantity: 2,
    soldQuantity: 0,
    imageUrl: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=800&q=80',
    description: 'AI-infused powerhouse with Snapdragon 8 Elite, 200MP Quad Telephoto camera, embedded S-Pen, and Corning Gorilla Armor 2 anti-reflective display.',
    specs: {
      'Processor': 'Qualcomm Snapdragon 8 Elite Mobile Platform',
      'Display': '6.8" Dynamic AMOLED 2X 1-120Hz Quad HD+',
      'RAM': '16 GB LPDDR5X',
      'Storage': '512 GB UFS 4.0 Storage',
      'Camera': '200MP Wide + 50MP 5x Periscope + 50MP 3x + 12MP Ultra-wide',
      'Battery': '5,000 mAh with 45W Fast Charging',
      'OS': 'One UI 7.0 (Android 15)'
    }
  },
  {
    id: 'PROD-MACBOOK',
    name: 'MacBook Air 15" M3 Chip 16GB',
    brand: 'Apple',
    category: 'Laptops',
    price: 1499.00,
    originalPrice: 1699.00,
    discountPercent: 12,
    rating: 4.9,
    reviewsCount: 2150,
    totalQuantity: 15,
    availableQuantity: 12,
    reservedQuantity: 1,
    soldQuantity: 2,
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
    description: 'Impossibly thin and fast laptop featuring Apple M3 chip, liquid retina display with True Tone, 18-hour battery life, and MagSafe 3 charging.',
    specs: {
      'Processor': 'Apple M3 (8-core CPU, 10-core GPU)',
      'Display': '15.3" Liquid Retina 2880x1864',
      'RAM': '16 GB Unified Memory',
      'Storage': '512 GB PCIe SSD',
      'Battery': '66.5Wh Lithium Polymer, Up to 18 Hours',
      'OS': 'macOS Sonoma'
    }
  },
  {
    id: 'PROD-HPLAPTOP',
    name: 'HP Spectre x360 2-in-1 OLED Touch',
    brand: 'HP',
    category: 'Laptops',
    price: 1349.00,
    originalPrice: 1599.00,
    discountPercent: 16,
    rating: 4.7,
    reviewsCount: 640,
    totalQuantity: 8,
    availableQuantity: 7,
    reservedQuantity: 0,
    soldQuantity: 1,
    imageUrl: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80',
    description: 'Premium convertible laptop with Intel Core Ultra 7 with built-in Intel AI Boost NPU, 2.8K 120Hz OLED touchscreen, and 9MP IR AI camera.',
    specs: {
      'Processor': 'Intel Core Ultra 7 155H (16-cores)',
      'Display': '14.0" 2.8K (2880x1800) OLED 120Hz Touchscreen',
      'RAM': '32 GB LPDDR5x 7467MHz Dual Channel',
      'Storage': '1 TB PCIe Gen4 NVMe TLC M.2 SSD',
      'OS': 'Windows 11 Home 64-bit'
    }
  },
  {
    id: 'PROD-SONYHEADPHONES',
    name: 'Sony WH-1000XM5 Wireless ANC Headphones',
    brand: 'Sony',
    category: 'Audio',
    price: 348.00,
    originalPrice: 399.00,
    discountPercent: 13,
    rating: 4.8,
    reviewsCount: 3890,
    totalQuantity: 25,
    availableQuantity: 20,
    reservedQuantity: 2,
    soldQuantity: 3,
    imageUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80',
    description: 'Industry-leading noise canceling headphones with Auto NC Optimizer, 8 microphones, 30mm carbon fiber drivers, and 30-hour battery life.',
    specs: {
      'Type': 'Over-Ear Circumaural Closed Dynamic',
      'Noise Cancellation': 'Dual Processor V1 + QN1 HD NC',
      'Battery Life': '30 Hours (ANC On), 40 Hours (ANC Off)',
      'Connectivity': 'Bluetooth 5.2 Multipoint, LDAC, 3.5mm Aux'
    }
  },
  {
    id: 'PROD-SMARTWATCH',
    name: 'Apple Watch Ultra 2 Titanium 49mm',
    brand: 'Apple',
    category: 'Wearables',
    price: 799.00,
    originalPrice: 849.00,
    discountPercent: 6,
    rating: 4.9,
    reviewsCount: 1120,
    totalQuantity: 12,
    availableQuantity: 10,
    reservedQuantity: 1,
    soldQuantity: 1,
    imageUrl: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=80',
    description: 'The most rugged and capable Apple Watch. Engineered for outdoor endurance, ocean sports, 3000 nits display brightness, and dual-frequency GPS.',
    specs: {
      'Case': 'Aerospace-grade Titanium 49mm',
      'Display': 'Always-On Retina OLED 3000 nits',
      'Water Resistance': '100m Dive Certified',
      'Battery': '36 Hours Normal (72h Low Power)'
    }
  },
  {
    id: 'PROD-EARBUDS',
    name: 'Sony WF-1000XM5 True Wireless Earbuds',
    brand: 'Sony',
    category: 'Audio',
    price: 278.00,
    originalPrice: 299.00,
    discountPercent: 7,
    rating: 4.7,
    reviewsCount: 1840,
    totalQuantity: 30,
    availableQuantity: 26,
    reservedQuantity: 1,
    soldQuantity: 3,
    imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
    description: 'Astonishing sound quality and the best noise cancellation with Dynamic Driver X, Bone Conduction sensors, and AI speech pickup.',
    specs: {
      'Driver': 'Dynamic Driver X 8.4mm',
      'Battery': '8 Hours Earbuds + 16 Hours Case (24 Hours Total)',
      'Charging': 'Wireless Qi + Fast Charge (3min = 60min)'
    }
  },
  {
    id: 'PROD-IPAD',
    name: 'iPad Pro 13" M4 OLED Ultra Retina',
    brand: 'Apple',
    category: 'Tablets',
    price: 1299.00,
    originalPrice: 1399.00,
    discountPercent: 7,
    rating: 4.9,
    reviewsCount: 890,
    totalQuantity: 10,
    availableQuantity: 8,
    reservedQuantity: 1,
    soldQuantity: 1,
    imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=800&q=80',
    description: 'Breakthrough thin design, groundbreaking Ultra Retina XDR OLED display, and outrageous performance with the Apple M4 chip.',
    specs: {
      'Processor': 'Apple M4 Chip (9-core CPU, 10-core GPU)',
      'Display': '13-inch Tandem OLED Ultra Retina XDR 120Hz',
      'Storage': '256 GB High-Speed Flash'
    }
  },
  {
    id: 'PROD-LOGITECH',
    name: 'Logitech MX Master 3S Wireless Mouse',
    brand: 'Logitech',
    category: 'Accessories',
    price: 99.00,
    originalPrice: 119.00,
    discountPercent: 17,
    rating: 4.8,
    reviewsCount: 5400,
    totalQuantity: 40,
    availableQuantity: 35,
    reservedQuantity: 2,
    soldQuantity: 3,
    imageUrl: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80',
    description: 'Performance wireless mouse with 8K DPI any-surface tracking, Quiet Clicks, and MagSpeed electromagnetic scrolling.',
    specs: {
      'Sensor': 'Darkfield 8000 DPI Precision',
      'Battery': '70 Days on full charge (1 min charge = 3 hours)'
    }
  },
  {
    id: 'PROD-DELLMONITOR',
    name: 'Dell UltraSharp 32" 4K QD-OLED Hub Monitor',
    brand: 'Dell',
    category: 'Monitors',
    price: 999.00,
    originalPrice: 1199.00,
    discountPercent: 17,
    rating: 4.9,
    reviewsCount: 320,
    totalQuantity: 6,
    availableQuantity: 4,
    reservedQuantity: 1,
    soldQuantity: 1,
    imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80',
    description: 'Stunning 4K QD-OLED display with Thunderbolt 4 140W power delivery, 99% DCI-P3 color accuracy, and built-in KVM switch.',
    specs: {
      'Panel': '31.5" Quantum Dot OLED 4K (3840 x 2160)',
      'Refresh Rate': '120Hz Fast Response'
    }
  }
];

class DatabaseEngine {
  constructor() {
    this.useSqlite = false;
    this.sqliteDb = null;
    this.state = {
      users: [...INITIAL_USERS],
      products: JSON.parse(JSON.stringify(INITIAL_PRODUCTS)),
      orders: [],
      reservations: [],
      cart: {},
      wishlist: ['PROD-IPHONE17', 'PROD-MACBOOK'],
      outboxEvents: [],
      deadLetterQueue: [],
      kafkaStream: [],
      systemLogs: []
    };

    this.init();
  }

  init() {
    // Try initializing node:sqlite
    try {
      const sqliteModule = require('node:sqlite');
      if (sqliteModule && sqliteModule.DatabaseSync) {
        this.sqliteDb = new sqliteModule.DatabaseSync(SQLITE_FILE);
        this.useSqlite = true;
        this.setupSqliteTables();
        console.log('[DB] Using persistent SQLite Database at:', SQLITE_FILE);
        return;
      }
    } catch (e) {
      // Fallback to JSON file storage
    }

    console.log('[DB] Using persistent JSON Storage at:', JSON_FILE);
    this.loadJsonState();
  }

  setupSqliteTables() {
    this.sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'CUSTOMER',
        phone TEXT,
        address TEXT
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        brand TEXT NOT NULL,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        original_price REAL NOT NULL,
        discount_percent INTEGER DEFAULT 0,
        rating REAL DEFAULT 4.5,
        reviews_count INTEGER DEFAULT 0,
        total_quantity INTEGER NOT NULL,
        available_quantity INTEGER NOT NULL,
        reserved_quantity INTEGER NOT NULL DEFAULT 0,
        sold_quantity INTEGER NOT NULL DEFAULT 0,
        image_url TEXT NOT NULL,
        description TEXT,
        specs TEXT
      );

      CREATE TABLE IF NOT EXISTS reservations (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        status TEXT NOT NULL,
        held_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        release_reason TEXT
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        items TEXT NOT NULL,
        total_amount REAL NOT NULL,
        status TEXT NOT NULL,
        payment_method TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS system_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        source TEXT NOT NULL
      );
    `);

    // Check if products exist in SQLite; if not, seed them
    const productCount = this.sqliteDb.prepare('SELECT count(*) as count FROM products').get().count;
    if (productCount === 0) {
      const insertUser = this.sqliteDb.prepare(`
        INSERT INTO users (id, name, email, password, role, phone, address)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const u of INITIAL_USERS) {
        insertUser.run(u.id, u.name, u.email, u.password, u.role, u.phone, u.address);
      }

      const insertProd = this.sqliteDb.prepare(`
        INSERT INTO products (
          id, name, brand, category, price, original_price, discount_percent, rating,
          reviews_count, total_quantity, available_quantity, reserved_quantity, sold_quantity,
          image_url, description, specs
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const p of INITIAL_PRODUCTS) {
        insertProd.run(
          p.id, p.name, p.brand, p.category, p.price, p.originalPrice, p.discountPercent,
          p.rating, p.reviewsCount, p.totalQuantity, p.availableQuantity, p.reservedQuantity,
          p.soldQuantity, p.imageUrl, p.description, JSON.stringify(p.specs)
        );
      }
      console.log('[DB] SQLite tables seeded successfully with initial data.');
    }
  }

  loadJsonState() {
    try {
      if (fs.existsSync(JSON_FILE)) {
        const raw = fs.readFileSync(JSON_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        this.state = { ...this.state, ...parsed };
      } else {
        this.saveJsonState();
      }
    } catch (err) {
      console.error('[DB] Error loading JSON state:', err);
    }
  }

  saveJsonState() {
    try {
      fs.writeFileSync(JSON_FILE, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (err) {
      console.error('[DB] Error saving JSON state:', err);
    }
  }

  // --- Products CRUD ---
  getProducts() {
    if (this.useSqlite) {
      const rows = this.sqliteDb.prepare('SELECT * FROM products').all();
      return rows.map(r => ({
        id: r.id,
        name: r.name,
        brand: r.brand,
        category: r.category,
        price: r.price,
        originalPrice: r.original_price,
        discountPercent: r.discount_percent,
        rating: r.rating,
        reviewsCount: r.reviews_count,
        totalQuantity: r.total_quantity,
        availableQuantity: r.available_quantity,
        reservedQuantity: r.reserved_quantity,
        soldQuantity: r.sold_quantity,
        imageUrl: r.image_url,
        description: r.description,
        specs: r.specs ? JSON.parse(r.specs) : {}
      }));
    }
    return this.state.products;
  }

  getProductById(id) {
    if (this.useSqlite) {
      const r = this.sqliteDb.prepare('SELECT * FROM products WHERE id = ?').get(id);
      if (!r) return null;
      return {
        id: r.id,
        name: r.name,
        brand: r.brand,
        category: r.category,
        price: r.price,
        originalPrice: r.original_price,
        discountPercent: r.discount_percent,
        rating: r.rating,
        reviewsCount: r.reviews_count,
        totalQuantity: r.total_quantity,
        availableQuantity: r.available_quantity,
        reservedQuantity: r.reserved_quantity,
        soldQuantity: r.sold_quantity,
        imageUrl: r.image_url,
        description: r.description,
        specs: r.specs ? JSON.parse(r.specs) : {}
      };
    }
    return this.state.products.find(p => p.id === id) || null;
  }

  updateProductQuantities(productId, availableDelta, reservedDelta, soldDelta) {
    if (this.useSqlite) {
      const p = this.getProductById(productId);
      if (!p) return null;
      const newAvail = p.availableQuantity + availableDelta;
      const newRes = p.reservedQuantity + reservedDelta;
      const newSold = p.soldQuantity + soldDelta;

      this.sqliteDb.prepare(`
        UPDATE products
        SET available_quantity = ?, reserved_quantity = ?, sold_quantity = ?
        WHERE id = ?
      `).run(newAvail, newRes, newSold, productId);
      return this.getProductById(productId);
    }

    const prod = this.state.products.find(p => p.id === productId);
    if (!prod) return null;
    prod.availableQuantity += availableDelta;
    prod.reservedQuantity += reservedDelta;
    prod.soldQuantity += soldDelta;
    this.saveJsonState();
    return prod;
  }

  setProductStock(productId, stock) {
    if (this.useSqlite) {
      this.sqliteDb.prepare(`
        UPDATE products
        SET total_quantity = ?, available_quantity = ?, reserved_quantity = 0, sold_quantity = 0
        WHERE id = ?
      `).run(stock, stock, productId);
      return this.getProductById(productId);
    }
    const prod = this.state.products.find(p => p.id === productId);
    if (prod) {
      prod.totalQuantity = stock;
      prod.availableQuantity = stock;
      prod.reservedQuantity = 0;
      prod.soldQuantity = 0;
      this.saveJsonState();
    }
    return prod;
  }

  // --- Users ---
  getUsers() {
    if (this.useSqlite) {
      return this.sqliteDb.prepare('SELECT id, name, email, role, phone, address FROM users').all();
    }
    return this.state.users.map(({ password, ...u }) => u);
  }

  getUserByEmail(email) {
    if (this.useSqlite) {
      return this.sqliteDb.prepare('SELECT * FROM users WHERE email = ?').get(email);
    }
    return this.state.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  getUserById(id) {
    if (this.useSqlite) {
      return this.sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(id);
    }
    return this.state.users.find(u => u.id === id) || null;
  }

  createUser(user) {
    if (this.useSqlite) {
      this.sqliteDb.prepare(`
        INSERT INTO users (id, name, email, password, role, phone, address)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(user.id, user.name, user.email, user.password, user.role || 'CUSTOMER', user.phone || '', user.address || '');
      return this.getUserById(user.id);
    }
    this.state.users.push(user);
    this.saveJsonState();
    return user;
  }

  // --- Reservations ---
  createReservation(reservation) {
    if (this.useSqlite) {
      this.sqliteDb.prepare(`
        INSERT INTO reservations (id, order_id, product_id, user_id, quantity, status, held_at, expires_at, release_reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        reservation.id, reservation.orderId, reservation.productId, reservation.userId,
        reservation.quantity, reservation.status, reservation.heldAt, reservation.expiresAt,
        reservation.releaseReason || null
      );
    } else {
      this.state.reservations.unshift(reservation);
      this.saveJsonState();
    }
    return reservation;
  }

  getReservation(id) {
    if (this.useSqlite) {
      const r = this.sqliteDb.prepare('SELECT * FROM reservations WHERE id = ?').get(id);
      if (!r) return null;
      return {
        id: r.id,
        orderId: r.order_id,
        productId: r.product_id,
        userId: r.user_id,
        quantity: r.quantity,
        status: r.status,
        heldAt: r.held_at,
        expiresAt: r.expires_at,
        releaseReason: r.release_reason
      };
    }
    return this.state.reservations.find(r => r.id === id) || null;
  }

  updateReservationStatus(id, status, releaseReason = null) {
    if (this.useSqlite) {
      this.sqliteDb.prepare(`
        UPDATE reservations SET status = ?, release_reason = ? WHERE id = ?
      `).run(status, releaseReason, id);
      return this.getReservation(id);
    }
    const r = this.state.reservations.find(x => x.id === id);
    if (r) {
      r.status = status;
      if (releaseReason) r.releaseReason = releaseReason;
      this.saveJsonState();
    }
    return r;
  }

  getActiveReservations() {
    if (this.useSqlite) {
      const rows = this.sqliteDb.prepare("SELECT * FROM reservations WHERE status = 'HELD'").all();
      return rows.map(r => ({
        id: r.id,
        orderId: r.order_id,
        productId: r.product_id,
        userId: r.user_id,
        quantity: r.quantity,
        status: r.status,
        heldAt: r.held_at,
        expiresAt: r.expires_at
      }));
    }
    return this.state.reservations.filter(r => r.status === 'HELD');
  }

  // --- Orders ---
  createOrder(order) {
    if (this.useSqlite) {
      this.sqliteDb.prepare(`
        INSERT INTO orders (id, user_id, items, total_amount, status, payment_method, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        order.id, order.userId, JSON.stringify(order.items), order.totalAmount,
        order.status, order.paymentMethod, order.createdAt
      );
    } else {
      this.state.orders.unshift(order);
      this.saveJsonState();
    }
    return order;
  }

  getOrders(userId = null) {
    if (this.useSqlite) {
      const query = userId 
        ? this.sqliteDb.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC')
        : this.sqliteDb.prepare('SELECT * FROM orders ORDER BY created_at DESC');
      const rows = userId ? query.all(userId) : query.all();
      return rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        items: JSON.parse(r.items),
        totalAmount: r.total_amount,
        status: r.status,
        paymentMethod: r.payment_method,
        createdAt: r.created_at
      }));
    }
    return userId ? this.state.orders.filter(o => o.userId === userId) : this.state.orders;
  }

  // --- Cart ---
  getCart(userId) {
    return this.state.cart[userId] || [];
  }

  saveCart(userId, items) {
    this.state.cart[userId] = items;
    this.saveJsonState();
    return items;
  }

  // --- Wishlist ---
  getWishlist() {
    return this.state.wishlist;
  }

  toggleWishlist(productId) {
    if (this.state.wishlist.includes(productId)) {
      this.state.wishlist = this.state.wishlist.filter(id => id !== productId);
    } else {
      this.state.wishlist.push(productId);
    }
    this.saveJsonState();
    return this.state.wishlist;
  }

  // --- System Logs ---
  addLog(level, message, source = 'system') {
    const entry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      source
    };
    if (this.useSqlite) {
      try {
        this.sqliteDb.prepare(`
          INSERT INTO system_logs (timestamp, level, message, source)
          VALUES (?, ?, ?, ?)
        `).run(entry.timestamp, entry.level, entry.message, entry.source);
      } catch (e) {}
    }
    this.state.systemLogs.unshift(entry);
    if (this.state.systemLogs.length > 100) this.state.systemLogs.pop();
    return entry;
  }

  getLogs(limit = 50) {
    return this.state.systemLogs.slice(0, limit);
  }

  // --- Reset DB to Factory Seed ---
  resetToSeed() {
    if (this.useSqlite) {
      this.sqliteDb.exec(`
        DELETE FROM reservations;
        DELETE FROM orders;
        DELETE FROM products;
        DELETE FROM users;
      `);
      this.setupSqliteTables();
    }
    this.state = {
      users: [...INITIAL_USERS],
      products: JSON.parse(JSON.stringify(INITIAL_PRODUCTS)),
      orders: [],
      reservations: [],
      cart: {},
      wishlist: ['PROD-IPHONE17', 'PROD-MACBOOK'],
      outboxEvents: [],
      deadLetterQueue: [],
      kafkaStream: [],
      systemLogs: []
    };
    this.saveJsonState();
    this.addLog('INFO', 'Database reset to default seed state', 'db');
  }
}

module.exports = new DatabaseEngine();

