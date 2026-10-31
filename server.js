// ============================================================================
// SmartCart: Advanced Node.js Microservices Backend API Server
// Emulates API Gateway, Inventory Service, Order Service, Payment Service,
// Transactional Outbox, Kafka Event Broker, DLQ, Circuit Breaker, & Concurrency Engine
// ============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;

// ============================================================================
// DATA REPOSITORY (PostgreSQL & Redis Emulation)
// ============================================================================
let products = [
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
    availableQuantity: 1, // CONCURRENCY TEST TARGET: ONLY 1 UNIT!
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
      'Processor': 'Apple M3 (8-core CPU, 10-core GPU, 16-core Neural Engine)',
      'Display': '15.3" Liquid Retina 2880x1864 with 500 nits brightness',
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
      'Processor': 'Intel Core Ultra 7 155H (16-cores, up to 4.8 GHz)',
      'Display': '14.0" 2.8K (2880x1800) OLED 120Hz 0.2ms Touchscreen',
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
      'Noise Cancellation': 'Integrated Processor V1 + HD NC Processor QN1',
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
    totalQuantity: 30,
    availableQuantity: 27,
    reservedQuantity: 1,
    soldQuantity: 2,
    imageUrl: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=80',
    description: 'The most rugged and capable Apple Watch. Engineered for outdoor endurance, ocean sports, 3000 nits display brightness, and dual-frequency GPS.',
    specs: {
      'Case Material': 'Aerospace-Grade Titanium with Sapphire Front',
      'Display': '49mm Always-On Retina OLED (3000 nits Peak)',
      'Battery': 'Up to 36 hours normal use (72h Low Power Mode)'
    }
  },
  {
    id: 'PROD-EARBUDS',
    name: 'Sony WF-1000XM5 True Wireless Earbuds',
    brand: 'Sony',
    category: 'Audio',
    price: 279.00,
    originalPrice: 299.00,
    discountPercent: 7,
    rating: 4.6,
    reviewsCount: 890,
    totalQuantity: 50,
    availableQuantity: 45,
    reservedQuantity: 3,
    soldQuantity: 2,
    imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
    description: 'Astonishing sound quality and best-in-class noise cancellation with dynamic driver X, dual processors, bone conduction sensors, and AI speech pickup.',
    specs: {
      'Type': 'In-Ear True Wireless Noise Cancelling',
      'Battery': '8 Hours + 16 Hours with Qi Wireless Charging Case'
    }
  },
  {
    id: 'PROD-SMARTTV',
    name: 'Sony BRAVIA XR 65" 4K HDR OLED Google TV',
    brand: 'Sony',
    category: 'Smart TV',
    price: 1798.00,
    originalPrice: 2199.00,
    discountPercent: 18,
    rating: 4.8,
    reviewsCount: 540,
    totalQuantity: 5,
    availableQuantity: 4,
    reservedQuantity: 1,
    soldQuantity: 0,
    imageUrl: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=800&q=80',
    description: 'Pure black OLED brilliance powered by Cognitive Processor XR, Acoustic Surface Audio+, Dolby Vision Atmos, and 4K 120Hz HDMI 2.1 for PS5 gaming.',
    specs: {
      'Screen Size': '65 Inch Diagonal OLED Matrix',
      'Resolution': '4K Ultra HD (3840 x 2160 Pixels)',
      'Smart OS': 'Google TV with Hands-Free Google Assistant'
    }
  }
];

let reservations = [];
let orders = [];
let payments = [];
let wishlist = ['PROD-IPHONE17'];
let outboxEvents = [];
let kafkaStream = [];
let deadLetterQueue = [];
let systemLogs = [];
let idempotencyKeys = new Map();

