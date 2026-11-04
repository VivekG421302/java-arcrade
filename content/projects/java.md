## URL Shortener Service
Level: Beginner
Stack: Spring Boot, MySQL, Redis, Docker

### What it should do
Accept a long URL and return a short code (`POST /api/links`), redirect visitors from `GET /{code}` to the original URL with an HTTP 302, support optional custom aliases and expiry dates, and expose per-link click counts (`GET /api/links/{code}/stats`).

### How the tech flows
1. Client sends `POST /api/links` with the long URL → Spring MVC controller validates it (scheme, length, blocklist).
2. Service asks a counter (a MySQL sequence or Redis `INCR`) for the next id → encodes it as a base62 string, which is the short code.
3. Repository saves `(id, code, url, expires_at)` in MySQL through JPA.
4. A visitor calls `GET /{code}` → the service reads Redis first (cache-aside), falls back to MySQL on a miss, then fills the cache with a TTL.
5. The controller answers `302 Location: <url>`; the click is recorded asynchronously (`@Async` or a queue) so the redirect stays fast.

### Problems it solves
- Collision-free, short, unguessable-enough identifiers (base62 of a counter vs hashing).
- Read-heavy traffic: a cache in front of the database keeps redirects in single-digit milliseconds.
- Expired and malicious links: validation, expiry and a blocklist.
- Keeping analytics writes off the redirect path.

## Inventory and Billing REST API
Level: Beginner to Intermediate
Stack: Spring Boot, Spring Data JPA, Hibernate, MySQL, Bean Validation

### What it should do
Manage products, stock, customers and invoices for a small shop: CRUD for products, create an invoice with line items, reduce stock when an invoice is confirmed, list and filter invoices with pagination, and produce an invoice PDF or printable HTML.

### How the tech flows
1. Request → controller → DTO validation (`@Valid`) → service method annotated `@Transactional`.
2. The service loads products with a locking strategy (optimistic `@Version` or `PESSIMISTIC_WRITE`), checks stock, builds `Invoice` and `InvoiceLine` entities.
3. JPA flushes the invoice, its lines and the stock updates in one database transaction; any exception rolls everything back.
4. Read endpoints use projections and `Pageable` queries with `JOIN FETCH` to avoid N+1.
5. A global `@ControllerAdvice` converts exceptions into consistent error JSON.

### Problems it solves
- Overselling: two cashiers selling the last item at the same time (concurrency control).
- Partial writes: stock reduced but invoice not saved (transaction boundaries).
- N+1 queries and slow list pages (fetch strategy, pagination, indexes).
- Money bugs: `BigDecimal`, rounding rules and tax calculation done in one place.

## Authentication Service with JWT and RBAC
Level: Intermediate
Stack: Spring Security, JWT, BCrypt, MySQL, Redis

### What it should do
Register and log in users, issue short-lived access tokens plus refresh tokens, enforce role-based access (`USER`, `MANAGER`, `ADMIN`) on endpoints, support logout and token revocation, and lock an account after repeated failed logins.

### How the tech flows
1. `POST /auth/register` → password hashed with BCrypt → user and default role stored.
2. `POST /auth/login` → `AuthenticationManager` verifies credentials → service signs an access JWT (15 min) and creates a refresh token stored (hashed) in the database.
3. For every API call a `OncePerRequestFilter` reads the `Authorization: Bearer` header, verifies signature and expiry, and puts an `Authentication` with authorities into the `SecurityContext`.
4. `SecurityFilterChain` rules and `@PreAuthorize` check roles; failures return 401 (no/invalid token) or 403 (not allowed).
5. `POST /auth/refresh` rotates the refresh token; logout adds the token id to a Redis denylist until it expires.

### Problems it solves
- Storing passwords safely (adaptive hashing, never reversible).
- Stateless scaling: no server-side sessions, any instance can verify a token.
- Stolen tokens: short lifetime, refresh rotation and a denylist.
- Brute-force attacks: attempt counters and temporary lockouts.

## Rate Limiter as a Spring Boot Starter
Level: Intermediate
Stack: Spring Boot auto-configuration, Redis, Lua, Micrometer

### What it should do
Provide a reusable library: annotate a controller method with `@RateLimit(permits = 100, per = "1m", key = "ip")` and requests beyond the limit receive HTTP 429 with a `Retry-After` header. It must be correct when many application instances share one Redis.

### How the tech flows
1. The starter registers an aspect or interceptor through `spring.factories` / auto-configuration, so adding the dependency is enough.
2. On each call the interceptor builds a key (`ratelimit:{route}:{ip or user}`).
3. It runs an atomic Lua script in Redis implementing a token bucket (read tokens, refill by elapsed time, subtract one, store) in a single round trip.
4. The script returns allowed / remaining / retry-after; the interceptor either continues the chain or writes the 429 response.
5. Micrometer counters expose allowed vs rejected requests for dashboards and alerts.

### Problems it solves
- Protecting APIs from abuse and accidental overload.
- Race conditions between instances (atomic script instead of read-then-write).
- Burst tolerance (token bucket) compared with a rigid fixed window.
- Reuse: one tested library instead of copy-pasted filters in every service.

