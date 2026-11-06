# PART 1: THE RUST ROADMAP

## Phase 1: Foundations & the Ownership Model

### 1. Toolchain, Cargo & Core Syntax
Install Rust with `rustup`, then let **Cargo** drive everything: `cargo new app`, `cargo run`, `cargo test`, `cargo build --release`. `Cargo.toml` lists dependencies (crates) and `Cargo.lock` pins exact versions.

- **Immutable by default**: `let x = 5;` cannot be reassigned; opt in with `let mut x = 5;`. *Shadowing* (`let x = x * 2;`) creates a new binding and may change the type.
- **Scalar types**: `i8..i128`, `u8..u128`, `isize/usize` (pointer-sized, used for indexing), `f32/f64`, `bool`, `char` (a 4-byte Unicode scalar). Compound: tuples `(i32, f64)` and fixed-size arrays `[i32; 5]`.
- **Expressions**: almost everything returns a value; the last expression without a semicolon is the result of a block or function.
- **Control flow**: `if` is an expression, `loop` can `break` with a value, `while`, and `for x in iter` (the idiomatic loop).
- **Integer overflow** panics in debug builds and wraps in release; use `checked_*`, `wrapping_*` or `saturating_*` when it matters.

```rust
fn fahrenheit(c: f64) -> f64 {
    c * 9.0 / 5.0 + 32.0 // no semicolon: this is the return value
}

fn main() {
    let temps = [0.0, 21.5, 100.0];
    for c in temps.iter() {
        println!("{:>6.1} C = {:>6.1} F", c, fahrenheit(*c));
    }
}
```

### 2. Ownership, Borrowing & Lifetimes
Rust manages memory without a garbage collector through three rules: every value has **one owner**; when the owner goes out of scope the value is **dropped**; ownership can be **moved** or temporarily **borrowed**.

- **Move**: `let b = a;` for a `String` moves ownership; `a` can no longer be used. Types that are cheap bit-copies implement `Copy` (integers, `bool`, `char`, tuples of `Copy`) and are copied instead.
- **Borrowing**: `&T` is a shared reference, `&mut T` an exclusive one. At any moment you may have *many* `&T` **or exactly one** `&mut T`, never both. This single rule prevents data races and iterator invalidation at compile time.
- **Slices**: `&[T]` and `&str` borrow a view of contiguous data without owning it. Prefer them in function parameters.
- **Lifetimes** name how long a reference is valid. Most are inferred (*elision*); when a function returns a reference derived from several inputs you must say which: `fn longest<'a>(a: &'a str, b: &'a str) -> &'a str`.

```rust
fn first_word(s: &str) -> &str {
    s.split_whitespace().next().unwrap_or("")
}

fn main() {
    let sentence = String::from("ownership makes memory safe");
    let word = first_word(&sentence); // borrows `sentence`
    println!("{}", word);
    // drop(sentence);  // would not compile: `word` still borrows it
}
```

Reading borrow checker errors is a core skill: they almost always point at a real aliasing bug or at a design that should use indices, cloning once, or a different ownership split.

### 3. Structs, Enums & Pattern Matching
- **Structs** group data; `impl` blocks add methods (`&self`, `&mut self`, or `self` to consume) and associated functions such as `new`.
- **Enums** are *sum types*: each variant can carry different data. `Option<T>` (`Some`/`None`) replaces null and `Result<T, E>` (`Ok`/`Err`) replaces exceptions.
- **`match`** must be exhaustive, so adding a variant makes the compiler list every place that must change. Patterns can destructure, bind, use guards (`if`) and ranges. `if let` / `while let` handle the single-pattern case.

```rust
#[derive(Debug)]
enum Shape {
    Circle { radius: f64 },
    Rect { w: f64, h: f64 },
}

impl Shape {
    fn area(&self) -> f64 {
        match self {
            Shape::Circle { radius } => std::f64::consts::PI * radius * radius,
            Shape::Rect { w, h } => w * h,
        }
    }
}

fn main() {
    let shapes = vec![Shape::Circle { radius: 1.5 }, Shape::Rect { w: 2.0, h: 3.0 }];
    for s in &shapes {
        println!("{:?} -> {:.2}", s, s.area());
    }
}
```

### 4. Error Handling & Modules
Rust separates **recoverable** errors (`Result`) from **bugs** (`panic!`). The `?` operator returns early with the error (converting it through `From`), so error paths stay short.

- Use `unwrap`/`expect` only in tests, prototypes, or when a failure is truly impossible; explain why in the `expect` message.
- Libraries define typed errors (an `enum`, `thiserror` makes it easy); applications often use `anyhow::Result` and add context.
- **Modules** organise code: `mod`, `pub`, `use`. Items are private by default; a *crate* is the compilation unit and a *workspace* groups several crates.

```rust
use std::num::ParseIntError;

fn parse_port(s: &str) -> Result<u16, ParseIntError> {
    let n: u16 = s.trim().parse()?; // early-returns the error
    Ok(n)
}

fn main() {
    match parse_port("8080") {
        Ok(p) => println!("port {}", p),
        Err(e) => println!("bad port: {}", e),
    }
    println!("{:?}", parse_port("eighty"));
}
```

## Phase 2: Collections, Traits, Generics & Memory

### 1. Collections & Strings
| Type | Use it for | Notes |
| --- | --- | --- |
| `Vec<T>` | growable array | amortised O(1) push, O(1) index |
| `VecDeque<T>` | queue / double-ended | O(1) at both ends |
| `HashMap<K, V>` | key lookup | average O(1); SipHash by default |
| `BTreeMap<K, V>` | sorted keys, range queries | O(log N) |
| `HashSet<T>` / `BTreeSet<T>` | membership | same trade-offs as the maps |
| `BinaryHeap<T>` | priority queue | max-heap; wrap in `Reverse` for min |

**Strings**: `String` owns UTF-8 bytes, `&str` borrows them. Indexing by character position is not allowed because characters have variable width; iterate with `.chars()` or work with byte slices when the data is ASCII. The **entry API** (`map.entry(k).or_insert(0)`) avoids double lookups.

```rust
use std::collections::HashMap;

fn main() {
    let text = "the quick brown fox jumps over the lazy dog the end";
    let mut counts: HashMap<&str, usize> = HashMap::new();
    for w in text.split_whitespace() {
        *counts.entry(w).or_insert(0) += 1;
    }
    let mut top: Vec<_> = counts.into_iter().collect();
    top.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(b.0)));
    println!("{:?}", &top[..3]);
}
```

