## minigrep: A Fast Command-Line Search Tool
Level: Beginner
Stack: Rust std, clap, regex, rayon, walkdir

### What it should do
Search files for a pattern like `grep`: `minigrep [OPTIONS] PATTERN [PATH...]`. Support literal and regex search, case-insensitive mode, recursive directory walks, line numbers, colored matches and a `--count` flag. It must handle large files and binary files gracefully.

### How the tech flows
1. `clap` parses arguments into a typed `Config` struct and prints help and errors for you.
2. `walkdir` produces the list of files; a filter skips hidden, binary and unreadable files.
3. Each file is read through a `BufReader` line by line (never loading it whole) and matched with a compiled `Regex`.
4. `rayon`'s `par_bridge()` / `par_iter()` searches files on all cores; results are sent through a channel to one printer so output lines do not interleave.
5. Errors flow back as `Result` values and are reported on stderr with a non-zero exit code.

### Problems it solves
- Learning ownership, borrowing and error handling on a program small enough to finish.
- Streaming I/O versus loading everything into memory.
- Parallelism without data races (channels, `Send`).
- Building a real, installable tool with `cargo install`.

## HTTP Server From Scratch
Level: Beginner to Intermediate
Stack: std::net, threads, std::sync, text protocols

### What it should do
Serve static files and a few dynamic routes over HTTP/1.1 without a web framework: parse the request line and headers, return correct status codes (200, 404, 400, 405), serve `index.html`, support keep-alive and handle many clients at once with a fixed-size thread pool.

### How the tech flows
1. A `TcpListener` accepts connections in a loop.
2. Each connection is wrapped in a job and sent over a channel to a pool of worker threads (`Arc<Mutex<Receiver<Job>>>`).
3. The worker reads from the socket with a size limit, parses the request into a `Request` struct (method, path, headers) and rejects malformed input.
4. A router `match`es on `(method, path)`; static paths are resolved against a root directory with path-traversal checks (`..` must not escape).
5. The response is written with the correct `Content-Length` and headers, then the connection is closed or reused.

### Problems it solves
- Understanding what a framework does for you: sockets, framing, headers.
- Resource control: bounded pool instead of a thread per connection.
- Security basics: input limits, path traversal, timeouts.
- Safe shared state with `Arc`, `Mutex` and channels.

## REST API With Axum, SQLx and JWT
Level: Intermediate
Stack: Axum, Tokio, SQLx, PostgreSQL, serde, jsonwebtoken, argon2, tracing

### What it should do
A bookmarks service: users register and log in, then create, list, search, tag and delete bookmarks. Responses are JSON, lists are paginated, and every route except `/auth/*` requires a valid bearer token. Errors come back as consistent JSON problem documents.

### How the tech flows
1. Request → Axum router → Tower layers (tracing, timeout, CORS) → authentication middleware that verifies the JWT and puts the user id in request extensions.
2. Handlers use extractors (`State`, `Path`, `Query`, `Json`) and call a service layer.
3. The service uses a shared `PgPool`; SQLx `query!` macros check each SQL statement against the database schema at compile time.
4. Multi-step writes run in a transaction (`pool.begin()` … `commit()`).
5. A single `AppError` enum implements `IntoResponse` so handlers can return `Result<Json<T>, AppError>` and use `?`.

### Problems it solves
- Type-safe request parsing and compile-time-checked SQL.
- Password storage (argon2) and stateless authentication.
- Consistent error handling across dozens of routes.
- Structured logs and request tracing you can follow in production.

## Bitcask-Style Key-Value Store
Level: Intermediate to Advanced
Stack: std::fs, BufWriter, HashMap, CRC32, serde or manual encoding

### What it should do
A persistent key-value database: `set`, `get`, `remove` and `compact`, exposed through a CLI and a small library API. After a crash or restart it must recover all acknowledged writes, and reads must be a single disk seek.

### How the tech flows
1. Every write is appended to the active log file as `(crc, key length, value length, key, value)`; deletes append a tombstone.
2. An in-memory `HashMap<Key, (file_id, offset, size)>` (the keydir) points at the latest record for each key.
3. `get` looks the key up in the keydir and reads exactly that record with a seek, verifying the checksum.
4. When the active file passes a size limit it becomes immutable and a new one starts.
5. On startup the store scans the log files in order to rebuild the keydir; `compact` rewrites only live records into a fresh file and deletes old ones.

### Problems it solves
- How databases get durability: append-only logs, checksums, `fsync` policy.
- Trading memory for read speed (the keydir).
- Crash recovery and torn writes.
- Designing a safe public API around `Result` and custom error types.

## Async Chat Server
Level: Intermediate
Stack: Tokio, tokio-util codecs, broadcast channels, optional WebSocket

### What it should do
A multi-room chat over TCP (and optionally WebSocket): users pick a nickname, join rooms, send messages that every room member receives, see join and leave notices, and get disconnected cleanly when they stop responding.