## Event-Driven Order Pipeline
Level: Advanced
Stack: Spring Boot, Apache Kafka, MySQL, Outbox pattern, Docker Compose

### What it should do
Orders flow through separate services: Order → Payment → Inventory → Shipping. Each step publishes an event, failures trigger compensating actions (cancel, refund, restock), and the same event delivered twice never causes a double charge.

### How the tech flows
1. Order Service saves the order and an `outbox` row in the same transaction.
2. A relay (poller or Debezium CDC) publishes the outbox row to the `orders.created` Kafka topic.
3. Payment Service consumes the event (consumer group), charges using an idempotency key, then publishes `payments.completed` or `payments.failed`.
4. Inventory Service reserves stock on `payments.completed`; if stock is missing it publishes `inventory.failed`, which makes Payment refund and Order cancel (a saga).
5. Failed messages are retried with backoff and finally parked in a dead-letter topic with the error attached.

### Problems it solves
- Losing events between a database commit and a message publish (outbox).
- Duplicate delivery (idempotent consumers, deduplication table).
- Distributed transactions without two-phase commit (saga with compensation).
- One slow or failing service blocking the whole checkout (asynchronous decoupling).

## Job Scheduler and Task Queue
Level: Advanced
Stack: Java concurrency (`ExecutorService`, `ScheduledExecutorService`), MySQL or Redis, Spring Boot

### What it should do
Let clients submit jobs (run now, run at a time, run every N minutes), execute them on a worker pool, retry failures with exponential backoff, move poison jobs to a dead-letter list, and show job status and history through an API.

### How the tech flows
1. `POST /jobs` stores a job row (`PENDING`, `run_at`, payload, attempts).
2. A scheduler thread polls for due jobs using `SELECT ... FOR UPDATE SKIP LOCKED` (or a Redis sorted set by timestamp) and marks them `RUNNING` with a lease timeout.
3. Due jobs are handed to a bounded `ThreadPoolExecutor` with a rejection policy that applies back-pressure.
4. The worker runs the handler; success marks `DONE`, failure increments attempts and reschedules with `delay = base * 2^attempt + jitter`.
5. A reaper requeues jobs whose lease expired (worker crashed); after `maxAttempts` the job is moved to `DEAD`.

### Problems it solves
- Two workers executing the same job (row locking and leases).
- Thundering herds on retry (exponential backoff with jitter).
- Unbounded thread or queue growth (bounded pools and back-pressure).
- Crash recovery: no job silently disappears when a worker dies mid-run.

## In-Memory Key-Value Store with TTL and Persistence
Level: Advanced
Stack: Core Java, `ConcurrentHashMap`, `ScheduledExecutorService`, NIO files

### What it should do
A small Redis-like store with `GET`, `SET key value [EX seconds]`, `DEL` and `INCR`, key expiry, a simple text protocol over TCP, and durability: after a crash the data is restored from a snapshot plus an append-only log.

### How the tech flows
1. A TCP server (blocking threads or NIO selector) reads commands, parses them and dispatches to the store.
2. The store keeps entries in a `ConcurrentHashMap<String, Entry>` where `Entry` holds the value and an expiry timestamp; reads check expiry lazily.
3. A scheduled sweeper removes expired keys in small batches so memory does not grow forever.
4. Every write is appended to a write-ahead log (`FileChannel`, `force()` per policy) before the reply is sent.
5. On startup the store loads the last snapshot, then replays the log; a background task writes new snapshots and truncates the log.

### Problems it solves
- Thread safety under concurrent reads and writes without one global lock.
- Memory growth from expired data (lazy plus active expiry).
- Durability versus speed (choosing the `fsync` policy and measuring the cost).
- Understanding what real caches and databases do internally.

## Capstone: Production-Ready E-Commerce Backend
Level: Capstone
Stack: Spring Boot, MySQL, Redis, Kafka, Docker, GitHub Actions, Prometheus, Grafana

### What it should do
Combine everything: catalogue, cart, checkout, payments (mocked gateway), orders and notifications, behind an API gateway with authentication, rate limiting and caching, deployed with containers, observable in dashboards, and covered by automated tests and a runbook.

### How the tech flows
1. Browser or mobile client → API gateway (JWT check, rate limit) → service routing.
2. Catalogue reads hit Redis first; writes go to MySQL and invalidate the cache entry.
3. Checkout creates an order transactionally and publishes events to Kafka for payment, stock and email services.
4. Every service exports Micrometer metrics, structured JSON logs with a correlation id, and traces; Prometheus scrapes and Grafana alerts on latency and error rate.
5. A GitHub Actions pipeline builds, runs unit and Testcontainers integration tests, builds a Docker image and deploys with a rolling or blue-green strategy.
6. A load test (k6 or Gatling) finds the bottleneck; thread dumps and heap dumps are used to fix what it reveals.

### Problems it solves
- Proving you can ship and operate a system, not only write code.
- Finding real production issues: pool exhaustion, slow queries, memory leaks, cascading failures.
- Safe change: tests, migrations (Flyway) and zero-downtime deploys.
- Communicating design decisions and failure modes in a runbook.