### 2. Traits, Generics & Trait Objects
A **trait** describes shared behaviour. **Generics** with trait bounds are monomorphised at compile time (*static dispatch*, zero cost, one copy of the code per type). A **trait object** (`Box<dyn Trait>`, `&dyn Trait`) uses a vtable (*dynamic dispatch*) so you can store different types together.

- Useful standard traits: `Debug`, `Display`, `Clone`, `Copy`, `PartialEq/Eq`, `PartialOrd/Ord`, `Hash`, `Default`, `From/Into`, `Iterator`, `Drop`. Most can be `#[derive]`d.
- `impl Trait` in argument position is shorthand for a generic bound; in return position it hides a concrete type (for example a closure or iterator).
- The **orphan rule** only lets you implement a trait for a type if your crate owns the trait or the type; use a newtype to get around it.

```rust
trait Greet {
    fn name(&self) -> String;
    fn hello(&self) -> String {
        format!("Hello, {}!", self.name()) // default method
    }
}

struct English;
struct Spanish;
impl Greet for English { fn name(&self) -> String { "world".into() } }
impl Greet for Spanish {
    fn name(&self) -> String { "mundo".into() }
    fn hello(&self) -> String { format!("Hola, {}!", self.name()) }
}

fn main() {
    let all: Vec<Box<dyn Greet>> = vec![Box::new(English), Box::new(Spanish)];
    for g in &all {
        println!("{}", g.hello());
    }
}
```

### 3. Iterators, Closures & Smart Pointers
- **Iterators** are lazy: `map`, `filter`, `take`, `zip`, `enumerate` build a pipeline that runs only when consumed by `collect`, `sum`, `fold`, `for`… The optimiser usually turns the chain into the same machine code as a hand-written loop.
- **Closures** capture their environment. The compiler picks the least restrictive trait: `Fn` (shared borrow), `FnMut` (mutable borrow) or `FnOnce` (takes ownership, callable once). `move` forces ownership into the closure, needed for threads.
- **Smart pointers**: `Box<T>` (heap allocation, recursive types), `Rc<T>` / `Arc<T>` (shared ownership, non-atomic / atomic reference count), `RefCell<T>` / `Mutex<T>` (interior mutability, checked at run time), `Weak<T>` (non-owning, breaks cycles), `Cow<str>` (clone only when you must modify).

```rust
use std::cell::RefCell;
use std::rc::Rc;

fn main() {
    let evens: Vec<i32> = (1..=10).filter(|n| n % 2 == 0).map(|n| n * n).collect();
    println!("{:?}", evens);

    let shared = Rc::new(RefCell::new(Vec::new()));
    let pusher = {
        let s = Rc::clone(&shared);
        move |x: i32| s.borrow_mut().push(x)
    };
    pusher(1);
    pusher(2);
    println!("{:?} (strong refs: {})", shared.borrow(), Rc::strong_count(&shared));
}
```

## Phase 3: Concurrency & Async

### 1. Threads, Channels & Shared State
Rust's ownership rules extend to threads: the marker traits **`Send`** (safe to move to another thread) and **`Sync`** (safe to share by reference) are checked automatically, so a data race is a compile error.

- `std::thread::spawn` takes a `move` closure; `join()` returns its result (or the panic).
- **Message passing**: `std::sync::mpsc` channels (multi-producer, single-consumer). Prefer sending ownership over sharing memory.
- **Shared state**: `Arc<Mutex<T>>` or `Arc<RwLock<T>>`. The lock guard unlocks when dropped, so keep critical sections short.
- **Atomics** (`AtomicUsize`, ...) cover counters and flags; ordering (`Relaxed`, `Acquire`/`Release`, `SeqCst`) decides what other memory writes become visible.
- Deadlocks are still possible: acquire multiple locks in one global order.

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let total = Arc::new(Mutex::new(0u64));
    let mut handles = Vec::new();
    for i in 0..4u64 {
        let total = Arc::clone(&total);
        handles.push(thread::spawn(move || {
            let part: u64 = (i * 1000..(i + 1) * 1000).sum();
            *total.lock().unwrap() += part;
        }));
    }
    for h in handles {
        h.join().unwrap();
    }
    println!("sum = {}", *total.lock().unwrap());
}
```

### 2. Async Rust & Tokio
`async fn` returns a **future**: a state machine that does nothing until polled. An **executor** (runtime) polls many futures on a few threads, so thousands of I/O-bound tasks cost little memory. **Tokio** is the standard runtime.

- `.await` yields to the runtime while waiting; other tasks run in the meantime.
- `tokio::spawn` starts a task (its future must be `Send + 'static`); `tokio::join!` waits for several futures; `tokio::select!` races them and drops the losers (cancellation), so use it only with *cancel-safe* futures.
- **Never block the runtime**: CPU-heavy or blocking calls belong in `tokio::task::spawn_blocking` or a thread pool such as `rayon`.
- Use Tokio's async primitives (`tokio::sync::{mpsc, Mutex, RwLock, Semaphore}`, `tokio::time::{sleep, timeout}`) inside async code.

```rust
use std::time::Duration;

#[tokio::main]
async fn main() {
    let slow = async {
        tokio::time::sleep(Duration::from_millis(200)).await;
        "slow"
    };
    let fast = async {
        tokio::time::sleep(Duration::from_millis(50)).await;
        "fast"
    };
    let (a, b) = tokio::join!(slow, fast); // both run concurrently, ~200 ms total
    println!("{} {}", a, b);

    let res = tokio::time::timeout(Duration::from_millis(10), tokio::time::sleep(Duration::from_secs(5))).await;
    println!("timed out: {}", res.is_err());
}
```

### 3. Concurrency Patterns & Pitfalls
- **Worker pool with back-pressure**: a *bounded* channel in front of N workers makes producers wait instead of exhausting memory.
- **Data parallelism**: `rayon`'s `par_iter()` splits a loop across cores with work stealing.
- **Do not hold a `std::sync::MutexGuard` across `.await`**: the future stops being `Send` and the lock can block other tasks. Copy the data out and drop the guard first, or restructure with a channel.
- **Cancellation**: dropping a future cancels it at the next `.await`; make critical sections cancel-safe (write-then-commit) or run them in a spawned task.
- **Timeouts and shutdown**: every network call needs a timeout; services should stop accepting work, drain in-flight tasks and then exit.
- **Memory ordering**: if you are not sure, use `SeqCst`; relax only with a written argument and tests (Loom can explore interleavings).

