// Module tests: 4 MCQ + 1 code question each (so 4/5 = 80% passes). Drawn from each module's content.
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
    mcq('In what order are local variables dropped when a scope ends?', ['Reverse order of declaration', 'Order of declaration', 'Random order', 'Largest value first'], 0, 'Locals drop in reverse declaration order, while the fields of a struct drop in declaration order. Both are deterministic: there is no garbage collector.'),
    mcq('Which of these is a fat pointer (a data pointer plus extra metadata)?', ['&[T] (a slice reference)', '&i32', 'Box<i32>', '*const u8'], 0, 'Slices carry a length and trait objects (dyn Trait) carry a vtable pointer next to the data pointer, so both are twice the size of a thin pointer.'),
    mcq('Which borrowing rule does the compiler enforce at any one moment?', ['Either one &mut T or any number of &T, never both', 'Any number of &mut T together', 'Exactly one &T at a time', 'One &T and one &mut T together'], 0, 'This exclusivity is what prevents data races and iterator invalidation at compile time.'),
    mcq('Which smart pointer lets you break a reference cycle between Rc values?', ['Weak<T>', 'Box<T>', 'Cell<T>', 'Cow<T>'], 0, 'Weak does not keep the value alive. Upgrade it to an Rc when you need access; it returns None once the value is gone.'),
    { type: 'code', q: 'Which std::mem function moves the value out of a field and leaves a default in its place (one word)?', lang: 'rust', code: 'let old = std::mem::___(&mut self.buffer);', accept: ['take'], why: 'mem::take replaces the value with Default::default() and returns the old one, so you can move out of a borrowed field. mem::replace lets you choose the placeholder.' },
  ],
  2: [
    mcq('What does the ? operator do when it meets an Err?', ['Returns early from the function with the error, converted through From', 'Panics with the error message', 'Ignores the error and continues', 'Retries the call once'], 0, 'On Ok it unwraps the value; on Err it returns early after calling From::from to convert the error type.'),
    mcq('A match on an enum is missing one variant and has no wildcard arm. What happens?', ['A compile error: matches must be exhaustive', 'A runtime panic when that variant appears', 'The missing variant is ignored', 'A warning only'], 0, 'Exhaustiveness checking is why adding an enum variant shows you every place that needs updating.'),
    mcq('Which crate is the usual choice for typed errors in a library, and which for an application?', ['thiserror for libraries, anyhow for applications', 'anyhow for libraries, thiserror for applications', 'serde for both', 'tracing for both'], 0, 'Libraries expose precise error enums callers can match on; applications mostly need context and a readable report.'),
    mcq('Why is Option<&T> the same size as &T?', ['The null pointer is used for None (niche optimisation)', 'Option is always free', 'Rust stores the tag in the heap', 'It is not the same size'], 0, 'A reference can never be null, so None can use that unused bit pattern and no extra tag is needed.'),
    { type: 'code', q: 'Which Option method converts it into a Result with the error you give (write the method name, e.g. ok_something)?', lang: 'rust', code: 'let user = users.get(&id).___(AppError::NotFound)?;', accept: ['okor'], why: 'ok_or turns None into Err(...). Use ok_or_else when building the error is expensive, so the closure only runs on the failure path.' },
  ],
  3: [
    mcq('What do the marker traits Send and Sync mean?', ['Send: may be moved to another thread. Sync: &T may be shared between threads', 'Send: can be copied. Sync: can be cloned', 'Send: is heap allocated. Sync: is stack allocated', 'Send: can be printed. Sync: can be compared'], 0, 'The compiler derives them automatically. Rc is neither, which is why it cannot cross threads; Arc can.'),
    mcq('A thread panics while holding a std::sync::Mutex. What happens to the next lock() call?', ['It returns an Err because the mutex is poisoned', 'It deadlocks forever', 'It succeeds and nothing is recorded', 'The program aborts'], 0, 'Poisoning warns you that the protected data may be half-updated. You can still recover the guard from the error if that is safe.'),
    mcq('Which pair of orderings publishes data written before a flag, so another thread sees it after reading the flag?', ['Release on the store, Acquire on the load', 'Relaxed on both', 'Acquire on the store, Release on the load', 'No ordering is needed on x86'], 0, 'Release makes earlier writes visible to the thread that Acquire-loads the same value. Relaxed gives atomicity only, with no ordering of other memory.'),
    mcq('What does std::sync::mpsc stand for?', ['Multi-producer, single-consumer', 'Many pointers, shared counter', 'Mutex pool, shared cache', 'Message passing, safe channels'], 0, 'Clone the Sender for more producers; there is exactly one Receiver. Use crossbeam or tokio channels for other shapes.'),
    { type: 'code', q: 'Which function lets spawned threads borrow local variables, because they are all joined before it returns (one word)?', lang: 'rust', code: 'std::thread::___(|s| {\n    s.spawn(|| println!("{:?}", data));\n});', accept: ['scope'], why: 'thread::scope proves that every spawned thread finishes before the borrowed data goes away, so no Arc or move is needed.' },
  ],
  4: [
    mcq('What does a Future do until something polls it?', ['Nothing: futures are lazy', 'It runs immediately on a new thread', 'It starts and pauses at the first await', 'It blocks the caller'], 0, 'Creating a future only builds a state machine. The executor drives it by calling poll.'),
    mcq('What does poll return when the future is not ready yet?', ['Poll::Pending, after arranging for the Waker to be called later', 'Poll::Ready(None)', 'An Err value', 'It blocks until ready'], 0, 'The future stores the Waker from its Context and wakes it when progress is possible, so the executor does not busy-wait.'),
    mcq('Why does Pin exist?', ['A future may hold references into itself, so it must not move once polled', 'It makes futures run faster', 'It forces futures onto the heap', 'It replaces Send'], 0, 'async blocks compile to self-referential state machines. Pin promises the value will not move in memory.'),
    mcq('How should CPU-heavy or blocking code be run from async code on Tokio?', ['tokio::task::spawn_blocking', 'Call it directly inside the async fn', 'std::thread::sleep between awaits', 'Add more .await points'], 0, 'Blocking a worker thread stalls every task scheduled on it. spawn_blocking uses a separate thread pool.'),
    { type: 'code', q: 'An async fn compiles into a state machine that implements which trait (one word)?', lang: 'rust', code: 'fn fetch() -> impl ___<Output = u8> {\n    async { 7 }\n}', accept: ['future'], why: 'Every async block or fn returns an anonymous type that implements Future. await simply polls it to completion.' },
  ],
  5: [
    mcq('Which extractor must come last in an Axum handler signature?', ['The one that consumes the request body, such as Json<T>', 'State<T>', 'Path<T>', 'Query<T>'], 0, 'The body can only be read once. Extractors that read headers or the URL can appear before it.'),
    mcq('Which two methods make up the core of the tower::Service trait?', ['poll_ready and call', 'start and stop', 'get and set', 'send and receive'], 0, 'poll_ready signals back-pressure and call handles one request. A Layer wraps a Service in another Service.'),
    mcq('Which serde attribute turns snake_case fields into camelCase JSON keys?', ['#[serde(rename_all = "camelCase")]', '#[serde(camel)]', '#[derive(CamelCase)]', '#[serde(flatten)]'], 0, 'It is applied once on the struct or enum, so you do not rename every field by hand.'),
    mcq('Why put tracing as the outermost layer of the middleware stack?', ['So every request is logged, including those rejected by auth, rate limiting or timeouts', 'Because it is the fastest layer', 'Because layers run in random order', 'So that it can modify the response body'], 0, 'The usual order is trace, auth, rate limit, timeout, then the handler. Outer layers see everything that inner layers decide.'),
    { type: 'code', q: 'Which extractor type gives a handler access to shared application state (type name)?', lang: 'rust', code: 'async fn list(___(state): ___<AppState>) -> impl IntoResponse { /* ... */ }', accept: ['state'], why: 'State<AppState> is cloned out of the router, usually holding a connection pool and configuration behind Arc.' },
  ],
  6: [
    mcq('What does the sqlx::query! macro check at compile time?', ['The SQL and the column types against a real database or saved metadata', 'Only that the string is valid UTF-8', 'Nothing, it is a runtime check', 'Only that the connection pool exists'], 0, 'It needs DATABASE_URL while compiling, or offline metadata produced by cargo sqlx prepare so CI can build without a database.'),
    mcq('A request holds a pooled connection while it calls a slow external API. What is the likely result under load?', ['Pool exhaustion: other requests wait for a connection', 'Faster queries', 'Automatic pool growth', 'Nothing, pools are unlimited'], 0, 'Acquire late, release early, and keep slow non-database work outside the borrowed connection.'),
    mcq('What is the safe way to rename a column with zero downtime?', ['Expand/contract: add the new column, migrate data and code, then drop the old one', 'Rename it in one migration and deploy', 'Stop the app and run ALTER TABLE', 'Drop and recreate the table'], 0, 'Old and new application versions run together during a rollout, so both schemas must work at the same time.'),
    mcq('How does SQLx differ from Diesel?', ['SQLx is async and uses raw SQL checked at compile time; Diesel is a query DSL (synchronous by default)', 'SQLx is an ORM with a query DSL; Diesel runs raw SQL', 'They are identical', 'Diesel is async only'], 0, 'SQLx keeps SQL visible and verified. Diesel builds queries in Rust types and adds a schema layer.'),
    { type: 'code', q: 'Which macro embeds the migration files into the binary so they can be run at startup (one word)?', lang: 'rust', code: 'sqlx::___!("./migrations").run(&pool).await?;', accept: ['migrate'], why: 'sqlx::migrate! reads the migrations directory at compile time; .run applies any that are pending.' },
  ],
  7: [
    mcq('What is the difference between a tracing span and an event?', ['A span covers a period of work with its own context; an event is a single moment inside it', 'They are the same thing', 'A span is a metric and an event is a log file', 'Events cover a duration, spans do not'], 0, 'Fields recorded on a span are attached to every event inside it, which is how request IDs follow async code.'),
    mcq('Why should you avoid labels such as user_id on Prometheus metrics?', ['High cardinality creates a time series per value and exhausts memory', 'Labels are not supported', 'They slow the compiler', 'They are insecure by default'], 0, 'Keep label values to small bounded sets such as route, method and status class. Put per-user detail in logs and traces.'),
    mcq('What does tokio-console need in the application build?', ['console-subscriber and the tokio_unstable cfg flag', 'Only a debug build', 'A running Docker daemon', 'The jemalloc allocator'], 0, 'RUSTFLAGS="--cfg tokio_unstable" enables the runtime instrumentation that the console reads.'),
    mcq('What does cargo-chef speed up in Docker builds?', ['It caches the compiled dependency layer so only your code rebuilds', 'It removes the need for Cargo.lock', 'It compresses the final image', 'It runs tests in parallel'], 0, 'It builds a recipe from the manifests, compiles dependencies once as a cached layer, then compiles your source on top.'),
    { type: 'code', q: 'Which libc does this target triple use to produce a fully static Linux binary that runs in a scratch image (one word)?', lang: 'bash', code: 'rustup target add x86_64-unknown-linux-___', accept: ['musl'], why: 'musl links libc statically. Pair it with rustls to avoid OpenSSL, and watch DNS behaviour and allocator performance.' },
  ],
}

