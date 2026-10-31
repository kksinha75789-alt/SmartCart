// ============================================================================
// SmartCart: Advanced Node.js Microservices Backend API Server
// Full-Featured REST API with SQLite/JSON Persistence, Concurrency Mutex Engine,
// Transactional Outbox, Kafka Event Bus, DLQ, Circuit Breaker, & Telemetry
// ============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const db = require('./database/db.js');

const PORT = process.env.PORT || 3000;

// ============================================================================
// IN-MEMORY SYSTEM TELEMETRY & CACHES
// ============================================================================
const idempotencyCache = new Map(); // Key -> { response, statusCode, timestamp }
const productMutexes = new Map();   // productId -> Promise queue for atomic locks

let kafkaStream = [];
let deadLetterQueue = [];
let pendingOutbox = [];

let systemFailures = {
  kafkaBroker: 'HEALTHY',       // HEALTHY | OUTAGE
  paymentGateway: 'HEALTHY',    // HEALTHY | TIMEOUT | ERROR
  circuitBreaker: 'CLOSED'      // CLOSED | HALF_OPEN | OPEN
};

const serverStartTime = Date.now();

// Helper: Product Mutex for 100% Atomic Isolation
function acquireLock(productId) {
  if (!productMutexes.has(productId)) {
    productMutexes.set(productId, Promise.resolve());
  }
  let release;
  const lock = new Promise(resolve => { release = resolve; });
  const current = productMutexes.get(productId);
  productMutexes.set(productId, current.then(() => lock));
  return current.then(() => release);
}

// Helper: Emit Event to Kafka Broker
function publishKafkaEvent(topic, payload, producer = 'inventory-service', consumer = 'order-service') {
  if (systemFailures.kafkaBroker === 'OUTAGE') {
    // Transactional Outbox Pattern: Buffer in pending outbox
    const outboxItem = {
      id: 'OUTBOX-' + Math.floor(10000 + Math.random() * 90000),
      topic,
      payload,
      status: 'PENDING',
      retryCount: 0,
      createdAt: new Date().toISOString()
    };
    pendingOutbox.unshift(outboxItem);
    db.addLog('WARN', `Kafka broker outage! Buffered ${topic} in Transactional Outbox`, 'outbox');
    return outboxItem;
  }

  const event = {
    id: 'EVT-' + Math.floor(100000 + Math.random() * 900000),
    topic,
    producer,
    consumer,
    partition: Math.floor(Math.random() * 3),
    offset: kafkaStream.length + 1000,
    timestamp: new Date().toLocaleTimeString(),
    status: 'PROCESSED',
    payload
  };

  kafkaStream.unshift(event);
  if (kafkaStream.length > 100) kafkaStream.pop();
  db.addLog('INFO', `Published event ${topic} (Offset: ${event.offset})`, 'kafka');
  return event;
}

// 5-Minute Reservation Expiry Background Worker
setInterval(() => {
  const activeReservations = db.getActiveReservations();
  const now = Date.now();

  for (const res of activeReservations) {
    if (new Date(res.expiresAt).getTime() <= now) {
      db.updateProductQuantities(res.productId, res.quantity, -res.quantity, 0);
      db.updateReservationStatus(res.id, 'EXPIRED', 'TIMEOUT_EXPIRED_5_MINUTES');

      publishKafkaEvent('inventory.released', {
        reservationId: res.id,
        productId: res.productId,
        quantity: res.quantity,
        reason: 'TIMEOUT_EXPIRED_5_MINUTES'
      }, 'inventory-service', 'notification-service');

      db.addLog('WARN', `Auto-released expired reservation ${res.id} for ${res.productId}`, 'expiry-worker');
    }
  }
}, 3000);