## Phase 4: Systems Programming & Performance

### 1. Unsafe Rust & FFI
`unsafe` unlocks five extra abilities: dereference raw pointers, call unsafe functions, access mutable statics, implement unsafe traits and access union fields. It does **not** switch off the borrow checker. The contract: the author promises that the invariants the compiler cannot check hold.

- Keep `unsafe` blocks tiny, wrap them in a safe API and document the invariant with a `// SAFETY:` comment.
- **FFI**: declare C functions in `extern "C"`, give shared structs `#[repr(C)]`, check for null, and never let a panic unwind across the boundary. `bindgen` generates bindings from C headers; `cbindgen` goes the other way.
- Test unsafe code with **Miri** (detects undefined behaviour in the interpreter) and sanitizers.

```rust
/// Splits a slice into two halves, like the standard `split_at_mut`.
fn split_mut(v: &mut [i32], mid: usize) -> (&mut [i32], &mut [i32]) {
    let len = v.len();
    let ptr = v.as_mut_ptr();
    assert!(mid <= len);
    // SAFETY: both ranges are inside `v`, do not overlap, and live as long as the borrow of `v`.
    unsafe { (std::slice::from_raw_parts_mut(ptr, mid), std::slice::from_raw_parts_mut(ptr.add(mid), len - mid)) }
}

fn main() {
    let mut data = [1, 2, 3, 4, 5];
    let (a, b) = split_mut(&mut data, 2);
    a[0] = 10;
    b[0] = 30;
    println!("{:?}", data);
}
```

### 2. Performance Engineering
1. **Measure first**: build with `--release`, benchmark with `criterion`, profile with `perf` / `cargo flamegraph`. Debug builds can be 10-100x slower and mislead.
2. **Algorithms and data layout beat micro-tuning**: contiguous `Vec`s are cache-friendly; avoid pointer-heavy structures when possible.
3. **Avoid hidden allocations**: borrow instead of cloning, `Vec::with_capacity`, reuse buffers, `Cow`, `SmallVec`/stack arrays for tiny collections.
4. **Iterators and slices** let the compiler remove bounds checks and vectorise.
5. **Release profile**: `lto = "fat"`, `codegen-units = 1`, `opt-level = 3`, optionally `panic = "abort"` for smaller, faster binaries; swap the global allocator (`mimalloc`, `jemalloc`) for allocation-heavy services.
6. For hot integer-key maps consider a faster non-cryptographic hasher (only when keys are not attacker-controlled).

```rust
use std::time::Instant;

fn sum_index(v: &[u64]) -> u64 {
    let mut s = 0;
    for i in 0..v.len() {
        s += v[i];
    }
    s
}

fn sum_iter(v: &[u64]) -> u64 {
    v.iter().sum()
}

fn main() {
    let v: Vec<u64> = (0..5_000_000).collect();
    for (name, f) in [("index", sum_index as fn(&[u64]) -> u64), ("iter", sum_iter)].iter() {
        let t = Instant::now();
        let r = f(&v);
        println!("{}: {} in {:?}", name, r, t.elapsed());
    }
}
```

## Phase 5: Backend Development & Ecosystem

### 1. Web APIs with Axum
**Axum** (built on Tokio, Hyper and Tower) routes requests to async handler functions. *Extractors* in the argument list parse the request (`Path`, `Query`, `Json<T>`, `State<T>`), and the return type (anything implementing `IntoResponse`) builds the response.

- **serde** (`#[derive(Serialize, Deserialize)]`) converts to and from JSON and many other formats.
- Share state (pool, config, cache) through `State<Arc<AppState>>`.
- **Tower middleware** adds timeouts, tracing, CORS, compression and rate limits as layers.
- Map errors to responses with a custom error type that implements `IntoResponse`, so handlers can return `Result<T, AppError>` and use `?`.

```rust
use axum::{extract::Path, routing::get, Json, Router};
use serde::Serialize;

#[derive(Serialize)]
struct Greeting {
    message: String,
}

async fn hello(Path(name): Path<String>) -> Json<Greeting> {
    Json(Greeting { message: format!("Hello, {}!", name) })
}

#[tokio::main]
async fn main() {
    let app = Router::new().route("/hello/:name", get(hello));
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

### 2. Databases & Persistence
- **SQLx** is async and SQL-first; the `query!` macros check your SQL against a real database at compile time. Use a connection **pool** (`PgPoolOptions`) with sensible `max_connections` and timeouts.
- **Migrations** (`sqlx migrate`, Diesel migrations) keep schema changes in version control and run in CI and at deploy time.
- **Transactions**: `let mut tx = pool.begin().await?; ... tx.commit().await?;` rolls back automatically if the guard is dropped.
- **ORMs**: Diesel (sync, type-safe query builder) and SeaORM (async) trade some control for convenience.
- **Caching and queues**: `redis` / `deadpool-redis` for cache-aside and locks; set TTLs on every key.

```rust
use sqlx::PgPool;

#[derive(sqlx::FromRow)]
struct User {
    id: i64,
    email: String,
}