export const POSTGRES_TESTS: Record<number, TestQ[]> = {
  1: [
    mcq('Which process listens for new connections and forks one backend process for each of them?', ['The postmaster', 'The checkpointer', 'The WAL writer', 'The autovacuum launcher'], 0, 'The postmaster never runs user SQL. It checks pg_hba.conf, forks a backend for the client and supervises the background workers, so one session crashing does not take the others down.'),
    mcq('What is the write-ahead logging (WAL) rule?', ['A change is written to the log before the data file is changed', 'The data file is written first and the log is written later', 'The log is only written once a day', 'The log replaces the data files'], 0, 'Because the log reaches disk first, PostgreSQL can replay it after a crash and reopen without losing committed work.'),
    mcq('Which background process periodically writes dirty pages from shared buffers to the data files?', ['The checkpointer', 'The postmaster', 'The stats collector', 'The backend that ran the query'], 0, 'A checkpoint flushes dirty pages and marks a point from which crash recovery can start, so recovery stays short.'),
    mcq('Which file decides which clients may connect from which addresses, and how they must authenticate?', ['pg_hba.conf', 'postgresql.conf', 'pg_ident.conf', 'PG_VERSION'], 0, 'pg_hba.conf (host-based authentication) is read by the postmaster before any backend exists. postgresql.conf holds the server settings.'),
    { type: 'code', q: 'Which function makes the server re-read its configuration files without a restart (write the function name)?', lang: 'sql', code: "ALTER SYSTEM SET shared_buffers = '1GB';\nSELECT ___();", accept: ['pgreloadconf'], why: 'pg_reload_conf() reloads settings that can change at runtime. A setting such as shared_buffers still needs a full restart before it takes effect.' },
  ],
  2: [
    mcq('Which column type should you choose to store a moment in time?', ['timestamptz', 'timestamp without time zone', 'text', 'date'], 0, 'timestamptz stores the instant in UTC and shows it in each session\'s time zone, so it means the same moment for every user.'),
    mcq('Which constraint stops two bookings for the same room from overlapping in time?', ['An EXCLUDE constraint on a range column', 'A UNIQUE constraint on the room id', 'A CHECK constraint on the room id', 'A NOT NULL constraint'], 0, 'EXCLUDE USING gist (room_id WITH =, during WITH &&) refuses overlapping ranges. For plain types such as int it needs the btree_gist extension.'),
    mcq('Which index type makes a JSONB containment query (the @> operator) fast?', ['GIN', 'Hash', 'BRIN on the row order', 'No index can help'], 0, 'A GIN index on the jsonb column indexes the keys and values inside the documents, so containment and key-exists searches avoid a full table scan.'),
    mcq('A partitioned table is split by created_at. What must a primary key on it include?', ['The partition key column (created_at)', 'Nothing special', 'Only a text column', 'A foreign key to every partition'], 0, 'Each partition enforces its own unique index, so a unique rule across partitions is only possible when it includes the partition key, for example PRIMARY KEY (id, created_at).'),
    { type: 'code', q: 'Which keyword makes the database reject ids supplied by hand (one word)?', lang: 'sql', code: 'CREATE TABLE orders (\n  id bigint GENERATED ___ AS IDENTITY PRIMARY KEY,\n  placed_at timestamptz NOT NULL DEFAULT now()\n);', accept: ['always'], why: 'GENERATED ALWAYS AS IDENTITY refuses manual values unless you say OVERRIDING SYSTEM VALUE. BY DEFAULT allows them, and the old SERIAL type is the legacy way to do this.' },
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

export const testsFor = (course: 'java' | 'rust' | 'postgres'): Record<number, TestQ[]> => (course === 'rust' ? RUST_TESTS : course === 'postgres' ? POSTGRES_TESTS : JAVA_TESTS)
