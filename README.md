# SmartCart – Advanced Smart E-Commerce Order Processing Platform
### College Cloud Computing & Microservices Capstone Project

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.4-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Apache Kafka](https://img.shields.io/badge/Apache%20Kafka-KRaft%207.6-red.svg)](https://kafka.apache.org/)
[![React](https://img.shields.io/badge/React-18-cyan.svg)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker%20Compose-v3.8-blue.svg)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/Tests-19%2F19%20Passed-success.svg)](test_concurrency.js)

---

## 1. Quick Start & Execution

### Option A: Instant 1-Click Launch (Recommended for Live Defense)
Double-click [**`start-app.bat`**](file:///c:/Users/acer/Desktop/Stock%20Sentry/start-app.bat) in Windows Explorer.
1. Launches the backend server on `http://localhost:3000`.
2. Automatically opens the application in your default web browser.

### Option B: Run Automated Concurrency Tests
Verify zero overselling, 50-buyer atomic locking, idempotency, and outbox recovery:
```cmd
node.cmd test_concurrency.js
```
*(All 19/19 tests pass with 100% success rate!)*

### Option C: Standalone Browser Launch (Zero-Setup)
Double-click [**`index.html`**](file:///c:/Users/acer/Desktop/Stock%20Sentry/index.html) in any web browser (Chrome, Edge).

---

## 2. All Working Pages & Advanced Features

| Page | Key Capabilities |
|---|---|
| **Homepage** | Hero banner, Flash Sale countdown, Trending products, Customer testimonials, Newsletter, Value pillars |
| **Product Catalogue** | Category filters, price range slider ($200 to $2,500), stock telemetry, sorting, search, Wishlist toggle |
| **Product Details** | High-res image gallery, technical specifications table, quantity selector, Instant Reserve button |
| **Shopping Cart** | Quantity stepper, remove, coupon codes (`SMARTCART10` for 10% off, `CLOUD50` for 20% off), checkout |
| **Flash Sale Simulator** | High-concurrency test: **10, 20, 50, or 100 concurrent buyers** on stock = 1 with certified verification: `"OVERSELLING PREVENTED – Inventory remained consistent."` |
| **System Architecture** | Interactive topology diagram: `Client -> Gateway -> Order -> Inventory -> Payment -> Kafka -> Notification` + PostgreSQL & Redis nodes |
| **Failure Simulation Lab** | Chaos engineering: Toggle Kafka Broker Outage (buffers in Outbox), Payment Timeout, and Circuit Breaker (Resilience4j) |
| **Real-Time Analytics** | Interactive SVG charts: Inventory distribution (Available vs Reserved vs Sold), revenue trends, and conversion rate |
| **System Monitoring** | Microservices health badges, response latency (p95), error rates, and live scrolling logs |
| **10-Scenario Demo** | Step-by-step presentation lab covering Scenarios 1 through 10 for college grading |
| **Admin Dashboard** | Product CRUD, Live Inventory Matrix with +5 quick restock, Active reservations manager with Force Release |
| **Customer Dashboard** | User Profile, Wishlist manager, Active reservations with countdown, and Orders with interactive timeline |

---

## 3. Technology Stack

| Layer | Technology | Key Responsibility |
|---|---|---|
| **Frontend** | React 18, Tailwind CSS, Lucide Icons | Dark/Light mode, live countdown tickers, interactive SVG charts |
| **API Gateway** | Spring Cloud Gateway / Node.js Proxy | Centralized routing, CORS, rate limiting, token validation |
| **Core Microservices** | Java 21, Spring Boot 3.3 | Independent services for User, Product, Inventory, Order, Payment, Notification |
| **Relational Database** | PostgreSQL 16 | ACID transactions, row-level locks, transactional outbox |
| **Event Broker** | Apache Kafka 7.6 (KRaft mode) | Asynchronous event streaming (`inventory.reserved`, `payment.failed`, etc.) |
| **Cache & Locks** | Redis 7.2 | Distributed locks and idempotency caching |
| **Orchestration** | Docker & Docker Compose | Multi-container microservices deployment |

---

## 4. Key Endpoints & Postman Collection

Import [**`docs/SmartCart_Postman_Collection.json`**](file:///c:/Users/acer/Desktop/Stock%20Sentry/docs/SmartCart_Postman_Collection.json) into Postman:

- `GET /api/products`: Retrieve product catalogue
- `POST /api/inventory/reserve`: Atomic reservation with `Idempotency-Key`
- `POST /api/payments/process`: Payment processing with simulated success/failure/timeout
- `POST /api/demo/flash-sale`: 100-buyer concurrent stress test
- `POST /api/demo/toggle-failure`: Chaos testing (Kafka outage, circuit breaker)
- `GET /api/system/health`: Microservices health and telemetry metrics
- `GET /api/events`: Live Apache Kafka event stream

---

## 5. College Defense Team Roles (5 Members)

| Member | Focus Area | Detailed Script Reference |
|---|---|---|
| **Member 1** | Team Lead & UI/UX | [SYSTEM_DEMO_GUIDE.md](file:///c:/Users/acer/Desktop/Stock%20Sentry/docs/SYSTEM_DEMO_GUIDE.md) &mdash; Walkthrough of Catalog, Cart, and Customer Dashboard |
| **Member 2** | Concurrency & Database Lead | [ARCHITECTURE.md](file:///c:/Users/acer/Desktop/Stock%20Sentry/docs/ARCHITECTURE.md) &mdash; Flash Sale Simulator (100 buyers) & PostgreSQL conditional updates |
| **Member 3** | Microservices Architect | [microservices/](file:///c:/Users/acer/Desktop/Stock%20Sentry/microservices/) &mdash; Spring Boot services, Spring Cloud Gateway, Saga Orchestrator |
| **Member 4** | Event-Driven & Kafka Lead | [docs/API_SPECIFICATION.md](file:///c:/Users/acer/Desktop/Stock%20Sentry/docs/API_SPECIFICATION.md) &mdash; Kafka KRaft, Transactional Outbox, Consumer Groups, DLQ |
| **Member 5** | DevOps & Resilience Lead | [microservices/docker-compose.yml](file:///c:/Users/acer/Desktop/Stock%20Sentry/microservices/docker-compose.yml) &mdash; Failure Lab, Circuit Breaker, Docker orchestration |