async fn create_user(pool: &PgPool, email: &str) -> Result<User, sqlx::Error> {
    let mut tx = pool.begin().await?;
    let user = sqlx::query_as::<_, User>("INSERT INTO users (email) VALUES ($1) RETURNING id, email")
        .bind(email)
        .fetch_one(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(user)
}
```

### 3. Messaging, Observability & Configuration
- **Messaging**: Kafka (`rdkafka`), NATS, RabbitMQ (`lapin`). Consumers must be idempotent; commit offsets after the work succeeds; park poison messages in a dead-letter topic.
- **Observability**: the `tracing` crate gives structured logs *and* spans; `tracing-subscriber` formats them (JSON in production) and `tracing-opentelemetry` exports traces. Expose Prometheus metrics (`metrics`, `axum-prometheus`) and a `/healthz` endpoint.
- **Configuration**: twelve-factor style: environment variables or files loaded with `figment` / `config` into a typed struct, validated at startup, secrets never logged.
- **Auth**: verify JWT signatures and expiry (`jsonwebtoken`), hash passwords with `argon2`, and put authorisation in middleware.
- **Graceful shutdown**: listen for SIGTERM, stop accepting connections, finish in-flight requests, then close pools.

## Phase 6: Production, Tooling & Operations

### 1. Quality Gates & CI
Make the toolchain enforce the standard on every pull request:

```bash
cargo fmt --all -- --check          # formatting
cargo clippy --all-targets -- -D warnings   # lints as errors
cargo test --all --locked           # unit + integration tests, exact lockfile
cargo doc --no-deps                 # docs must build
cargo audit                         # known vulnerabilities (RustSec)
cargo deny check                    # licences, bans, duplicate versions
```

- Commit `Cargo.lock` for applications and use `--locked` in CI for reproducible builds.
- Use a **workspace** to split a project into crates that compile and test independently; use **feature flags** to make heavy dependencies optional.
- Cache `~/.cargo` and `target/` in CI (for example with `Swatinem/rust-cache`) to keep builds fast.
- Follow semantic versioning for libraries and declare a minimum supported Rust version (MSRV).

### 2. Build, Deploy & Debug
- **Release profile**: `lto`, `codegen-units = 1`, `strip = true`; consider `panic = "abort"` when you do not need unwinding.
- **Containers**: a multi-stage Dockerfile builds in a full Rust image and copies only the binary into a slim or distroless image. For fully static binaries target `x86_64-unknown-linux-musl` (use `rustls` instead of OpenSSL).
- **Cross-compiling** with `cross` or `cargo zigbuild`; keep debug symbols in separate files for post-mortem debugging.
- **Debugging**: `RUST_BACKTRACE=1` for panic traces, `gdb`/`lldb` (`rust-gdb`) for live and core-dump inspection, `tokio-console` for stuck or slow async tasks, `cargo flamegraph` for CPU hot spots, `heaptrack` or `dhat` for allocations.
- **Deploy safely**: health and readiness probes, rolling or blue-green releases, canary a percentage of traffic, keep a one-command rollback, and write a runbook for the failure modes below.

# PART 3: CODE REVIEW ANTI-PATTERNS

## Detailed Anti-Pattern Analysis (1-10)

### 1. Calling `unwrap()` on Input You Do Not Control
**Problematic Code:**
```rust
fn port_from_env() -> u16 {
    let raw = std::env::var("PORT").unwrap();      // panics if missing
    raw.parse().unwrap()                            // panics if not a number
}
```
**Code Review Explanation**: Any missing variable, malformed value or empty input turns into a panic that takes the whole thread (or process) down. `unwrap` is for situations that are provably impossible, not for I/O or user data.
**Remediated Code:**
```rust
use std::env;
use std::num::ParseIntError;

#[derive(Debug)]
enum ConfigError {
    Missing(env::VarError),
    Invalid(ParseIntError),
}

fn port_from_env() -> Result<u16, ConfigError> {
    let raw = env::var("PORT").map_err(ConfigError::Missing)?;
    raw.parse().map_err(ConfigError::Invalid)
}
```

### 2. Cloning to Silence the Borrow Checker
**Problematic Code:**
```rust
fn total_len(words: Vec<String>) -> usize {
    words.iter().map(|w| w.clone().len()).sum() // clones every string just to read its length
}

fn main() {
    let words = vec!["alpha".to_string(), "beta".to_string()];
    let n = total_len(words.clone());           // and clones the whole vector at the call site
    println!("{} {}", n, words.len());
}
```
**Code Review Explanation**: `.clone()` allocates and copies. Using it to make a compiler error disappear hides a design question (who should own this data?) and costs time and memory in loops. Most of the time the function only needs to read.
**Remediated Code:**
```rust
fn total_len(words: &[String]) -> usize {
    words.iter().map(|w| w.len()).sum()
}

fn main() {
    let words = vec!["alpha".to_string(), "beta".to_string()];
    let n = total_len(&words); // borrow, no copies
    println!("{} {}", n, words.len());
}
```

### 3. Holding a `MutexGuard` Across `.await`
**Problematic Code:**
```rust
use std::sync::{Arc, Mutex};

async fn refresh(cache: Arc<Mutex<Vec<String>>>) {
    let mut guard = cache.lock().unwrap();
    let fresh = fetch_remote().await; // lock is still held while we wait on the network
    guard.extend(fresh);
}

async fn fetch_remote() -> Vec<String> { vec![] }
```
**Code Review Explanation**: The guard lives across a suspension point, so every other task that needs the lock blocks a runtime thread, and the future is not `Send`, which breaks `tokio::spawn`. Under load this becomes a stall or a deadlock.
**Remediated Code:**
```rust
use std::sync::{Arc, Mutex};

async fn refresh(cache: Arc<Mutex<Vec<String>>>) {
    let fresh = fetch_remote().await;      // do the slow work first, without the lock
    cache.lock().unwrap().extend(fresh);   // lock only for the quick update
}

async fn fetch_remote() -> Vec<String> { vec![] }
```

### 4. Blocking the Async Runtime
**Problematic Code:**
```rust
async fn handler() -> String {
    std::thread::sleep(std::time::Duration::from_secs(2)); // blocks the worker thread
    let data = std::fs::read_to_string("big.json").unwrap(); // blocking file I/O
    data
}
```
**Code Review Explanation**: Async runtimes multiplex many tasks onto a few threads. A blocking call freezes its thread, and with enough requests every worker is stuck, so unrelated endpoints time out.
**Remediated Code:**
```rust
async fn handler() -> String {
    tokio::time::sleep(std::time::Duration::from_secs(2)).await; // yields to other tasks
    tokio::fs::read_to_string("big.json").await.unwrap_or_default()
}

async fn heavy(input: Vec<u8>) -> usize {
    // CPU-bound or unavoidably blocking work goes to the blocking pool
    tokio::task::spawn_blocking(move || input.iter().map(|b| *b as usize).sum()).await.unwrap()
}
```

### 5. Unbounded Queues and Channels
**Problematic Code:**
```rust
use std::sync::mpsc;

fn main() {
    let (tx, rx) = mpsc::channel::<Vec<u8>>(); // unbounded
    std::thread::spawn(move || loop {
        let _ = tx.send(vec![0u8; 1_000_000]); // producer never waits
    });
    for msg in rx {
        std::thread::sleep(std::time::Duration::from_millis(100)); // slow consumer
        drop(msg);
    }
}
```
**Code Review Explanation**: When the consumer is slower than the producer the queue grows until the process runs out of memory. There is no back-pressure, so the failure arrives late and far from its cause.
**Remediated Code:**
```rust
use std::sync::mpsc;

fn main() {
    let (tx, rx) = mpsc::sync_channel::<Vec<u8>>(8); // bounded: send() blocks when full
    std::thread::spawn(move || loop {
        if tx.send(vec![0u8; 1_000_000]).is_err() {
            break; // receiver gone
        }
    });
    for msg in rx.iter().take(3) {
        std::thread::sleep(std::time::Duration::from_millis(100));
        drop(msg);
    }
}
```

### 6. Index Loops Instead of Iterators
**Problematic Code:**
```rust
fn sum_pairs(a: &[i32], b: &[i32]) -> i32 {
    let mut total = 0;
    for i in 0..a.len() {
        total += a[i] * b[i]; // panics if b is shorter; bounds check on every access
    }
    total
}
```
**Code Review Explanation**: Manual indexing invites off-by-one and length-mismatch panics and forces a bounds check for every element. Iterator adaptors state the intent, stop at the shorter input, and let the optimiser vectorise.
**Remediated Code:**
```rust
fn sum_pairs(a: &[i32], b: &[i32]) -> i32 {
    a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
}
```

### 7. `Rc<RefCell<T>>` Everywhere
**Problematic Code:**
```rust
use std::cell::RefCell;
use std::rc::Rc;

struct Account { balance: i64 }

fn transfer(from: &Rc<RefCell<Account>>, to: &Rc<RefCell<Account>>, amount: i64) {
    let mut a = from.borrow_mut();
    let mut b = to.borrow_mut();      // panics: "already borrowed" if from and to are the same account
    a.balance -= amount;
    b.balance += amount;
}
```
**Code Review Explanation**: `RefCell` moves the borrow checker's rules from compile time to run time, so aliasing mistakes become panics in production. Widespread `Rc<RefCell<_>>` usually means ownership was never designed.
**Remediated Code:**
```rust
struct Account { balance: i64 }

fn transfer(accounts: &mut [Account], from: usize, to: usize, amount: i64) -> Result<(), &'static str> {
    if from == to {
        return Err("cannot transfer to the same account");
    }
    accounts[from].balance -= amount; // plain &mut access: the compiler proves there is no aliasing
    accounts[to].balance += amount;
    Ok(())
}
```

### 8. `&Vec<T>` and `&String` Parameters
**Problematic Code:**
```rust
fn shout(name: &String) -> String {
    name.to_uppercase()
}