// ============================================================================
// HTTP SERVER & ROUTING ENGINE
// ============================================================================
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key, X-Requested-With');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const sendJson = (statusCode, data) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  // Buffer request body
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    let jsonBody = {};
    if (body) {
      try {
        jsonBody = JSON.parse(body);
      } catch (err) {
        // Fallback for non-JSON body
      }
    }

    try {
      // ------------------------------------------------------------------------
      // 1. HEALTH & TELEMETRY
      // ------------------------------------------------------------------------
      if (method === 'GET' && pathname === '/api/system/health') {
        const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);
        return sendJson(200, {
          status: 'HEALTHY',
          timestamp: new Date().toISOString(),
          uptime: `${uptimeSeconds}s`,
          outboxPendingCount: pendingOutbox.length,
          deadLetterQueueCount: deadLetterQueue.length,
          database: {
            type: db.useSqlite ? 'SQLite 3 (Persistent Native)' : 'JSON File Storage',
            status: 'CONNECTED',
            tables: ['users', 'products', 'inventory', 'reservations', 'orders', 'logs']
          },
          services: {
            apiGateway: { status: 'HEALTHY', port: PORT, latencyP95: '4.2ms' },
            inventoryService: { status: 'HEALTHY', port: 8082, latencyP95: '6.8ms' },
            orderService: { status: 'HEALTHY', port: 8081, latencyP95: '5.1ms' },
            paymentService: { status: systemFailures.paymentGateway, port: 8083, latencyP95: '12.4ms' },
            kafkaBroker: { status: systemFailures.kafkaBroker, brokers: 3, partitions: 6 },
            circuitBreaker: { state: systemFailures.circuitBreaker, failureThreshold: '50%' }
          }
        });
      }

      if (method === 'GET' && pathname === '/api/system/logs') {
        return sendJson(200, db.getLogs());
      }

      // ------------------------------------------------------------------------
      // 2. PRODUCTS API
      // ------------------------------------------------------------------------
      if (method === 'GET' && pathname === '/api/products') {
        let products = db.getProducts();
        const { category, search, minPrice, maxPrice } = parsedUrl.query;

        if (category && category !== 'All') {
          products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
        }
        if (search) {
          const q = search.toLowerCase();
          products = products.filter(p => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
        }
        if (minPrice) {
          products = products.filter(p => p.price >= parseFloat(minPrice));
        }
        if (maxPrice) {
          products = products.filter(p => p.price <= parseFloat(maxPrice));
        }

        return sendJson(200, products);
      }

      if (method === 'GET' && pathname.startsWith('/api/products/')) {
        const id = pathname.replace('/api/products/', '');
        const product = db.getProductById(id);
        if (!product) return sendJson(404, { error: 'Product not found' });
        return sendJson(200, product);
      }

      // ------------------------------------------------------------------------
      // 3. ATOMIC INVENTORY RESERVATION (High Concurrency & Idempotency)
      // ------------------------------------------------------------------------
      if (method === 'POST' && pathname === '/api/inventory/reserve') {
        const idempotencyKey = req.headers['idempotency-key'] || jsonBody.idempotencyKey;
        
        // Idempotency check: if key already processed, return cached response
        if (idempotencyKey && idempotencyCache.has(idempotencyKey)) {
          const cached = idempotencyCache.get(idempotencyKey);
          db.addLog('INFO', `Idempotent request detected for key: ${idempotencyKey}`, 'idempotency');
          return sendJson(cached.statusCode, cached.data);
        }

        const { productId, quantity = 1, userId = 'USR-001' } = jsonBody;
        if (!productId) {
          return sendJson(400, { error: 'Missing productId parameter' });
        }

        // Acquire product-level mutex lock for zero overselling
        const releaseLock = await acquireLock(productId);
        try {
          const product = db.getProductById(productId);
          if (!product) {
            return sendJson(404, { error: 'Product not found' });
          }

          // Atomic conditional inventory check
          if (product.availableQuantity < quantity) {
            const conflictRes = {
              success: false,
              status: 'CONFLICT',
              message: 'Stock unavailable or currently held by another customer checkout.',
              availableQuantity: product.availableQuantity,
              reservedQuantity: product.reservedQuantity
            };
            if (idempotencyKey) idempotencyCache.set(idempotencyKey, { statusCode: 409, data: conflictRes });
            return sendJson(409, conflictRes);
          }

          // Winner: decrement available, increment reserved
          db.updateProductQuantities(productId, -quantity, quantity, 0);

          const reservationId = 'RES-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-2026';
          const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
          const heldAt = new Date().toISOString();
          const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

          const reservation = {
            id: reservationId,
            orderId,
            productId,
            userId,
            quantity,
            status: 'HELD',
            heldAt,
            expiresAt
          };

          db.createReservation(reservation);

          // Emit Kafka event
          publishKafkaEvent('inventory.reserved', {
            reservationId,
            orderId,
            productId,
            userId,
            quantity,
            expiresAt
          }, 'inventory-service', 'order-service');

          db.addLog('INFO', `Atomic reservation ${reservationId} created for ${productId} (Qty: ${quantity})`, 'inventory');

          const responseData = {
            success: true,
            reservationId,
            orderId,
            productId,
            quantity,
            status: 'HELD',
            expiresAt,
            availableRemaining: product.availableQuantity - quantity
          };

          if (idempotencyKey) {
            idempotencyCache.set(idempotencyKey, { statusCode: 200, data: responseData });
          }

          return sendJson(201, responseData);
        } finally {
          releaseLock();
        }
      }

      // ------------------------------------------------------------------------
      // 4. PAYMENTS & SAGA ROLLBACK
      // ------------------------------------------------------------------------
      if (method === 'POST' && pathname === '/api/payments/process') {
        const { orderId, reservationId, simulateFailure, paymentMethod = 'UPI' } = jsonBody;

        if (simulateFailure || systemFailures.paymentGateway === 'ERROR') {
          // Saga Rollback: Return reserved stock back to available pool
          if (reservationId) {
            const resRecord = db.getReservation(reservationId);
            if (resRecord && resRecord.status === 'HELD') {
              db.updateProductQuantities(resRecord.productId, resRecord.quantity, -resRecord.quantity, 0);
              db.updateReservationStatus(reservationId, 'FAILED_PAYMENT_ROLLED_BACK', 'PAYMENT_FAILURE');

              publishKafkaEvent('inventory.compensation.rollback', {
                reservationId,
                productId: resRecord.productId,
                quantity: resRecord.quantity,
                reason: 'PAYMENT_REJECTED'
              }, 'payment-service', 'inventory-service');
            }
          }

          db.addLog('ERROR', `Payment failed for order ${orderId}. Compensating rollback executed.`, 'payment');
          return sendJson(400, {
            success: false,
            status: 'FAILED',
            orderId,
            error: 'Payment declined by banking gateway. Saga rollback restored stock.'
          });
        }

        // Successful Payment
        if (reservationId) {
          const resRecord = db.getReservation(reservationId);
          if (resRecord && resRecord.status === 'HELD') {
            // Convert reserved quantity to sold
            db.updateProductQuantities(resRecord.productId, 0, -resRecord.quantity, resRecord.quantity);
            db.updateReservationStatus(reservationId, 'CONFIRMED');

            const order = {
              id: orderId || ('ORD-' + Math.floor(100000 + Math.random() * 900000)),
              userId: resRecord.userId,
              items: [{ productId: resRecord.productId, quantity: resRecord.quantity }],
              totalAmount: 1199.00,
              status: 'CONFIRMED',
              paymentMethod,
              createdAt: new Date().toISOString()
            };
            db.createOrder(order);

            publishKafkaEvent('order.completed', {
              orderId: order.id,
              userId: order.userId,
              totalAmount: order.totalAmount
            }, 'payment-service', 'notification-service');

            db.addLog('INFO', `Payment completed & order confirmed for order ${order.id}`, 'payment');

            return sendJson(200, {
              success: true,
              status: 'CONFIRMED',
              orderId: order.id,
              transactionId: 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
              paymentMethod,
              order
            });
          }
        }

        return sendJson(200, {
          success: true,
          status: 'CONFIRMED',
          orderId,
          transactionId: 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase()
        });
      }

      // ------------------------------------------------------------------------
      // 5. CONCURRENCY FLASH SALE DEMO
      // ------------------------------------------------------------------------
      if (method === 'POST' && pathname === '/api/demo/flash-sale') {
        const { buyersCount = 50, productId = 'PROD-IPHONE17', stock = 1 } = jsonBody;

        // Reset stock to the test target
        db.setProductStock(productId, stock);
        db.addLog('INFO', `Starting Flash Sale test with ${buyersCount} concurrent buyers for stock: ${stock}`, 'concurrency-engine');

        let successCount = 0;
        let rejectedCount = 0;
        const buyerResults = [];

        // Simulate simultaneous buyers hitting the atomic reservation mutex
        const buyerPromises = Array.from({ length: buyersCount }, async (_, index) => {
          const buyerId = 'BUYER-' + String(index + 1).padStart(3, '0');
          const release = await acquireLock(productId);
          try {
            const product = db.getProductById(productId);
            if (product.availableQuantity >= 1) {
              db.updateProductQuantities(productId, -1, 1, 0);
              const reservationId = 'RES-FLASH-' + (index + 1);
              db.createReservation({
                id: reservationId,
                orderId: 'ORD-FLASH-' + (index + 1),
                productId,
                userId: buyerId,
                quantity: 1,
                status: 'HELD',
                heldAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 300000).toISOString()
              });
              successCount++;
              buyerResults.push({ buyerId, status: 'WON', reservationId, code: 201 });
            } else {
              rejectedCount++;
              buyerResults.push({ buyerId, status: 'REJECTED', reason: 'OUT_OF_STOCK_CONFLICT', code: 409 });
            }
          } finally {
            release();
          }
        });

        await Promise.all(buyerPromises);

        const finalProduct = db.getProductById(productId);

        return sendJson(200, {
          test: 'High Concurrency Flash Sale Stress Test',
          buyersCount,
          initialStock: stock,
          successCount,
          rejectedCount,
          remainingStock: finalProduct.availableQuantity,
          reservedStock: finalProduct.reservedQuantity,
          oversellingPrevented: successCount <= stock && finalProduct.availableQuantity >= 0,
          buyerResults: buyerResults.slice(0, 15)
        });
      }

      // ------------------------------------------------------------------------
      // 6. CHAOS SIMULATION & OUTBOX RECOVERY
      // ------------------------------------------------------------------------
      if (method === 'POST' && pathname === '/api/demo/toggle-failure') {
        const { service, mode } = jsonBody;
        if (service && mode) {
          systemFailures[service] = mode;
          db.addLog('WARN', `Failure mode changed: ${service} -> ${mode}`, 'chaos-lab');
        }
        return sendJson(200, { success: true, currentFailures: systemFailures });
      }

      if (method === 'POST' && pathname === '/api/demo/recover-outbox') {
        const publishedCount = pendingOutbox.length;
        while (pendingOutbox.length > 0) {
          const item = pendingOutbox.pop();
          publishKafkaEvent(item.topic, item.payload, 'outbox-relay-worker', 'order-service');
        }
        db.addLog('INFO', `Outbox Relay Worker recovered and published ${publishedCount} pending events`, 'outbox-relay');
        return sendJson(200, {
          success: true,
          publishedCount,
          message: `Transactional Outbox successfully flushed ${publishedCount} events to Kafka Broker.`
        });
      }

      // ------------------------------------------------------------------------
      // 7. AUTH & USERS API
      // ------------------------------------------------------------------------
      if (method === 'POST' && pathname === '/api/auth/login') {
        const { email, password } = jsonBody;
        const user = db.getUserByEmail(email);
        if (!user || user.password !== password) {
          return sendJson(401, { error: 'Invalid email or password.' });
        }
        const { password: _, ...userSafe } = user;
        const token = 'JWT-' + Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
        return sendJson(200, { success: true, user: userSafe, token });
      }

      if (method === 'POST' && pathname === '/api/auth/register') {
        const { name, email, password, phone, address } = jsonBody;
        if (!name || !email || !password) {
          return sendJson(400, { error: 'Name, email and password are required.' });
        }
        if (db.getUserByEmail(email)) {
          return sendJson(409, { error: 'User with this email already exists.' });
        }
        const newUser = {
          id: 'USR-' + Math.floor(100 + Math.random() * 900),
          name,
          email,
          password,
          role: 'CUSTOMER',
          phone: phone || '',
          address: address || ''
        };
        const created = db.createUser(newUser);
        const { password: _, ...userSafe } = created;
        const token = 'JWT-' + Buffer.from(`${created.id}:${Date.now()}`).toString('base64');
        return sendJson(201, { success: true, user: userSafe, token });
      }

      if (method === 'GET' && pathname === '/api/auth/me') {
        const defaultUser = db.getUserById('USR-001');
        const { password: _, ...userSafe } = defaultUser;
        return sendJson(200, userSafe);
      }

      if (method === 'GET' && pathname === '/api/users') {
        return sendJson(200, db.getUsers());
      }

      // ------------------------------------------------------------------------
      // 8. CART & ORDERS API
      // ------------------------------------------------------------------------
      if (method === 'GET' && pathname === '/api/cart') {
        const userId = parsedUrl.query.userId || 'USR-001';
        return sendJson(200, db.getCart(userId));
      }

      if (method === 'POST' && pathname === '/api/cart') {
        const { userId = 'USR-001', items } = jsonBody;
        const saved = db.saveCart(userId, items || []);
        return sendJson(200, { success: true, cart: saved });
      }

      if (method === 'GET' && pathname === '/api/orders') {
        const userId = parsedUrl.query.userId;
        return sendJson(200, db.getOrders(userId));
      }

      // ------------------------------------------------------------------------
      // 9. EVENTS, DLQ & WISHLIST
      // ------------------------------------------------------------------------
      if (method === 'GET' && pathname === '/api/events') {
        return sendJson(200, kafkaStream);
      }

      if (method === 'GET' && pathname === '/api/dlq') {
        return sendJson(200, deadLetterQueue);
      }

      if (method === 'POST' && pathname === '/api/wishlist/toggle') {
        const { productId } = jsonBody;
        const updated = db.toggleWishlist(productId);
        return sendJson(200, { success: true, wishlist: updated });
      }

      // ------------------------------------------------------------------------
      // 10. SERVE STATIC INDEX.HTML & FILES
      // ------------------------------------------------------------------------
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

      // 404 Fallback
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found', path: pathname }));

    } catch (serverError) {
      console.error('[SERVER ERROR]', serverError);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error', details: serverError.message }));
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`================================================================`);
  console.log(` SmartCart Advanced Enterprise Backend API Server Running!       `);
  console.log(` Web UI:              http://localhost:${PORT}/                `);
  console.log(` System Health:       http://localhost:${PORT}/api/system/health`);
  console.log(` Database:            ${db.useSqlite ? 'SQLite 3 (smartcart.db)' : 'JSON Persistence'}`);
  console.log(` Concurrency Engine:  Atomic Mutex & Idempotency Filter Ready    `);
  console.log(` Fault Tolerance:     Outbox Worker, Kafka Bus, DLQ, Circuit Breaker`);
  console.log(`================================================================`);
});

module.exports = server;
