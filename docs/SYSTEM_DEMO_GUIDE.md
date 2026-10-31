# SmartCart: Live Professor Demonstration & Defense Guide
## Scenarios A through I Step-by-Step Walkthrough

This document serves as the official script and presentation roadmap for the five-member project team during the live laboratory demonstration.

---

### Scenario A: Normal Purchase Flow
1. **Action:** Log in as **Alex Rivera (Customer A)** using the quick role switcher in the top navigation bar.
2. Navigate to **Products** and select **Samsung Galaxy S25 Ultra**.
3. Click **Buy Now (Instant Reserve)**.
4. **Demonstrate:**
   - The system creates a unique Reservation ID (e.g., `RES-4B71C9-2026`).
   - The 5-minute countdown starts (`05:00`).
   - The Available Stock drops from 8 to 7, and Reserved Stock increases from 2 to 3.
   - Enter mock shipping details and select **Simulate Payment Success**.
   - Click **Pay & Complete Order**.
5. **Outcome:**
   - Order status transitions to `CONFIRMED`.
   - Reserved stock converts to Sold stock (`reserved - 1, sold + 1`).
   - Transaction receipt and tracking number are generated.

---

### Scenario B: Two Users Buying the Last Product Simultaneously (The Core Race Condition)
> **Professor Attention:** This directly proves how PostgreSQL prevents overselling under extreme concurrency.

1. Navigate to the **"System Demo"** tab in the navigation bar.
2. Select **Scenario B: Two Users Buying the Last Product**.
3. Notice that target product **iPhone 17 Pro Max** has **Available Stock = 1**.
4. Both user cards are visible side-by-side:
   - **Left Panel:** Alex Rivera (User A)
   - **Right Panel:** Sarah Jenkins (User B)
5. Click **"Simulate Simultaneous Click"**.
6. Both requests hit the backend reservation engine within 2 milliseconds of each other.
7. **Observed Results:**
   - **User A (Winner):** Acquires the atomic PostgreSQL row lock. Available stock goes from 1 to 0. Receives HTTP `201 Created`, unique Reservation ID, and a live 5-minute checkout countdown.
   - **User B (Loser):** Conditional check `available_quantity >= 1` fails. Receives HTTP `409 Conflict` with the exact message:
     > *"This item is currently reserved by another customer. It may become available again if their payment is not completed."*
   - In the database, `available_quantity` is 0 and `reserved_quantity` is 1. **Zero overselling has occurred!**

---

### Scenario C: Payment Failure & Saga Rollback
1. Continue from Scenario B where User A is holding the last iPhone 17.
2. In User A's checkout simulator, select **"Simulate Payment Failure (Card Declined)"**.
3. Click **Proceed with Payment**.
4. **Observed Results:**
   - Bank simulation rejects transaction.
   - Payment Service emits `payment.failed` event to Kafka.
   - Inventory Service consumes event and executes compensating transaction (`reserved_quantity - 1`, `available_quantity + 1`).
   - User B's screen detects that stock has become available again and presents a notification: *"The reserved item is now available for purchase!"*

---

### Scenario D: Five-Minute Reservation Expiry & Auto-Release
1. User A reserves an item, starting the 300-second timer.
2. Rather than waiting 5 minutes in real time, click **"Fast Forward 5 Minutes (Simulate Expiry)"**.
3. **Observed Results:**
   - The scheduled reaper job detects `expiresAt <= NOW()`.
   - Reservation status transitions from `HELD` to `EXPIRED`.
   - Stock is restored from Reserved back to Available automatically.
   - User A's session is invalidated with warning: *"Checkout window expired. Inventory returned to public catalog."*

---

### Scenario E: Duplicate Buy Request (Idempotency Key)
1. Click **"Test Rapid Clicks (5x in 100ms)"** with the same `Idempotency-Key`.
2. **Observed Results:**
   - First request processes and decrements stock.
   - Requests 2 through 5 detect existing idempotency key in cache/DB and return the identical reservation without decrementing stock 5 times.

---

### Scenario F: Kafka Outage & Transactional Outbox
1. Toggle **"Simulate Kafka Broker Disconnect"**.
2. Perform a reservation.
3. Show that the reservation succeeds in PostgreSQL and the event is written to `outbox_events` with status `PENDING`.
4. Toggle Kafka back online.
5. The outbox relay worker polls `outbox_events`, publishes the event, and updates status to `PUBLISHED`.
6. Demonstrates fault tolerance and zero message loss.

---

### Scenario G: Dead Letter Queue (DLQ)
1. Inject a poisoned message into the payment event stream.
2. The consumer attempts 3 retries with exponential backoff.
3. Upon 3rd failure, the message is routed to `smartcart.payment.DLQ` and flagged in the Admin Dashboard with an error stack trace.