fn average(values: &Vec<f64>) -> f64 {
    values.iter().sum::<f64>() / values.len() as f64
}

fn main() {
    let s = "ferris";
    // println!("{}", shout(&s));   // does not compile: expected &String, found &&str
    println!("{}", shout(&s.to_string())); // forced allocation just to call the function
    println!("{}", average(&vec![1.0, 2.0, 3.0]));
}
```
**Code Review Explanation**: `&Vec<T>` and `&String` accept fewer inputs than `&[T]` and `&str` while offering nothing extra, and they force callers to allocate. Slices accept vectors, arrays and sub-ranges alike.
**Remediated Code:**
```rust
fn shout(name: &str) -> String {
    name.to_uppercase()
}

fn average(values: &[f64]) -> f64 {
    values.iter().sum::<f64>() / values.len() as f64
}

fn main() {
    println!("{}", shout("ferris"));          // &str literal
    println!("{}", shout(&String::from("x"))); // &String derefs to &str
    println!("{}", average(&[1.0, 2.0, 3.0])); // array
}
```

### 9. `unsafe` Without a Safe Wrapper or Safety Argument
**Problematic Code:**
```rust
fn read_at(v: &Vec<u8>, i: usize) -> u8 {
    unsafe { *v.as_ptr().add(i) } // no bounds check, no explanation
}

fn main() {
    let v = vec![1, 2, 3];
    println!("{}", read_at(&v, 10)); // undefined behaviour: reads past the allocation
}
```
**Code Review Explanation**: This function is *safe* to call but is actually unsound: any caller can trigger undefined behaviour. Unsafe code must either check its preconditions or be marked `unsafe fn` so the obligation moves to the caller, and every block needs a documented invariant.
**Remediated Code:**
```rust
fn read_at(v: &[u8], i: usize) -> Option<u8> {
    v.get(i).copied() // safe, checked
}

/// # Safety
/// `i` must be less than `v.len()`.
unsafe fn read_at_unchecked(v: &[u8], i: usize) -> u8 {
    // SAFETY: the caller guarantees `i < v.len()`.
    *v.get_unchecked(i)
}

fn main() {
    let v = vec![1u8, 2, 3];
    println!("{:?} {:?}", read_at(&v, 1), read_at(&v, 10));
    println!("{}", unsafe { read_at_unchecked(&v, 2) });
}
```

### 10. Swallowing Errors with `let _ =`
**Problematic Code:**
```rust
use std::fs::File;
use std::io::Write;

fn save(path: &str, data: &str) {
    let mut f = File::create(path).unwrap();
    let _ = f.write_all(data.as_bytes()); // disk full? permission lost? nobody will ever know
}
```
**Code Review Explanation**: `Result` is `#[must_use]` precisely so failures are not ignored. Discarding it means the caller believes the data was saved when it may not have been, which is a silent data-loss bug.
**Remediated Code:**
```rust
use std::fs::File;
use std::io::{self, Write};

fn save(path: &str, data: &str) -> io::Result<()> {
    let mut f = File::create(path)?;
    f.write_all(data.as_bytes())?; // propagate: the caller decides to retry, alert or abort
    f.sync_all()
}
```

## Anti-Pattern Matrix (11-50)

