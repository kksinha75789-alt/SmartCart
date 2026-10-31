# SmartCart REST API & Kafka Event Contract Specification

## 1. REST Endpoints

### Authentication & Users (`/api/auth`)
- `POST /api/auth/login`: Authenticate with email & password. Returns JWT token and user profile.
- `POST /api/auth/register`: Create a new customer profile.
- `GET /api/auth/profile`: Get current logged-in user profile.
- `GET /api/auth/users`: (Admin) List all registered users.

### Product Catalog (`/api/products`)
- `GET /api/products`: Retrieve all products with category, price, and search filters.
- `GET /api/products/{id}`: Retrieve single product with full specifications and live inventory numbers.
- `POST /api/products`: (Admin) Add new product.
- `PUT /api/products/{id}`: (Admin) Update product details.
- `DELETE /api/products/{id}`: (Admin) Delete product.

### Smart Inventory & Reservation (`/api/inventory`)
- `POST /api/inventory/reserve`:
  - **Headers:** `Idempotency-Key: <UUID>`
  - **Body:** `{ "productId": "PROD-IPHONE17", "quantity": 1, "userId": "USR-001" }`
  - **Success Response (201):**
    ```json
    {
      "success": true,
      "reservationId": "RES-8F29A4-2026",
      "orderId": "ORD-419208",
      "productId": "PROD-IPHONE17",
      "quantity": 1,
      "status": "HELD",
      "heldAt": "2026-10-30T18:00:00Z",
      "expiresAt": "2026-10-30T18:05:00Z",
      "remainingSeconds": 300,
      "message": "Item held securely. Complete payment within 5 minutes."
    }
    ```
  - **Conflict Response (409):**
    ```json
    {
      "success": false,
      "status": "AVAILABLE",
      "availableStock": 0,
      "message": "This item is currently reserved by another customer. It may become available again if their payment is not completed."
    }
    ```
- `POST /api/inventory/confirm/{reservationId}`: Finalizes reservation as sold.
- `POST /api/inventory/release/{reservationId}`: Releases reservation back to available stock.
- `GET /api/inventory/status/{productId}`: Returns available, reserved, and sold quantities.
- `GET /api/inventory/reservations`: Lists all active and historical reservations.

### Orders (`/api/orders`)
- `POST /api/orders`: Create order with items, subtotal, and shipping address.
- `GET /api/orders`: List all orders across all users (Admin).
- `GET /api/orders/user/{userId}`: List orders for specific customer.
- `GET /api/orders/{id}`: Retrieve detailed order summary and status timeline.
- `PUT /api/orders/{id}/status`: Advance or cancel order status.

### Payments (`/api/payments`)
- `POST /api/payments/process`:
  - **Body:** `{ "orderId": "ORD-1001", "reservationId": "RES-8F29A4-2026", "paymentMethod": "UPI", "simulateFailure": false }`
  - **Success Response (200):** `{ "success": true, "status": "SUCCESS", "transactionRef": "TXN-UPI-9912", "message": "Payment processed successfully." }`
  - **Failure Response (400):** `{ "success": false, "status": "FAILED", "transactionRef": "TXN-UPI-9913", "message": "Payment declined by issuing bank." }`

---

## 2. Kafka Event Stream Topics

| Topic | Key | Payload Schema | Produced By | Consumed By |
|---|---|---|---|---|
| `inventory.reserved` | `productId` | `{ reservationId, orderId, productId, userId, quantity, status: 'HELD', expiresAt }` | Inventory Service | Order Service, Notification Service |
| `inventory.released` | `productId` | `{ reservationId, productId, quantity, reason: 'PAYMENT_FAILED' \| 'TIMEOUT_EXPIRED' }` | Inventory Service | Notification Service |
| `payment.succeeded` | `orderId` | `{ orderId, reservationId, transactionRef, amount, paymentMethod }` | Payment Service | Inventory Service, Order Service, Notification Service |
| `payment.failed` | `orderId` | `{ orderId, reservationId, reason, timestamp }` | Payment Service | Inventory Service (triggers rollback), Order Service |
| `order.confirmed` | `orderId` | `{ orderId, userId, totalAmount, status: 'CONFIRMED' }` | Order Service | Notification Service, Analytics |
| `order.dlq` | `eventId` | `{ failedEvent, error, retryCount: 3, timestamp }` | Any Service | Admin Monitor |