### How the tech flows
1. `TcpListener::accept` spawns one Tokio task per client.
2. Each client task wraps the socket in a line codec (`Framed`) so messages are parsed into a `Command` enum (`Join`, `Say`, `Nick`, `Quit`).
3. A room is a `tokio::sync::broadcast::Sender<Message>`; a client task `select!`s between reading its socket (commands) and receiving broadcast messages (to write out).
4. A shared `Arc<RwLock<HashMap<RoomName, Room>>>` (or a single owner task driven by an `mpsc` channel) manages room membership.
5. Heartbeats with `tokio::time::interval` and idle timeouts drop dead connections; shutdown is signalled through a watch channel.

### Problems it solves
- Thousands of concurrent connections on a few threads.
- Fan-out messaging and slow-consumer handling (lagging receivers).
- Cancellation-safe `select!` loops.
- Choosing between shared state and an actor-style owner task.

## Background Job Queue With Retries
Level: Advanced
Stack: Tokio, PostgreSQL or Redis, SQLx, serde, tracing

### What it should do
Applications enqueue typed jobs (`SendEmail`, `ResizeImage`); a pool of workers runs them with a concurrency limit, retries failures with exponential backoff and jitter, moves jobs that keep failing to a dead-letter table, and exposes queue depth and failure metrics.

### How the tech flows
1. `enqueue` serialises the job with serde and inserts a row (`queued`, `run_at`, `attempts`, `payload`).
2. Workers poll with `SELECT … FOR UPDATE SKIP LOCKED LIMIT n` (or `BRPOPLPUSH` in Redis) so two workers never take the same job; the row gets a lease deadline.
3. A `Semaphore` limits in-flight jobs; each job runs in its own task under `tokio::time::timeout`.
4. On success the row is deleted or marked done; on error `attempts` increases and `run_at = now + base * 2^attempts + jitter`.
5. A reaper requeues jobs whose lease expired (worker crashed); after `max_attempts` the job moves to `dead_letter`.

### Problems it solves
- Exactly-once-ish processing with at-least-once delivery (idempotent handlers, leases).
- Back-pressure and graceful degradation when a dependency is down.
- Operating asynchronous work: visibility, retries, poison messages.
- Designing generic, type-safe APIs with traits and serde.

## Mini Redis
Level: Advanced
Stack: Tokio, bytes, RESP protocol, BTreeMap, tokio::time

### What it should do
A Redis-compatible subset: `PING`, `GET`, `SET key value [EX seconds]`, `DEL`, `INCR`, `EXPIRE`, `TTL` and `PUBLISH` / `SUBSCRIBE`, usable with the real `redis-cli`. Expired keys disappear, many clients can connect at once and pub/sub messages reach every subscriber.

### How the tech flows
1. A Tokio listener spawns a task per connection; a `Connection` type buffers bytes (`BytesMut`) and parses RESP frames incrementally.
2. Frames become a `Command` enum; a dispatcher executes them against the shared database.
3. The database is `Arc<Mutex<State>>` holding a `HashMap<String, Entry>` (value + optional expiry) plus a `BTreeSet<(Instant, String)>` ordered by expiry time.
4. A background task sleeps until the next expiry (`sleep_until`) and removes due keys; reads also check expiry lazily.
5. Pub/sub uses one `broadcast` channel per topic; a subscriber task forwards channel messages to its socket.

### Problems it solves
- Writing a real protocol parser that handles partial reads.
- Shared mutable state under concurrency with short critical sections.
- Time-based expiry without scanning every key.
- Understanding how a production cache works internally.

## Capstone: Production-Ready Payments API
Level: Capstone
Stack: Axum, Tokio, PostgreSQL, Redis, Kafka or NATS, OpenTelemetry, Docker, GitHub Actions

### What it should do
A small payments backend: create accounts, initiate transfers with idempotency keys, keep an immutable ledger, emit events for downstream services and expose an admin API. It must be observable, deployable and safe to change: tests, migrations, dashboards and a runbook included.

### How the tech flows
1. Client → load balancer → Axum service (auth middleware, rate limit, request id, timeout).
2. A transfer handler opens a transaction: checks the idempotency key, locks both accounts in a fixed order, writes ledger rows and an `outbox` record, then commits.
3. A relay task publishes outbox rows to Kafka/NATS; consumers (notifications, analytics) are idempotent.
4. Redis caches balances and enforces rate limits; all keys have TTLs.
5. `tracing` + OpenTelemetry export traces and metrics; Prometheus and Grafana alert on latency, error rate and queue lag.
6. GitHub Actions runs fmt, clippy, tests with a real Postgres (testcontainers), `cargo audit`, builds a static musl image and deploys with a canary and automatic rollback.

### Problems it solves
- Money correctness: transactions, ledgers, idempotency, lock ordering.
- Reliable messaging between services (outbox pattern).
- Operating Rust in production: observability, graceful shutdown, safe rollouts.
- Communicating a design: ADRs, runbook, load-test results.
