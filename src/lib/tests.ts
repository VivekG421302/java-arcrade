// Phase tests: 4 MCQ + 1 code question each (so 4/5 = 80% passes). Drawn from each phase's content.
export type TestQ =
  | { type: 'mcq'; q: string; opts: string[]; answer: number; why: string }
  | { type: 'code'; q: string; code: string; lang: string; accept: string[]; why: string }

const mcq = (q: string, opts: string[], answer: number, why: string): TestQ => ({ type: 'mcq', q, opts, answer, why })

export const JAVA_TESTS: Record<number, TestQ[]> = {
  1: [
    mcq('At what bucket chain length does HashMap convert a bucket into a Red-Black tree (table capacity ≥ 64)?', ['4', '6', '8', '16'], 2, 'TREEIFY_THRESHOLD = 8; UNTREEIFY_THRESHOLD = 6; the table must be at least 64 wide or it resizes instead.'),
    mcq('By what factor does ArrayList grow when full?', ['1.5×', '2×', '+10 slots', '3×'], 0, 'newCapacity = oldCapacity + (oldCapacity >> 1), i.e. 1.5×, copied with System.arraycopy().'),
    mcq('Why does ConcurrentHashMap prohibit null keys and values?', ['null has no hashCode', 'get() returning null would be ambiguous between "absent" and "mapped to null" under concurrency', 'It is faster', 'Legacy Java 7 behaviour only'], 1, 'In a concurrent map you cannot safely call containsKey() afterwards to disambiguate.'),
    mcq('Compressed OOPs let object references take 4 bytes instead of 8 below roughly what heap size?', ['8 GB', '16 GB', '32 GB', '64 GB'], 2, 'With 8-byte alignment, 32-bit references can address up to ~32 GB.'),
    { type: 'code', q: 'Many threads call inc(). Name one fix that makes it thread-safe (a class or keyword).', lang: 'java', code: 'private volatile int count;\n\npublic void inc() {\n    count++;\n}', accept: ['atomicinteger', 'atomiclong', 'longadder', 'synchronized', 'reentrantlock'], why: 'volatile guarantees visibility, not atomicity: count++ is read-modify-write. Use AtomicInteger/LongAdder or a lock.' },
  ],
  2: [
    mcq('Best fix for a Hibernate N+1 problem in a REST endpoint?', ['JOIN FETCH or @EntityGraph for the needed associations', 'Switch every association to EAGER', 'Add more connection-pool threads', 'Cache the controller response'], 0, 'EAGER hides the cost and loads graphs unconditionally; fetch joins load exactly what the query needs.'),
    mcq('What prevents SQL injection in raw JDBC?', ['Escaping quotes by hand', 'PreparedStatement parameter binding', 'Using Statement with trimmed input', 'Larger connection pool'], 1, 'Bound parameters are never parsed as SQL.'),
    mcq('Default fetch type of @OneToMany?', ['EAGER', 'LAZY', 'JOIN', 'NONE'], 1, 'Collections are LAZY by default; keep them that way and fetch explicitly per query.'),
    mcq('LazyInitializationException typically means…', ['The DB is down', 'A lazy association was touched after the session/transaction closed', 'Two entities share an ID', 'The pool is exhausted'], 1, 'Map to DTOs inside the service/transaction boundary.'),
    { type: 'code', q: 'Which JDBC interface should replace Statement here?', lang: 'java', code: 'Statement st = conn.createStatement();\nResultSet rs = st.executeQuery(\n    "SELECT * FROM users WHERE id = " + id);', accept: ['preparedstatement'], why: 'PreparedStatement with ? placeholders removes the injection vector and allows plan reuse.' },
  ],
  3: [
    mcq('Why does a @Transactional(REQUIRES_NEW) method called from another method in the same class not start a new transaction?', ['Spring forbids it', 'The self-call bypasses the AOP proxy', 'REQUIRES_NEW is deprecated', 'The method must be static'], 1, 'Proxy-based AOP only intercepts calls that cross the bean boundary. Move the method to another bean.'),
    mcq('By default @Transactional rolls back on…', ['All exceptions', 'Only checked exceptions', 'RuntimeException and Error', 'Nothing'], 2, 'Checked exceptions commit unless you set rollbackFor.'),
    mcq('Default scope of a Spring bean?', ['prototype', 'request', 'session', 'singleton'], 3, 'One shared instance per container, so beans must be stateless/thread-safe.'),
    mcq('Preferred dependency-injection style?', ['Field injection', 'Constructor injection', 'Setter injection only', 'Service locator'], 1, 'Constructor injection enables final fields, immutability and easy unit testing.'),
    { type: 'code', q: 'Which @Transactional attribute makes this roll back on IOException?', lang: 'java', code: '@Transactional\npublic void importFile(Path p) throws IOException {\n    repo.save(parse(p)); // may throw IOException\n}', accept: ['rollbackfor'], why: '@Transactional(rollbackFor = IOException.class) (or Exception.class).' },
  ],
  4: [
    mcq('HTTP status for an authenticated user lacking permission?', ['400', '401', '403', '404'], 2, '401 = not authenticated, 403 = authenticated but forbidden.'),
    mcq('What must a resource server verify before trusting a JWT’s claims?', ['The signature (plus expiry and issuer)', 'Only that it is Base64', 'That it is under 1 KB', 'The client IP'], 0, 'Decoding is not verifying; unsigned/unchecked tokens can be forged.'),
    mcq('RBAC grants access based on…', ['Individual user ACL entries only', 'Roles assigned to users', 'IP ranges', 'Token length'], 1, 'Permissions attach to roles; users get roles.'),
    mcq('How should /actuator/** be exposed in production?', ['Publicly', 'Behind authentication and an admin role', 'Only on port 80', 'Not at all, ever'], 1, 'Actuator leaks env values and heap/thread dumps: restrict it.'),
    { type: 'code', q: 'Replace permitAll() with the Spring Security expression/method that restricts this to admins.', lang: 'java', code: 'http.authorizeHttpRequests(a -> a\n    .requestMatchers("/actuator/**").permitAll()\n    .anyRequest().authenticated());', accept: ['hasrole', 'hasauthority'], why: '.hasRole("ADMIN") (or hasAuthority).' },
  ],
  5: [
    mcq('Within one Kafka consumer group, how many consumers can read a given partition at once?', ['Exactly one', 'Up to the replica count', 'All of them', 'Two'], 0, 'Partitions are assigned to a single consumer per group; extra consumers sit idle.'),
    mcq('Which approach best mitigates a cache stampede?', ['Remove all TTLs', 'Per-key locking / request coalescing with jittered TTLs', 'Bigger DB pool only', 'Disable caching'], 1, 'Only one caller recomputes a hot key; jitter prevents synchronized expiry.'),
    mcq('Risk of writing Redis keys without a TTL?', ['Slower reads', 'Memory fills up over time → eviction or OOM errors', 'Keys become read-only', 'None'], 1, 'Unbounded keys eventually hit maxmemory.'),
    mcq('Default index structure in InnoDB / PostgreSQL?', ['Hash', 'B-Tree', 'Bitmap', 'Trie'], 1, 'B-Tree supports equality, range and ordering.'),
    { type: 'code', q: 'What argument must be added to avoid unbounded Redis memory growth?', lang: 'java', code: 'redisTemplate.opsForValue().set(key, value);', accept: ['ttl', 'timeout', 'duration', 'expir'], why: 'Pass a Duration/timeout: set(key, value, Duration.ofMinutes(10)).' },
  ],
  6: [
    mcq('Which command shows per-thread CPU for a Java process?', ['ps -ef', 'top -H -p <pid>', 'jps -l', 'df -h'], 1, 'Then convert the hot thread ID to hex and search the thread dump for nid=0x….'),
    mcq('The hot thread ID must be converted to what before searching a thread dump?', ['Octal', 'Binary', 'Hexadecimal', 'Base64'], 2, 'Thread dumps print native IDs as nid=0x….'),
    mcq('Which tool takes a thread dump of a running JVM without extra agents?', ['jcmd <pid> Thread.print', 'tail -f', 'netstat', 'javac'], 0, 'jcmd ships with the JDK.'),
    mcq('Which strategy runs old and new versions side by side and flips all traffic at once, allowing instant rollback?', ['Recreate', 'Blue-green', 'Rolling', 'Canary'], 1, 'Blue-green switches the router between two full environments.'),
    { type: 'code', q: 'Which command lists a process’s open file descriptors to diagnose this error?', lang: 'bash', code: 'java.net.SocketException: Too many open files', accept: ['lsof'], why: 'lsof -p <pid> (and ensure clients are closed with try-with-resources).' },
  ],
}

