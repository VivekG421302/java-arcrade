// Phase/module tests: 4 MCQ + 1 code question each (so 4/5 = 80% passes). Drawn from each phase's content.
export type TestQ =
  | { type: 'mcq'; q: string; opts: string[]; answer: number; why: string }
  | { type: 'code'; q: string; code: string; lang: string; accept: string[]; why: string }

const mcq = (q: string, opts: string[], answer: number, why: string): TestQ => ({ type: 'mcq', q, opts, answer, why })

export const JAVA_TESTS: Record<number, TestQ[]> = {
  1: [
    mcq('Which problem did the first version of Java (Oak, 1991) set out to solve?', ['A program written for one device chip had to be rewritten for every other chip', 'Websites were too slow to load', 'Databases had no common query language', 'Memory was too expensive'], 0, 'Java compiles to neutral bytecode that a small translator (the JVM) on each device understands: one program, any machine.'),
    mcq('What neutral code does the Java compiler produce so one program can run on many machines?', ['Bytecode', 'x86 machine code', 'Assembly text', 'Source maps'], 0, 'The JVM loads and runs bytecode; the JIT compiler later turns the hot parts into fast machine code.'),
    mcq('What did Spring and Hibernate each set out to fix after the EJB years?', ['Spring: heavy, hard-to-test EJB. Hibernate: endless hand-written SQL for saving objects', 'Spring: slow databases. Hibernate: missing generics', 'Spring: applet security. Hibernate: JSP syntax', 'Both: slow startup of the JVM'], 0, 'Spring uses ordinary objects wired by a container (dependency injection); Hibernate maps objects to tables and writes the SQL.'),
    mcq('Java EE moved to the Eclipse Foundation but could not keep the “javax” name. What did the packages become?', ['jakarta', 'javax2', 'eclipse', 'jee'], 0, 'Spring Boot 3 and Hibernate 6 followed with jakarta.* packages.'),
    { type: 'code', q: 'This starts a cheap thread type designed for servers with huge numbers of waiting requests. What is it called (one word)?', lang: 'java', code: 'Thread.ofVirtual().start(() -> handle(request));', accept: ['virtual'], why: 'Virtual threads (final in Java 21) let simple blocking code serve many users without one costly OS thread each.' },
  ],
  2: [
    mcq('Which release made records final?', ['Java 11', 'Java 14', 'Java 16', 'Java 21'], 2, 'Records arrived as a preview in 14 and became final in 16: a data class in one line.'),
    mcq('Which set contains only LTS (long-term support) releases?', ['8, 11, 17, 21', '9, 10, 12, 13', '8, 12, 17, 20', '11, 15, 19, 22'], 0, 'Companies stay on LTS versions and skip the six-month releases in between.'),
    mcq('In which release did virtual threads become final?', ['Java 17', 'Java 19', 'Java 21', 'Java 24'], 2, 'They were previews in 19 and 20, then final in 21 together with pattern matching for switch.'),
    mcq('Which Java version is the baseline for Spring Boot 3 and Hibernate 6?', ['Java 8', 'Java 11', 'Java 17', 'Java 21'], 2, 'Java 17 is the common upgrade target from 8 or 11.'),
    { type: 'code', q: 'Which keyword (added in Java 10) lets the compiler work out a local variable’s type?', lang: 'java', code: '___ count = 10;   // the compiler infers int', accept: ['var'], why: 'var removes repeated typing for local variables; the type is still fixed at compile time.' },
  ],
  3: [
    mcq('Why do plain server-side sessions struggle when a site runs on many servers?', ['Servers do not share memory, so server B can forget a login stored on server A', 'Cookies cannot be sent to more than one server', 'Sessions can never expire', 'Browsers block session cookies'], 0, 'That pain led to signed tokens (JWT) that carry the identity with the request.'),
    mcq('What does OAuth give an app instead of your password?', ['A limited key that only works for what you allowed and can be cancelled', 'A copy of your password hash', 'Full access to the account', 'A cookie valid on every site'], 0, 'You approve on the provider’s own page; the app never sees your password.'),
    mcq('On a cache miss, what should the application do?', ['Read the database and save the answer in the cache', 'Return an error', 'Clear the whole cache', 'Wait for the entry to expire'], 0, 'Ask the cache first; on a miss, read the source and store the result with an expiry so it cannot go stale forever.'),
    mcq('Why do very deep pages get slow with page-number (offset) pagination?', ['The database still counts past all earlier rows', 'The JSON response gets larger', 'Indexes are dropped', 'The cache fills up'], 0, 'Offset pages also shift when new rows arrive, which is why cursor (keyset) pagination exists.'),
    { type: 'code', q: 'Which pagination style does this query use? It remembers the last row seen (one word).', lang: 'sql', code: 'SELECT * FROM orders\nWHERE id > :lastId\nORDER BY id\nLIMIT 20;', accept: ['cursor', 'keyset'], why: 'Cursor (keyset) pagination is fast and stable, but you cannot jump straight to page 50.' },
  ],
  4: [
    mcq('What does spring-boot-starter-web bring with it?', ['Spring MVC, Jackson and an embedded Tomcat', 'Hibernate and HikariCP', 'Spring Security and JWT', 'Kafka and Redis clients'], 0, 'That is why you can run a jar with no separate web server.'),
    mcq('What happens as soon as you add spring-boot-starter-security and change nothing else?', ['Every endpoint is locked and a random password is printed at startup', 'Nothing, security is off until configured', 'Only /admin is locked', 'JWT login is created for you'], 0, 'You then define your own SecurityFilterChain and users.'),
    mcq('What does a connection pool such as HikariCP save you from?', ['Opening a slow new database connection for every request', 'Writing SQL', 'Hashing passwords', 'Serialising JSON'], 0, 'It keeps a few connections open and lends them out.'),
    mcq('JJWT is split into three jars. Which one is the engine, needed only at runtime?', ['jjwt-impl', 'jjwt-api', 'spring-boot-starter-web', 'jackson-databind'], 0, 'jjwt-api is what your code calls; jjwt-impl does the work behind the scenes.'),
    { type: 'code', q: 'Which scope fits a JDBC driver that you never compile against?', lang: 'xml', code: '<dependency>\n  <groupId>com.mysql</groupId>\n  <artifactId>mysql-connector-j</artifactId>\n  <scope>___</scope>\n</dependency>', accept: ['runtime'], why: 'The driver is only needed when the app runs, so scope runtime keeps it off the compile classpath.' },
  ],
  5: [
    mcq('In the JWT build, where should the signing secret come from?', ['An environment variable referenced from application.yml', 'A constant inside JwtService', 'The browser', 'The users table'], 0, 'The setting is written as ${JWT_SECRET} so the real secret never lives in the repository.'),
    mcq('Which class reads the Authorization header on each request and sets the logged-in identity?', ['JwtAuthFilter', 'AuthController', 'AppUser', 'ShopApplication'], 0, 'The filter runs before the controller, verifies the token and tells Spring who the caller is.'),
    mcq('Which cache do you start with on a single server before moving to a shared one for many servers?', ['Caffeine', 'Redis', 'A database table', 'Browser localStorage'], 0, 'Caffeine lives inside the JVM; Redis is shared between servers.'),
    mcq('Which pagination style stays fast on very large tables?', ['Cursor (keyset)', 'Deep OFFSET pages', 'Loading everything then slicing', 'Random sampling'], 0, 'Cursor pagination jumps straight to the next rows with an indexed WHERE.'),
    { type: 'code', q: 'JWT APIs keep no server-side session. Which policy value fills the blank?', lang: 'java', code: 'http.sessionManagement(s -> s\n    .sessionCreationPolicy(SessionCreationPolicy.____));', accept: ['stateless'], why: 'STATELESS tells Spring Security never to create or use an HTTP session; each request proves itself with its token.' },
  ],
  6: [
    mcq('What range does the Integer cache cover, making == unreliable for larger numbers?', ['-128 to 127', '0 to 255', '-1024 to 1023', '0 to 127'], 0, 'Beyond that range two boxed Integers with equal values are different objects, so use equals().'),
    mcq('Why must a servlet not keep per-user data in fields?', ['One instance is shared by many request threads', 'Fields are always final', 'The container serialises the fields', 'A new servlet is created per request'], 0, 'The container creates one instance and calls service() on many threads.'),
    mcq('What happens to generic type parameters at runtime?', ['They are erased', 'They are enforced by the JVM', 'They become annotations', 'They are cached'], 0, 'Generics give compile-time safety only; this is type erasure.'),
    mcq('Which JDBC type stops SQL injection and supports batch inserts?', ['PreparedStatement', 'Statement', 'ResultSet', 'DriverManager'], 0, 'Bound parameters are never parsed as SQL.'),
    { type: 'code', q: 'Lookups in this HashMap key fail. Which method must be overridden together with equals()?', lang: 'java', code: 'class Key {\n  int id;\n  @Override public boolean equals(Object o) {\n    return o instanceof Key k && k.id == id;\n  }\n}', accept: ['hashcode'], why: 'HashMap uses hashCode to pick the bucket and equals to find the key; breaking the contract makes keys unfindable.' },
  ],
  7: [
    mcq('Which index type is the default in PostgreSQL?', ['B-tree', 'Hash', 'GIN', 'BRIN'], 0, 'GIN, GiST and BRIN suit text, geometry and huge ordered data.'),
    mcq('What does MVCC make possible?', ['Readers never block writers because rows keep several versions', 'Tables without primary keys', 'Automatic index creation', 'Queries without a planner'], 0, 'Isolation levels then choose how much concurrency anomaly you accept.'),
    mcq('Which command shows what a query actually did, with real timings?', ['EXPLAIN ANALYZE', 'EXPLAIN', 'VACUUM', 'CREATE INDEX'], 0, 'EXPLAIN shows the planned route; ANALYZE runs it and reports what happened.'),
    mcq('What does VACUUM clean up?', ['Dead row versions left behind by updates', 'Unused indexes', 'Old log files only', 'Duplicate rows'], 0, 'Without it tables bloat with dead rows.'),
    { type: 'code', q: 'What kind of function is AVG(...) OVER (...) — one that calculates across rows without collapsing them (one word)?', lang: 'sql', code: 'SELECT name, salary,\n       AVG(salary) OVER (PARTITION BY dept) AS dept_avg\nFROM emp;', accept: ['window'], why: 'Window functions keep every row and add a calculated column, like a running balance on a statement.' },
  ],
  8: [
    mcq('Why does a @Transactional method called from another method in the same class not get its own transaction behaviour?', ['The self-call skips the proxy', 'Spring forbids it', 'The method must be static', 'Transactions only work on controllers'], 0, 'Spring adds transactions by wrapping beans in proxies, and an internal call never goes through the proxy.'),
    mcq('Which injection style is preferred in Spring?', ['Constructor injection', 'Field injection', 'Setter injection only', 'new inside the class'], 0, 'It allows final fields and makes dependencies explicit.'),
    mcq('Which Hibernate entity state is tracked and written on flush?', ['Managed', 'Transient', 'Detached', 'Removed'], 0, 'Dirty checking only applies to managed entities in the persistence context.'),
    mcq('How does optimistic locking detect a conflict?', ['A @Version column is checked and the update fails on mismatch', 'The row is locked up front', 'The table is locked', 'Two sessions are not allowed'], 0, 'Pessimistic locking blocks others up front; optimistic locking fails the late writer.'),
    { type: 'code', q: 'Which keyword fixes the N+1 problem by loading the items in the same query?', lang: 'java', code: '@Query("select o from Order o JOIN ____ o.items")\nList<Order> findAllWithItems();', accept: ['fetch'], why: 'JOIN FETCH (or an entity graph) loads the association together with the parent instead of one extra query per row.' },
  ],
  9: [
    mcq('What does Spring Boot auto-configuration look at to decide which beans to create?', ['What is on the classpath and in your config', 'The file names in src/test', 'The Git history', 'Environment colour'], 0, 'Starters bring the dependencies; auto-configuration reacts to them.'),
    mcq('Which annotation binds application.yml values to a typed class?', ['@ConfigurationProperties', '@Component', '@Bean', '@Autowired'], 0, 'Profiles and environment variables then change values without rebuilding.'),
    mcq('Where should API errors be turned into responses in one place?', ['@ControllerAdvice', 'Each controller method', 'The repository', 'A servlet listener'], 0, 'RFC 7807 gives those errors a standard JSON shape.'),
    mcq('Which three signals make up observability?', ['Logs, metrics and traces', 'Tests, builds and releases', 'Heap, stack and metaspace', 'Beans, scopes and profiles'], 0, 'Logs say what happened, metrics say how much, traces say where time went.'),
    { type: 'code', q: 'Which annotation on the parameter triggers bean validation?', lang: 'java', code: 'public ResponseEntity<?> register(\n    @RequestBody @____ RegisterRequest r) { ... }', accept: ['valid'], why: '@Valid checks the input before any logic runs; a bad request is answered with 400.' },
  ],
  10: [
    mcq('Which Spring Boot version moved javax packages to jakarta?', ['Spring Boot 3', 'Spring Boot 1', 'Spring Boot 2.0', 'Spring Boot 2.7'], 0, 'This is the biggest mechanical change in a legacy-to-modern migration.'),
    mcq('What is the incident checklist order?', ['Metrics, logs, thread/heap dumps, fix, blameless review', 'Fix, logs, metrics, dumps, review', 'Restart, fix, review, logs, metrics', 'Review, dumps, fix, metrics, logs'], 0, 'Observe before you change anything, and learn from it afterwards without blame.'),
    mcq('Which pair belongs to the Java 8 to 21 modernisation?', ['Records and virtual threads', 'Applets and the Security Manager', 'JSP and EJB', 'Struts and Hibernate 3'], 0, 'Text blocks, records and virtual threads are the headline wins of moving from 8 to 21.'),
    mcq('In the capstone, which milestone adds Hibernate, the N+1 fix and optimistic locking?', ['The second one', 'The first one (JDBC CRUD)', 'The third one (Boot REST)', 'None of them'], 0, 'Milestone 1 is JDBC with pooling and indexes; milestone 3 is Boot REST, validation, Actuator, Flyway and the outbox.'),
    { type: 'code', q: 'After upgrading to Spring Boot 3, which package prefix replaces javax in this import (one word)?', lang: 'java', code: 'import javax.persistence.Entity;', accept: ['jakarta'], why: 'javax.persistence became jakarta.persistence.' },
  ],
  11: [
    mcq('Which servlet method runs once for every request?', ['service()', 'init()', 'destroy()', 'load()'], 0, 'init() runs once at the start and destroy() once at shutdown.'),
    mcq('How many states does a Java thread move between?', ['4', '5', '6', '7'], 2, 'NEW, RUNNABLE, BLOCKED, WAITING, TIMED_WAITING and TERMINATED.'),
    mcq('What does close() do on a pooled database connection?', ['Returns it to the pool', 'Closes the socket for good', 'Rolls back and deletes the pool', 'Nothing at all'], 0, 'The pool opens a connection once, lends it many times and replaces it when old.'),
    mcq('In PostgreSQL an UPDATE writes a new row version. What later removes the old one?', ['VACUUM', 'COMMIT', 'The client driver', 'EXPLAIN'], 0, 'Readers keep seeing the old version until nobody needs it.'),
    { type: 'code', q: 'After persist(), which of the four entity states is the order in (one word)?', lang: 'java', code: 'em.persist(order);   // order is now ___', accept: ['managed'], why: 'Hibernate tracks and saves changes only for managed entities; flush writes them to the database.' },
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

/** A fresh copy of a test with each multiple-choice question's options in a random order (the right answer is re-pointed), so no position is ever the answer by habit. */
export const shuffleOptions = (qs: TestQ[]): TestQ[] =>
  qs.map((q) => {
    if (q.type !== 'mcq') return q
    const order = q.opts.map((_, i) => i)
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]] }
    return { ...q, opts: order.map((i) => q.opts[i]), answer: order.indexOf(q.answer) }
  })

export const testsFor = (course: 'java' | 'rust'): Record<number, TestQ[]> => (course === 'rust' ? RUST_TESTS : JAVA_TESTS)