// Service Health & Circuit Breaker Simulation State
let serviceStatus = {
  apiGateway: { status: 'HEALTHY', latency: 4, requests: 1240, errorRate: 0.0 },
  userService: { status: 'HEALTHY', latency: 12, requests: 580, errorRate: 0.0 },
  productService: { status: 'HEALTHY', latency: 8, requests: 3120, errorRate: 0.0 },
  inventoryService: { status: 'HEALTHY', latency: 15, requests: 890, errorRate: 0.0 },
  orderService: { status: 'HEALTHY', latency: 18, requests: 430, errorRate: 0.0 },
  paymentService: { status: 'HEALTHY', latency: 65, requests: 390, errorRate: 0.0 },
  notificationService: { status: 'HEALTHY', latency: 22, requests: 410, errorRate: 0.0 },
  kafkaBroker: { status: 'HEALTHY', topics: 6, partitions: 18, msgCount: 2450 },
  postgres: { status: 'HEALTHY', poolActive: 5, poolMax: 30, connections: 8 },
  redis: { status: 'HEALTHY', memoryUsed: '14.2 MB', hitRate: '98.4%' }
};

let circuitBreaker = {
  payment: { state: 'CLOSED', failureCount: 0, threshold: 3, lastFailureTime: null }
};

// Logger Helper
function logSystem(level, service, message, meta = {}) {
  const logEntry = {
    id: 'LOG-' + Math.floor(100000 + Math.random() * 900000),
    timestamp: new Date().toISOString(),
    level, // INFO, WARN, ERROR, EVENT
    service,
    message,
    meta
  };
  systemLogs.unshift(logEntry);
  if (systemLogs.length > 200) systemLogs.pop();
  return logEntry;
}

// Initial System Boot Logs
logSystem('INFO', 'API-Gateway', 'Spring Cloud Gateway initialized on port 8000 (proxied to 3000)');
logSystem('INFO', 'PostgreSQL', 'PostgreSQL 16 connection pool verified. Schema version 1.0 active.');
logSystem('INFO', 'Kafka-KRaft', 'Kafka cluster leader elected: node 1 (smartcart-kraft-01).');
logSystem('INFO', 'Inventory-Service', 'Atomic Row-Level Mutex enabled for zero-overselling guarantee.');

// ============================================================================
// ATOMIC MUTEX (Emulating PostgreSQL Isolation Level READ COMMITTED / ROW LOCK)
// ============================================================================
let isDbLocked = false;
const mutexQueue = [];

function acquireLock() {
  return new Promise(resolve => {
    if (!isDbLocked) {
      isDbLocked = true;
      resolve();
    } else {
      mutexQueue.push(resolve);
    }
  });
}

function releaseLock() {
  if (mutexQueue.length > 0) {
    const next = mutexQueue.shift();
    next();
  } else {
    isDbLocked = false;
  }
}

// Broadcast Kafka Event Helper
function emitEvent(topic, payload, producer = 'inventory-service', consumer = 'order-service') {
  if (serviceStatus.kafkaBroker.status === 'OUTAGE') {
    // Transactional Outbox Pattern: Save as PENDING in DB when Kafka is down!
    const outboxId = 'OUTBOX-' + Math.floor(1000 + Math.random() * 9000);
    const outboxRecord = {
      id: outboxId,
      topic,
      payload,
      status: 'PENDING',
      retryCount: 0,
      createdAt: new Date().toISOString()
    };
    outboxEvents.unshift(outboxRecord);
    logSystem('WARN', 'Transactional-Outbox', `Kafka broker unavailable. Stored event in outbox_events with status PENDING`, { outboxId, topic });
    return outboxRecord;
  }

  const event = {
    id: 'EVT-' + Math.floor(1000 + Math.random() * 9000),
    topic: topic,
    producer: producer,
    consumer: consumer,
    partition: Math.floor(Math.random() * 3),
    offset: kafkaStream.length + 1400,
    timestamp: new Date().toISOString(),
    status: 'PROCESSED',
    payload: payload
  };
  kafkaStream.unshift(event);
  if (kafkaStream.length > 150) kafkaStream.pop();

  logSystem('EVENT', 'Kafka', `Topic [${topic}] Offset [${event.offset}] Partition [${event.partition}]`, { eventId: event.id });
  return event;
}