| # | Domain | Anti-Pattern | Severity | Root Cause & Impact | Remediation |
| --- | --- | --- | --- | --- | --- |
| **11** | Error handling | `Box<dyn Error>` in a library's public API | Medium | Callers cannot match on error kinds. | Return a typed error enum (`thiserror`). |
| **12** | Error handling | `panic!` for expected failures in a library | High | A bad input crashes the caller's process. | Return `Result`; reserve panics for bugs. |
| **13** | Error handling | `expect("")` with an empty or vague message | Low | The failure gives no context in logs. | Describe the broken assumption, or add context with `anyhow`. |
| **14** | Error handling | `Result<T, String>` everywhere | Medium | Errors cannot be matched, chained or localised. | Use typed errors that implement `std::error::Error` with `source()`. |
| **15** | Ownership | Cloning large structs inside hot loops | High | Hidden allocations and copies dominate runtime. | Borrow, use `Rc`/`Arc` or `Cow`, restructure the data flow. |
| **16** | Ownership | Self-referential structs built with raw tricks | Medium | Moves invalidate internal references (UB). | Store indices, use an arena, or `Pin` plus a vetted crate. |
| **17** | Ownership | `Box::leak` / `'static` to appease lifetimes | Medium | Memory is never freed; hides a design issue. | Restructure ownership, use `Arc`, or scoped threads. |
| **18** | Ownership | `mem::forget` to skip `Drop` | High | Leaks locks, handles and memory. | Design a proper `Drop`, or use `ManuallyDrop` with care. |
| **19** | Types | Lossy `as` casts (`x as u8`) | High | Values silently truncate or wrap. | Use `try_from` / `try_into` and handle the error. |
| **20** | Types | `v.len() - 1` on a possibly empty vector | High | `usize` underflow panics (debug) or wraps (release). | `checked_sub`, `saturating_sub` or `if let Some(last) = v.last()`. |
| **21** | Types | Stringly-typed state (`status == "paid"`) | Medium | Typos compile and fail at run time. | Model it as an `enum`. |
| **22** | Types | Boolean flag parameters `f(true, false)` | Low | Call sites are unreadable and easy to swap. | Use enums or a builder. |
| **23** | Types | Raw `u64` for every ID or unit | Medium | Different IDs or units get mixed up. | Newtype wrappers (`struct UserId(u64)`). |
| **24** | Concurrency | One `Arc<Mutex<HashMap>>` on the hot path | High | Every thread contends for a single lock. | Shard the map, use `RwLock` or `dashmap`, or message passing. |
| **25** | Concurrency | Inconsistent lock acquisition order | Critical | Two threads wait on each other forever. | Always lock in one global order, or merge into one lock. |
| **26** | Concurrency | `thread::spawn` per request | High | Unbounded threads exhaust memory and the scheduler. | Use a bounded pool or async tasks. |
| **27** | Concurrency | `lock().unwrap()` ignoring poisoning | Medium | One panic cascades into panics in every thread. | Handle `PoisonError` or use `parking_lot::Mutex`. |
| **28** | Concurrency | `Ordering::Relaxed` used for synchronisation | Critical | Other threads may never see the data the flag guards. | Use `Acquire`/`Release` (or `SeqCst`). |
| **29** | Concurrency | Trying to share `Rc` across threads with `unsafe impl Send` | Critical | Non-atomic reference counts race: UB. | Use `Arc`. |
| **30** | Async | `tokio::spawn` with the `JoinHandle` dropped | High | Panics and errors in the task vanish silently. | Await or collect handles, log task results. |
| **31** | Async | `select!` with non-cancel-safe futures | High | Dropped futures lose partially read data. | Use cancel-safe APIs or keep state outside the future. |
| **32** | Async | CPU-heavy work on the async runtime | High | Worker threads starve; latency spikes everywhere. | `spawn_blocking` or `rayon`. |
| **33** | Async | Huge arrays or buffers living across `.await` | Medium | Every future carries them: memory bloat, slow moves. | Box them or allocate on the heap. |
| **34** | Async | Network calls without a timeout | Critical | One slow dependency hangs requests forever. | `tokio::time::timeout`, client-level timeouts. |
| **35** | Async | No graceful shutdown | Medium | Deploys drop in-flight requests. | Handle SIGTERM and drain (`with_graceful_shutdown`). |
| **36** | Performance | `collect()` into a `Vec` only to iterate again | Medium | Needless allocation and a second pass. | Keep the iterator chain lazy. |
| **37** | Performance | Building strings with `+` in a loop | Medium | Repeated reallocation and copying. | `push_str`, `write!`, `String::with_capacity`. |
| **38** | Performance | `Vec::remove(0)` / `insert(0, x)` in loops | Medium | O(N) per operation makes loops O(N²). | Use `VecDeque`. |
| **39** | Performance | Growing vectors without `with_capacity` | Low | Repeated reallocation. | Reserve when the size is known. |
| **40** | Performance | Benchmarking debug builds | Medium | Numbers are 10-100x off and misleading. | `--release` and `criterion`. |
| **41** | Performance | Default SipHash for hot integer keys | Low | Hashing dominates tiny lookups. | Faster hasher (`ahash`, `fxhash`) when keys are trusted. |
| **42** | Unsafe | `mem::transmute` between unrelated types | Critical | Layout assumptions break: UB. | Safe conversions, `from_ne_bytes`, `bytemuck`. |
| **43** | Unsafe | `mem::uninitialized` / zeroed non-zero types | Critical | Reading uninitialised memory is UB. | `MaybeUninit`. |
| **44** | Unsafe | Creating aliasing `&mut` through raw pointers | Critical | Violates the aliasing rules: UB the optimiser exploits. | `UnsafeCell`, `Cell`, or redesign. |
| **45** | Unsafe | FFI without `#[repr(C)]` or null checks | Critical | Layout mismatch and null derefs corrupt memory. | `repr(C)`, validate inputs, wrap in a safe API. |
| **46** | API design | Public fields on types with invariants | Medium | Callers can build invalid values. | Private fields plus constructors. |
| **47** | API design | Public enums without `#[non_exhaustive]` | Low | Adding a variant is a breaking change. | Mark the enum `#[non_exhaustive]`. |
| **48** | API design | Generic everything | Low | Monomorphisation bloats binaries and compile time. | Use `dyn` or concrete types where speed does not matter. |
| **49** | Dependencies | Huge, unaudited dependency tree | High | Supply-chain and licence risk. | `cargo audit`, `cargo deny`, review new crates, commit `Cargo.lock`. |
| **50** | Tooling | Ignoring clippy warnings, no CI gates | Low | Style drift and real bugs reach main. | Run `fmt` and `clippy -D warnings` in CI. |

# PART 4: PRODUCTION SCENARIOS

## Detailed Production Scenarios (1-10)