export const RUST_TESTS: Record<number, TestQ[]> = {
  1: [
    mcq('What happens when you compile `let x = 5; x = 6;`?', ['It compiles and x becomes 6', 'Compile error: variables are immutable unless declared `let mut`', 'A runtime panic', 'It silently shadows x'], 1, 'Bindings are immutable by default. Use `let mut x` to allow reassignment, or shadow with a new `let`.'),
    mcq('After `let a = String::from("hi"); let b = a;` which statement is true?', ['Both a and b own the string', 'a was moved into b; using a afterwards is a compile error', 'The string is copied, so both are valid', 'b borrows a'], 1, 'String does not implement Copy, so assignment moves ownership. Use `.clone()` for a real copy or borrow with `&a`.'),
    mcq('At any one time you may have…', ['Any number of `&T` and `&mut T` together', 'Either one `&mut T` or any number of `&T`, never both', 'Exactly one `&T`', 'Only `&mut T` references'], 1, 'This exclusivity rule is what prevents data races and iterator invalidation at compile time.'),
    mcq('How does Rust represent "maybe a value"?', ['null', 'Option<T> with Some / None', 'A special sentinel like -1', 'Result<T, E>'], 1, 'There is no null: absence is `Option<T>`, and the compiler forces you to handle `None`.'),
    { type: 'code', q: 'The compiler rejects this function. Which language feature must you add to its signature to say how long the returned reference is valid?', lang: 'rust', code: 'fn longest(a: &str, b: &str) -> &str {\n    if a.len() > b.len() { a } else { b }\n}', accept: ['lifetime'], why: 'Add a lifetime parameter: `fn longest<\'a>(a: &\'a str, b: &\'a str) -> &\'a str`. It tells the compiler the result lives no longer than both inputs.' },
  ],
  2: [
    mcq('Which HashMap call inserts a default only when the key is missing and gives you a mutable reference?', ['map.get_or_default(k)', 'map.entry(k).or_insert(v)', 'map.put_if_absent(k, v)', 'map.insert(k, v) twice'], 1, 'The entry API does a single lookup: `*map.entry(k).or_insert(0) += 1`.'),
    mcq('`Box<dyn Shape>` calls methods through…', ['Static dispatch resolved at compile time', 'Dynamic dispatch with a vtable', 'Reflection', 'Macros'], 1, 'Trait objects use a vtable at run time; generics (`T: Shape`) are monomorphised and statically dispatched.'),
    mcq('What is the key difference between `Rc<T>` and `Arc<T>`?', ['Rc is faster and thread-safe', 'Arc uses atomic reference counts and can be shared across threads; Rc cannot', 'Arc can be mutated freely', 'There is no difference'], 1, 'Rc is not `Send`; use Arc when the value crosses threads.'),
    mcq('Which closure trait describes a closure that may only be called once?', ['Fn', 'FnMut', 'FnOnce', 'Copy'], 2, 'FnOnce consumes the values it captured, so it can run a single time.'),
    { type: 'code', q: 'Which iterator method turns this lazy `map` into a `Vec<i32>`?', lang: 'rust', code: 'let v: Vec<i32> = (1..=5).map(|x| x * 2)\n    /* ??? */;', accept: ['collect'], why: '`.collect()` consumes the iterator and builds the collection named by the type annotation.' },
  ],
  3: [
    mcq('Which pair of marker traits makes a type safe to move to, and share between, threads?', ['Copy and Clone', 'Send and Sync', 'Sized and Unpin', 'Eq and Hash'], 1, '`Send` = may be moved to another thread; `Sync` = `&T` may be shared across threads. The compiler checks them automatically.'),
    mcq('Why is holding a `std::sync::MutexGuard` across `.await` a problem?', ['It is a syntax error', 'The future stops being Send and the held lock can stall other tasks', 'It makes the mutex faster', 'Guards are free to hold'], 1, 'A guard held over a suspension point blocks other tasks needing the lock and breaks `tokio::spawn`. Drop it before awaiting.'),
    mcq('What does a bounded channel give you that an unbounded one does not?', ['Faster sends', 'Back-pressure: producers wait when the queue is full', 'Ordered delivery', 'Multiple consumers'], 1, 'Bounded queues stop a fast producer from exhausting memory.'),
    mcq('How do you run blocking or CPU-heavy code from async code without starving the runtime?', ['Call it directly in the async fn', 'tokio::task::spawn_blocking', 'Add more await points', 'Use std::thread::sleep'], 1, '`spawn_blocking` moves the work to a dedicated pool so runtime workers stay free.'),
    { type: 'code', q: 'This fails to compile because the value cannot be sent between threads. Which smart pointer should replace `Rc`?', lang: 'rust', code: 'let counter = Rc::new(Mutex::new(0));\nlet c = Rc::clone(&counter);\nthread::spawn(move || { *c.lock().unwrap() += 1; });', accept: ['arc'], why: 'Use `Arc<Mutex<_>>`: `Arc` has an atomic reference count and is `Send + Sync` when its contents are.' },
  ],
  4: [
    mcq('What does `unsafe` actually allow?', ['Disables the borrow checker everywhere', 'A few extra operations such as dereferencing raw pointers and calling unsafe functions', 'Skips type checking', 'Allows null references'], 1, 'The borrow checker still runs; `unsafe` only lets you do five specific things, and you promise the invariants hold.'),
    mcq('What is `#[repr(C)]` for?', ['Making a struct copyable', 'Giving a type a C-compatible memory layout for FFI', 'Enabling reference counting', 'Compressing the struct'], 1, 'Rust may reorder fields by default; `repr(C)` fixes the layout so C code can read the struct.'),
    mcq('Which tool can detect undefined behaviour in unsafe Rust?', ['rustfmt', 'Miri', 'cargo doc', 'cargo tree'], 1, 'Miri interprets your code and reports UB such as out-of-bounds access or invalid references.'),
    mcq('What should you do first when code is slow?', ['Rewrite it in unsafe', 'Profile a release build to find the real hot spot', 'Add clones', 'Disable optimisations'], 1, 'Measure with `--release`, criterion and flamegraphs before changing anything.'),
    { type: 'code', q: 'Cargo builds in debug mode by default. Which flag produces the optimised build you should benchmark?', lang: 'bash', code: 'cargo build --???', accept: ['release'], why: '`cargo build --release` (or `cargo run --release`) enables optimisations; debug builds can be 10-100x slower.' },
  ],
  5: [
    mcq('Which crate is the de-facto framework for (de)serialisation in Rust?', ['serde', 'rustfmt', 'tokio', 'clap'], 0, '`serde` with `#[derive(Serialize, Deserialize)]` powers JSON, TOML, YAML and more.'),
    mcq('What do SQLx `query!` macros give you?', ['An ORM', 'SQL that is checked against the database at compile time', 'Automatic migrations', 'Connection pooling'], 1, 'The macro connects to a database (or uses offline data) and verifies the SQL and column types when you compile.'),
    mcq('Which Axum extractor parses a JSON request body into a struct?', ['Path<T>', 'Query<T>', 'Json<T>', 'State<T>'], 2, '`Json<T>` deserialises the body with serde; `Path` and `Query` read URL parts.'),
    mcq('What does the `tracing` crate add compared with plain `log`?', ['Nothing', 'Structured events and spans that carry context across async code', 'Faster printing', 'A web UI'], 1, 'Spans track a unit of work (like a request) and attach fields to every event inside it.'),
    { type: 'code', q: 'Which crate provides the derive macro for tidy custom error enums (`#[derive(Error)]`)?', lang: 'rust', code: '#[derive(Debug, ???::Error)]\nenum AppError {\n    #[error("not found")]\n    NotFound,\n}', accept: ['thiserror'], why: '`thiserror` generates `Display` and `Error` impls for library-style error enums; `anyhow` is the application-side companion.' },
  ],
  6: [
    mcq('Which command runs the official linter?', ['cargo lint', 'cargo clippy', 'cargo check-style', 'rustc --lint'], 1, '`cargo clippy -- -D warnings` in CI turns lints into build failures.'),
    mcq('Which tool checks your dependencies against known security advisories?', ['cargo audit', 'cargo bench', 'cargo expand', 'cargo tree'], 0, '`cargo audit` uses the RustSec database; `cargo deny` adds licence and ban checks.'),
    mcq('Which target is typically used for small, fully static Docker images?', ['x86_64-pc-windows-msvc', 'x86_64-unknown-linux-musl', 'wasm32-unknown-unknown', 'aarch64-apple-darwin'], 1, 'musl links libc statically; pair it with `rustls` so you do not need OpenSSL.'),
    mcq('Which release-profile setting enables whole-program optimisation across crates?', ['debug = true', 'lto = true', 'incremental = true', 'overflow-checks = true'], 1, 'Link-time optimisation (with `codegen-units = 1`) usually shrinks and speeds up the binary at the cost of compile time.'),
    { type: 'code', q: 'Which cargo subcommand formats your code?', lang: 'bash', code: 'cargo ???  --all', accept: ['fmt'], why: '`cargo fmt --all` runs rustfmt over the whole workspace; `-- --check` makes it fail in CI instead of rewriting files.' },
  ],
}

export const testsFor = (course: 'java' | 'rust'): Record<number, TestQ[]> => (course === 'rust' ? RUST_TESTS : JAVA_TESTS)