// ============================================================================
// 5-MINUTE RESERVATION EXPIRY WORKER (Runs every second)
// ============================================================================
setInterval(async () => {
  await acquireLock();
  try {
    const now = Date.now();
    for (const res of reservations) {
      if (res.status === 'HELD' && new Date(res.expiresAt).getTime() <= now) {
        // Return stock atomically
        const prod = products.find(p => p.id === res.productId);
        if (prod) {
          prod.availableQuantity += res.quantity;
          prod.reservedQuantity = Math.max(0, prod.reservedQuantity - res.quantity);
        }
        res.status = 'EXPIRED';
        res.releaseReason = 'TIMEOUT_EXPIRED_5_MINUTES';
        res.releasedAt = new Date().toISOString();

        logSystem('WARN', 'Inventory-Service', `Reservation ${res.id} expired after 300 seconds. Stock restored to available pool.`);

        emitEvent('inventory.released', {
          reservationId: res.id,
          productId: res.productId,
          quantity: res.quantity,
          reason: 'TIMEOUT_EXPIRED_5_MINUTES'
        }, 'inventory-service', 'notification-service');
      }
    }
  } finally {
    releaseLock();
  }
}, 1000);

// ============================================================================
// HTTP SERVER & REQUEST DISPATCHER
// ============================================================================
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Rate Limiting Simulation Header
  res.setHeader('X-RateLimit-Limit', '100');
  res.setHeader('X-RateLimit-Remaining', '98');
  res.setHeader('X-RateLimit-Reset', '60');

  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Idempotency-Key, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse JSON Body
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    let jsonBody = {};
    if (body) {
      try { jsonBody = JSON.parse(body); } catch (e) {}
    }

    const sendJson = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    // =========================================================================
    // REST API ROUTES
    // =========================================================================

    // 1. GET /api/products
    if (method === 'GET' && pathname === '/api/products') {
      return sendJson(200, products);
    }

    // 2. GET /api/products/:id
    if (method === 'GET' && pathname.startsWith('/api/products/')) {
      const prodId = pathname.replace('/api/products/', '');
      const prod = products.find(p => p.id === prodId);
      if (prod) return sendJson(200, prod);
      return sendJson(404, { message: 'Product not found' });
    }

    // 3. POST /api/inventory/reserve (THE ATOMIC RESERVATION ENGINE)
    if (method === 'POST' && pathname === '/api/inventory/reserve') {
      const idempotencyKey = req.headers['idempotency-key'];
      if (idempotencyKey && idempotencyKeys.has(idempotencyKey)) {
        logSystem('INFO', 'API-Gateway', `Idempotent request detected. Returning cached reservation response for key ${idempotencyKey}`);
        return sendJson(200, idempotencyKeys.get(idempotencyKey));
      }

      await acquireLock();
      try {
        const { productId, quantity = 1, userId = 'USR-001' } = jsonBody;
        const prod = products.find(p => p.id === productId);

        if (!prod) {
          return sendJson(404, { success: false, message: 'Product not found' });
        }

        // ATOMIC CONDITIONAL CHECK: available_quantity >= quantity
        if (prod.availableQuantity < quantity) {
          const conflictMsg = 'This item is currently reserved by another customer. It may become available again if their payment is not completed.';
          logSystem('WARN', 'Inventory-Service', `Concurrency Conflict: Available stock is ${prod.availableQuantity}. User ${userId} denied.`);
          return sendJson(409, {
            success: false,
            status: 'CONFLICT',
            availableStock: prod.availableQuantity,
            message: conflictMsg
          });
        }

        // WINNER: Execute atomic update
        prod.availableQuantity -= quantity;
        prod.reservedQuantity += quantity;

        const reservationId = 'RES-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-2026';
        const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
        const heldAt = new Date();
        const expiresAt = new Date(heldAt.getTime() + 5 * 60 * 1000); // 300 seconds

        const newReservation = {
          id: reservationId,
          orderId: orderId,
          productId: prod.id,
          productName: prod.name,
          productPrice: prod.price,
          productImage: prod.imageUrl,
          userId: userId,
          quantity: quantity,
          status: 'HELD',
          heldAt: heldAt.toISOString(),
          expiresAt: expiresAt.toISOString()
        };

        reservations.unshift(newReservation);

        logSystem('INFO', 'Inventory-Service', `Reservation ${reservationId} granted for product ${prod.id}. Stock locked for 5 minutes.`);

        emitEvent('inventory.reserved', {
          reservationId,
          orderId,
          productId: prod.id,
          userId,
          quantity,
          status: 'HELD',
          expiresAt: expiresAt.toISOString()
        }, 'inventory-service', 'order-service');

        const responseData = {
          success: true,
          reservationId,
          orderId,
          productId: prod.id,
          quantity,
          status: 'HELD',
          heldAt: heldAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
          remainingSeconds: 300,
          message: 'Item held securely. Complete payment within 5 minutes.'
        };

        if (idempotencyKey) {
          idempotencyKeys.set(idempotencyKey, responseData);
        }

        return sendJson(201, responseData);
      } finally {
        releaseLock();
      }
    }

    // 4. POST /api/payments/process (SAGA PAYMENT ORCHESTRATION)
    if (method === 'POST' && pathname === '/api/payments/process') {
      // Circuit Breaker check
      if (circuitBreaker.payment.state === 'OPEN') {
        const timeDiff = Date.now() - circuitBreaker.payment.lastFailureTime;
        if (timeDiff > 10000) {
          circuitBreaker.payment.state = 'HALF-OPEN';
          logSystem('WARN', 'Circuit-Breaker', 'Payment Circuit Breaker entered HALF-OPEN state (testing canary request).');
        } else {
          logSystem('ERROR', 'Circuit-Breaker', 'Payment Circuit Breaker is OPEN. Fast-failing downstream request.');
          return sendJson(503, {
            success: false,
            status: 'CIRCUIT_BREAKER_OPEN',
            message: 'Payment gateway circuit breaker is OPEN due to upstream outages. Retry in a few seconds.'
          });
        }
      }

      await acquireLock();
      try {
        const { orderId, reservationId, paymentMethod = 'UPI', simulateFailure = false, simulateTimeout = false } = jsonBody;
        const resObj = reservations.find(r => r.id === reservationId);

        if (!resObj) {
          return sendJson(404, { success: false, message: 'Reservation not found' });
        }

        const prod = products.find(p => p.id === resObj.productId);

        if (simulateTimeout) {
          logSystem('WARN', 'Payment-Service', `Payment Gateway Timeout encountered for Order ${orderId}. Verifying webhook before release.`);
          return sendJson(504, {
            success: false,
            status: 'PAYMENT_PENDING',
            message: 'Payment gateway timeout. System is checking final transaction status before releasing stock.'
          });
        }

        if (simulateFailure) {
          circuitBreaker.payment.failureCount++;
          if (circuitBreaker.payment.failureCount >= circuitBreaker.payment.threshold) {
            circuitBreaker.payment.state = 'OPEN';
            circuitBreaker.payment.lastFailureTime = Date.now();
            logSystem('ERROR', 'Circuit-Breaker', 'Payment threshold exceeded! Circuit Breaker TRIPPED to OPEN.');
          }

          // SAGA ROLLBACK: Return stock to available pool
          if (prod) {
            prod.availableQuantity += resObj.quantity;
            prod.reservedQuantity = Math.max(0, prod.reservedQuantity - resObj.quantity);
          }
          resObj.status = 'RELEASED';
          resObj.releaseReason = 'PAYMENT_FAILED';
          resObj.releasedAt = new Date().toISOString();

          emitEvent('payment.failed', { orderId, reservationId, reason: 'CARD_DECLINED_INSUFFICIENT_FUNDS' }, 'payment-service', 'inventory-service');
          emitEvent('inventory.released', { reservationId, productId: prod ? prod.id : '', reason: 'PAYMENT_FAILED' }, 'inventory-service', 'notification-service');

          logSystem('WARN', 'Payment-Service', `Payment failed for ${orderId}. Compensating transaction restored stock.`);

          return sendJson(400, {
            success: false,
            status: 'FAILED',
            message: 'Payment declined by issuing bank. Reserved inventory released back to public catalog.'
          });
        }

        // PAYMENT SUCCESS
        circuitBreaker.payment.failureCount = 0;
        circuitBreaker.payment.state = 'CLOSED';

        if (prod) {
          prod.reservedQuantity = Math.max(0, prod.reservedQuantity - resObj.quantity);
          prod.soldQuantity += resObj.quantity;
        }
        resObj.status = 'CONFIRMED';
        resObj.confirmedAt = new Date().toISOString();
        resObj.releaseReason = 'PAYMENT_SUCCESS';

        const transactionRef = 'TXN-' + paymentMethod + '-' + Math.random().toString(36).substring(2, 10).toUpperCase();

        payments.unshift({
          id: 'PAY-' + Math.floor(1000 + Math.random() * 9000),
          orderId,
          reservationId,
          amount: resObj.productPrice * resObj.quantity,
          paymentMethod,
          transactionRef,
          status: 'SUCCESS',
          timestamp: new Date().toISOString()
        });

        emitEvent('payment.succeeded', { orderId, reservationId, transactionRef, paymentMethod, status: 'SUCCESS' }, 'payment-service', 'order-service');
        emitEvent('order.confirmed', { orderId, reservationId, status: 'CONFIRMED' }, 'order-service', 'notification-service');

        logSystem('INFO', 'Payment-Service', `Payment confirmed for ${orderId} (${transactionRef}). Inventory permanently marked as SOLD.`);

        return sendJson(200, {
          success: true,
          status: 'SUCCESS',
          transactionRef,
          message: 'Payment processed successfully. Order confirmed!'
        });
      } finally {
        releaseLock();
      }
    }

    // 5. POST /api/demo/flash-sale (HIGH-CONCURRENCY MULTI-BUYER STRESS TEST)
    // Runs 10, 20, 50, or 100 simultaneous simulated buyer requests against PostgreSQL row lock!
    if (method === 'POST' && pathname === '/api/demo/flash-sale') {
      const { buyersCount = 50, productId = 'PROD-IPHONE17', stock = 1 } = jsonBody;

      // 1. Force set stock for the test
      const prod = products.find(p => p.id === productId);
      if (prod) {
        prod.totalQuantity = stock;
        prod.availableQuantity = stock;
        prod.reservedQuantity = 0;
        prod.soldQuantity = 0;
      }

      const startTime = Date.now();
      const results = [];

      // 2. Launch concurrent parallel requests
      const buyerPromises = Array.from({ length: buyersCount }).map(async (_, idx) => {
        const buyerId = `BUYER-${String(idx + 1).padStart(3, '0')}`;
        await acquireLock();
        try {
          if (prod.availableQuantity >= 1) {
            prod.availableQuantity -= 1;
            prod.reservedQuantity += 1;
            const resId = 'RES-FLASH-' + Math.random().toString(36).substring(2, 6).toUpperCase();
            results.push({
              buyerId,
              status: 'SUCCESS',
              code: 201,
              reservationId: resId,
              timestamp: new Date().toISOString()
            });
          } else {
            results.push({
              buyerId,
              status: 'CONFLICT',
              code: 409,
              message: 'This item is currently reserved by another customer. It may become available again if their payment is not completed.',
              timestamp: new Date().toISOString()
            });
          }
        } finally {
          releaseLock();
        }
      });

      await Promise.all(buyerPromises);
      const processingTimeMs = Date.now() - startTime;

      const successCount = results.filter(r => r.status === 'SUCCESS').length;
      const rejectedCount = results.filter(r => r.status === 'CONFLICT').length;
      const oversellingPrevented = (successCount === stock) && (prod.availableQuantity === 0);

      logSystem('INFO', 'Concurrency-Engine', `Flash Sale Simulation: ${buyersCount} buyers competed for ${stock} units. Success: ${successCount}, Rejected: ${rejectedCount}. Overselling Prevented: ${oversellingPrevented}`);

      return sendJson(200, {
        success: true,
        buyersCount,
        initialStock: stock,
        successCount,
        rejectedCount,
        remainingStock: prod.availableQuantity,
        reservedStock: prod.reservedQuantity,
        processingTimeMs,
        oversellingPrevented,
        verificationMessage: oversellingPrevented 
          ? 'OVERSELLING PREVENTED – Inventory remained consistent.' 
          : 'ERROR: Overselling detected!',
        results
      });
    }

    // 6. POST /api/demo/toggle-failure (CHAOS ENGINEERING / FAILURE SIMULATOR)
    if (method === 'POST' && pathname === '/api/demo/toggle-failure') {
      const { service, mode } = jsonBody; // service: 'kafkaBroker', 'paymentService', etc.
      if (serviceStatus[service]) {
        serviceStatus[service].status = mode; // 'HEALTHY', 'OUTAGE', 'DEGRADED'
        logSystem('WARN', 'Chaos-Simulator', `Simulated state change: Service [${service}] set to [${mode}]`);
      }
      return sendJson(200, { success: true, serviceStatus });
    }

    // 7. POST /api/demo/recover-outbox (TRANSACTIONAL OUTBOX RELAY)
    if (method === 'POST' && pathname === '/api/demo/recover-outbox') {
      let publishedCount = 0;
      for (const event of outboxEvents) {
        if (event.status === 'PENDING') {
          event.status = 'PUBLISHED';
          event.publishedAt = new Date().toISOString();
          kafkaStream.unshift({
            id: event.id,
            topic: event.topic,
            payload: event.payload,
            partition: 0,
            offset: kafkaStream.length + 1400,
            timestamp: new Date().toISOString(),
            status: 'RECOVERED_FROM_OUTBOX'
          });
          publishedCount++;
        }
      }
      logSystem('INFO', 'Transactional-Outbox', `Relayed and published ${publishedCount} pending outbox events to Kafka.`);
      return sendJson(200, { success: true, publishedCount, outboxEvents });
    }

    // 8. GET /api/system/health & METRICS
    if (method === 'GET' && pathname === '/api/system/health') {
      return sendJson(200, {
        timestamp: new Date().toISOString(),
        services: serviceStatus,
        circuitBreaker,
        outboxPendingCount: outboxEvents.filter(e => e.status === 'PENDING').length,
        dlqCount: deadLetterQueue.length,
        kafkaOffset: kafkaStream.length + 1400
      });
    }

    // 9. GET /api/system/logs
    if (method === 'GET' && pathname === '/api/system/logs') {
      return sendJson(200, systemLogs);
    }

    // 10. GET /api/events (Kafka Stream)
    if (method === 'GET' && pathname === '/api/events') {
      return sendJson(200, kafkaStream);
    }

    // 11. GET /api/dlq (Dead Letter Queue)
    if (method === 'GET' && pathname === '/api/dlq') {
      return sendJson(200, deadLetterQueue);
    }

    // 12. POST /api/wishlist/toggle
    if (method === 'POST' && pathname === '/api/wishlist/toggle') {
      const { productId } = jsonBody;
      if (wishlist.includes(productId)) {
        wishlist = wishlist.filter(id => id !== productId);
      } else {
        wishlist.push(productId);
      }
      return sendJson(200, { success: true, wishlist });
    }

    // 13. SERVE STATIC INDEX.HTML
    if (method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      const filePath = path.join(__dirname, 'index.html');
      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(500);
          res.end('Error loading index.html');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
      });
      return;
    }

    // 404 fallback
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`================================================================`);
  console.log(` SmartCart Advanced Cloud Computing API Server Started!        `);
  console.log(` Web UI:              http://localhost:${PORT}/                `);
  console.log(` Concurrency Engine:  Atomic Mutex & 100-Buyer Flash Tester    `);
  console.log(` Fault Tolerance:     Outbox Worker, Kafka Bus, DLQ, Circuit Breaker `);
  console.log(` System Monitoring:   http://localhost:${PORT}/api/system/health`);
  console.log(`================================================================`);
});