### Scenario 1: Memory Grows Steadily Until the Container Is OOM-Killed
**Question**: A Rust service's resident memory climbs by a few MB per hour. It restarts every night when Kubernetes kills it for exceeding its limit. There is no garbage collector, so what leaks and how do you find it?
**Detailed Remediation & Triage**:
1. **Confirm the shape.** Graph RSS over time. A staircase that tracks traffic suggests a cache or queue; a smooth ramp suggests a leak per request.
2. **Check the usual suspects.** `Arc`/`Rc` cycles (parent holds child, child holds parent: use `Weak` for the back edge), `HashMap`s used as caches with no eviction or TTL, unbounded channels, `Box::leak`, tasks that never finish, and `mem::forget`.
3. **Profile allocations.** Run a staging build with `heaptrack`, `dhat` or the allocator's profiler (jemalloc `prof`) and diff two snapshots taken an hour apart; the growing call site is the culprit.
4. **Rule out the allocator.** Memory freed by Rust may be held by the allocator. Compare `malloc_stats` / jemalloc stats with RSS; try `MALLOC_CONF` decay settings or switch allocator.
5. **Fix and guard.** Bound every cache (LRU with a maximum size and TTL), use bounded channels, break cycles with `Weak`, add a memory metric and an alert at 80% of the limit.

### Scenario 2: Latency Spikes Under Load but CPU Looks Idle
**Question**: An async API answers in 5 ms normally, but at 200 requests per second p99 jumps to seconds while CPU is only 30%. What is happening?
**Detailed Remediation & Triage**:
1. **Suspect runtime starvation.** Tokio has a small number of worker threads; a handler that blocks (`std::thread::sleep`, synchronous DB or file I/O, heavy CPU, a held `std::sync::Mutex`) pins a worker so other tasks wait to be polled.
2. **Look with `tokio-console`.** It shows tasks with long poll times and tasks that are idle but never woken.
3. **Find the blocking call.** Search for synchronous crates in async code (blocking HTTP clients, `std::fs`, `reqwest::blocking`, `diesel` without a pool wrapper).
4. **Fix.** Move CPU or blocking work to `spawn_blocking` or `rayon`, replace with async equivalents, shorten critical sections, and set per-request timeouts.
5. **Prevent.** Add a runtime health metric (tokio-metrics: poll duration, queue depth) and a load test to CI.

### Scenario 3: Requests Hang Forever and CPU Is at Zero
**Question**: After a deploy, some requests never complete. Threads and tasks exist but nothing progresses. How do you diagnose and fix a Rust deadlock?
**Detailed Remediation & Triage**:
1. **Capture state.** Attach `gdb`/`lldb` (`thread apply all bt`) or send a signal that dumps backtraces; for async, use `tokio-console` to see tasks that are never woken.
2. **Read the pattern.** Two threads blocked in `Mutex::lock` on different locks is classic lock-order inversion; one thread locking the same non-reentrant mutex twice self-deadlocks; a `MutexGuard` held across `.await` makes another task wait for a lock whose owner is parked.
3. **Fix lock order** (always acquire in one global order or merge the locks), **shorten critical sections**, never hold a guard across `.await`, and avoid calling unknown callbacks while locked.
4. **Consider design changes**: message passing with an owner task, or `try_lock` with backoff.
5. **Defend.** Use `parking_lot` deadlock detection in staging and add timeouts so hangs turn into errors.

### Scenario 4: One CPU Core at 100% and Throughput Is Capped
**Question**: A service uses 100% of a single core and cannot scale. Where do you look?
**Detailed Remediation & Triage**:
1. **Profile, do not guess.** `perf record -g` or `cargo flamegraph` on a release build with debug symbols shows which functions dominate.
2. **Typical causes.** A regex with catastrophic backtracking (use the `regex` crate, which avoids it, or check the pattern), JSON (de)serialisation of large payloads on the hot path, a spin loop or busy `try_recv`, per-request allocation, logging at debug level, or all work funnelled through one task or lock.
3. **Fix the hot spot**: reuse buffers, borrow instead of clone, stream rather than load whole documents, move work to a pool.
4. **Scale the shape**: shard work across tasks/threads, use `rayon` for data parallelism, or run multiple processes behind a load balancer.
5. **Lock it in** with a criterion benchmark so the regression cannot return.

### Scenario 5: A Panic Takes Down the Service
**Question**: A single malformed request triggers `unwrap()` on `None` and the process exits, dropping every in-flight request. How do you stop one bad input from killing everything?
**Detailed Remediation & Triage**:
1. **Understand panic behaviour.** In a Tokio task a panic is caught at the task boundary (the `JoinHandle` returns `Err`), but in the main thread, in `panic = "abort"` builds, or in code you spawned on plain threads it can end the process.
2. **Fix the root cause**: replace `unwrap`/indexing on external data with `?`, `get`, validation and typed errors.
3. **Contain failures**: handle each request in its own task, log `JoinError`s, add a panic hook that records the backtrace and request id, and (for web frameworks) use a catch-panic middleware that turns it into a 500.
4. **Keep the service up**: run several replicas, add readiness probes, and use a supervisor (systemd, Kubernetes) with backoff.
5. **Prevent regressions** with fuzzing (`cargo fuzz`) or property tests (`proptest`) on parsers and handlers.

### Scenario 6: OOM From a Growing Queue
**Question**: A consumer reads from Kafka and pushes work into an in-memory channel; under a traffic burst the process is OOM-killed. Why, and how do you fix it?
**Detailed Remediation & Triage**:
1. **Diagnose.** The channel is unbounded (or very large) and the workers are slower than the intake, so messages pile up. Memory graphs track queue length.
2. **Add back-pressure.** Replace it with a bounded channel (`mpsc::channel(N)`); when full, the producer awaits, which slows the Kafka poll loop instead of exhausting RAM.
3. **Size correctly.** Bound by bytes rather than count if messages vary widely; use a `Semaphore` for in-flight work.
4. **Scale the consumers.** More partitions and consumers, concurrent workers per message batch, batching writes.
5. **Observe.** Export queue depth, consumer lag and processing time; alert on sustained growth.

### Scenario 7: Database Pool Exhausted
**Question**: Requests fail with "timed out waiting for a connection from the pool" during peak traffic even though the database is healthy. What do you check?
**Detailed Remediation & Triage**:
1. **Who holds connections?** A connection is returned only when its handle is dropped. Look for handlers that hold a connection (or an open transaction) across slow work such as HTTP calls or `sleep`.
2. **Check pool settings.** `max_connections` too low for concurrency, or so high that the database refuses them; set `acquire_timeout` so failures are fast and visible.
3. **Find slow queries.** Missing indexes make each connection busy longer; use the database's slow-query log and `EXPLAIN`.
4. **Fix.** Acquire late and release early, keep transactions short, add indexes, cache hot reads, and size the pool from database capacity divided by the number of instances.
5. **Monitor** pool wait time, active connections and query latency per route.

### Scenario 8: Builds and CI Take 25 Minutes
**Question**: Developers wait 25 minutes for CI and several minutes for incremental builds. How do you speed up a Rust project?
**Detailed Remediation & Triage**:
1. **Measure.** `cargo build --timings` shows which crates dominate; `cargo tree -d` shows duplicate dependency versions.
2. **Cache in CI** (`Swatinem/rust-cache`, sccache) and use `--locked`; build once and reuse artifacts between jobs.
3. **Reduce work.** Split the project into a workspace so unchanged crates are not rebuilt, trim heavy default features, prefer `dyn` over deep generics in hot compile paths, and avoid proc-macro-heavy dependencies where possible.
4. **Faster tooling.** Use `mold` or `lld` as the linker, `cargo nextest` for test runs, `cargo check` during development, and lower debug info for dev profiles.
5. **Right-size the pipeline**: run format and clippy in parallel with tests, and build release artifacts only on main.

### Scenario 9: Rare Crashes or Corrupt Data From FFI or `unsafe` Code
**Question**: A service that wraps a C library crashes once a day with a segmentation fault, and sometimes returns garbage. How do you find undefined behaviour?
**Detailed Remediation & Triage**:
1. **Get evidence.** Enable core dumps (`ulimit -c unlimited`), keep debug symbols, and read the backtrace with `gdb`/`lldb` to see whether the crash is in Rust or in C.
2. **Review the boundary.** Check `#[repr(C)]` layouts, ownership of every pointer (who frees what, with which allocator), nullability, string encoding (NUL-terminated `CString`), lifetimes of buffers passed to C, thread-safety of the C library, and that no panic unwinds into C.
3. **Run the tools.** Miri for the Rust side, AddressSanitizer/ThreadSanitizer (`RUSTFLAGS=-Zsanitizer=address` on nightly), and Valgrind for the C side.
4. **Shrink the unsafe surface**: one small module, a safe wrapper type that owns the pointer (`Drop` frees it) and exposes only checked operations.
5. **Add tests**: fuzz the wrapper API and run it under sanitizers in CI.

### Scenario 10: Tail Latency Regressed After a Release
**Question**: After deploying a new version p99 latency doubled, but averages look the same. How do you find and remove the regression safely?
**Detailed Remediation & Triage**:
1. **Contain first.** Roll back or shift traffic away from the new version (canary or blue-green), then investigate with less pressure.
2. **Compare versions.** Diff dependency updates (`Cargo.lock`), feature flags and config. Compare traces and flamegraphs from old and new builds under the same load.
3. **Look at the tail.** Lock contention, a new synchronous call, extra allocation per request, a changed timeout or retry policy, or a downstream that now gets more calls.
4. **Reproduce** with a load test (`k6`, `oha`, `wrk`) against a staging environment and bisect commits (`git bisect`) with a benchmark as the test.
5. **Fix and protect**: add the benchmark to CI with a threshold, keep canary rollout with automatic rollback on latency or error-rate alerts, and write the findings into the runbook.

## Production Scenario Matrix (11-30)

| # | Symptom / Alert | Root Cause Diagnostics | Immediate Remediation |
| --- | --- | --- | --- |
| **11** | `Too many open files` (EMFILE) | File or socket handles not dropped; a new HTTP client created per request. | `lsof -p <pid>`; share one `reqwest::Client`; drop handles; raise `ulimit -n`. |
| **12** | Requests hang with no error | Missing timeouts on network calls. | Wrap calls in `timeout`, set client connect and request timeouts. |
| **13** | Tokio workers at 100% but throughput low | CPU-bound work running on the async runtime. | Move it to `spawn_blocking` or `rayon`. |
| **14** | `already borrowed: BorrowMutError` panic | Overlapping `RefCell` borrows. | Shorten borrow scopes, restructure, or use `try_borrow_mut`. |
| **15** | Build error: future cannot be sent between threads | A non-`Send` value (`Rc`, `MutexGuard`) lives across `.await`. | Drop it before awaiting, switch to `Arc`, or use an async-aware lock. |
| **16** | Release binary is huge | Debug info, no LTO, large generic instantiations. | `strip = true`, `lto`, `opt-level = "s"`, `codegen-units = 1`. |
| **17** | Docker image is hundreds of MB | Single-stage build ships the toolchain. | Multi-stage build; copy the binary to distroless or scratch. |
| **18** | Linking errors with musl or OpenSSL | Dynamic OpenSSL not available for the target. | Use `rustls`, or vendor OpenSSL. |
| **19** | Periodic latency spikes | Lock contention or allocator behaviour under load. | Profile, shorten locks, try `mimalloc` or `jemalloc`. |
| **20** | Memory not returned to the OS | Allocator keeps freed pages cached. | Tune the allocator's decay settings; confirm with allocator stats. |
| **21** | Deserialisation errors right after a deploy | Strict schema changed between producer and consumer. | `#[serde(default)]`, tolerate unknown fields, version the schema. |
| **22** | Consumer lag keeps growing | Slow handler or single-threaded processing. | Batch work, add concurrency, add partitions and consumers. |
| **23** | Messages processed twice | At-least-once delivery without idempotency. | Idempotency keys or a dedup table; commit offsets after success. |
| **24** | "Works on my machine" builds differ | `Cargo.lock` not committed or ignored in CI. | Commit the lockfile and build with `--locked`. |
| **25** | Security advisory for a dependency | Outdated crate with a known CVE. | `cargo audit`, update or replace the crate, add `cargo deny` to CI. |
| **26** | Flaky tests | Shared global state, fixed ports, real time. | Isolate state, use temp dirs and port 0, `tokio::time::pause`. |
| **27** | Memory per connection is high | Large per-task buffers or futures. | Size buffers, box large futures, cap concurrency with a `Semaphore`. |
| **28** | Deploys drop in-flight requests | No graceful shutdown. | Handle SIGTERM and drain with `with_graceful_shutdown`. |
| **29** | Slow startup / failing readiness probes | Heavy initialisation before listening. | Lazy-init non-critical parts, parallelise startup, tune probe delays. |
| **30** | No metrics or traces in production | Service not instrumented. | Add `tracing` spans, Prometheus metrics, health and readiness endpoints. |
