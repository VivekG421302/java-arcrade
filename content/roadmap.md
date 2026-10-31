# Java Developer Comprehensive Mastery Roadmap & Production Question Bank
## Enterprise Maintenance, Maintenance Engineering & Systems Diagnostic Focus

---

# PART 1: COMPREHENSIVE ROADMAP & SKILL MATRIX

## Phase 1: Core Java & JVM Internals

### 1. Fundamentals, Memory Representation & Modern Language Features
- **Primitive vs. Reference Types**:
  - Memory allocation difference: Primitives live on the Stack or inline within Heap objects; Reference types store object references on Stack pointing to Heap instances.
  - Autoboxing/Unboxing: Overhead of `Integer.valueOf()` vs `int`, object header overhead (12 bytes mark/class word + alignment), memory bloat in collections (`ArrayList<Integer>` vs `int[]`).
  - Memory Footprint Calculation: Object alignment (8-byte boundaries), Compressed OOPs (`-XX:+UseCompressedOops`), references taking 4 bytes instead of 8 bytes below 32GB heap.
- **Modern Java Evolution (Java 8 to 21)**:
  - Java 8: Functional Interfaces, Lambda Syntax, Stream API pipelines, `Optional<T>` usage and anti-patterns (`Optional.get()` without `isPresent()`).
  - Java 11: HTTP Client API, `var` local variable type inference, String utilities (`repeat`, `isBlank`, `lines`), nest-based access control.
  - Java 17 (LTS): Sealed classes and interfaces (`sealed`, `permits`), Record classes (`record`), Pattern matching for `instanceof`, Text blocks (`"""`), Switch expressions with yield.
  - Java 21 (LTS): Virtual Threads (`Thread.ofVirtual()`), Structured Concurrency, Scoped Values, Pattern Matching for `switch`, Sequenced Collections (`SequencedCollection`, `SequencedSet`, `SequencedMap`).

### 2. Deep Dive: Java Collections Framework Internals
- **List Implementations**:
  - `ArrayList`: Dynamic array resizing growth factor ($1.5\times$ capacity expansion via `oldCapacity + (oldCapacity >> 1)`), array copy overhead via `System.arraycopy()`.
  - `LinkedList`: Doubly linked node structure, cache-miss penalties due to non-contiguous memory, $O(N)$ random access vs $O(1)$ `ArrayList` indexing.
  - `CopyOnWriteArrayList`: ReentrantLock thread-safety with array copy on write operations, zero-lock reads, ideal for read-heavy thread-safe operations.
- **Map Internals**:
  - `HashMap`: Internal table array of `Node<K,V>`, initial capacity (16), load factor (0.75), bucket index calculation `(n - 1) & hash`.
  - Collision Resolution: Treeification threshold (`TREEIFY_THRESHOLD = 8`), Untreeify threshold (`UNTREEIFY_THRESHOLD = 6`), Min treeify capacity (64). Red-Black Tree search complexity conversion from $O(N)$ to $O(\log N)$.
  - `ConcurrentHashMap`: Segmented locking (Java 7) vs Fine-grained node locking using `CAS` (Compare-And-Swap) + `synchronized` on bucket head nodes (Java 8+). `ConcurrentHashMap` prohibits `null` keys or values to avoid ambiguity in concurrent retrieval.
  - `LinkedHashMap`: Double-linked list running through entries maintaining insertion-order or access-order (LRU Cache foundation via `removeEldestEntry()`).
  - `TreeMap`: Red-Black tree self-balancing BST implementation, $O(\log N)$ search, insert, delete; requires `Comparable` or `Comparator`.

### 3. Concurrency, Multithreading & Memory Model
- **Java Memory Model (JMM)**:
  - Happens-Before Relationship: Rules governing instruction reordering across thread boundaries.
  - `volatile` Keyword: Guarantees visibility across CPU caches (flushes memory barriers / bus locks), guarantees load/store ordering, does **not** guarantee atomicity (e.g., `count++` is non-atomic).
- **Locks & Synchronization**:
  - Intrinsic Locks (`synchronized`): Mark word state changes (Biased -> Lightweight -> Heavyweight Monitor locking via OS mutexes).
  - Explicit Locks (`java.util.concurrent.locks`): `ReentrantLock` (fair vs unfair queues), `ReentrantReadWriteLock` (shared read lock, exclusive write lock), `StampedLock` (optimistic read validation to eliminate lock acquisition overhead).
- **Thread Pools & Executors**:
  - `ThreadPoolExecutor` parameters: `corePoolSize`, `maximumPoolSize`, `keepAliveTime`, `workQueue` (`ArrayBlockingQueue`, `LinkedBlockingQueue`, `SynchronousQueue`), `threadFactory`, `RejectedExecutionHandler` (`AbortPolicy`, `CallerRunsPolicy`, `DiscardPolicy`, `DiscardOldestPolicy`).
  - Common Pitfalls: Unbounded `LinkedBlockingQueue` causing `OutOfMemoryError` under high traffic; resource leaks due to unhandled thread exceptions.
- **Java 21 Virtual Threads (Project Loom)**:
  - Carrier Threads vs Virtual Threads: Virtual threads mapped onto OS platform threads by the JVM scheduler.
  - Thread Pinning Hazards: When a virtual thread executes inside a `synchronized` block/method or native code call, locking the underlying carrier thread. Remediation: Replace `synchronized` with `ReentrantLock`.

### 4. JVM Architecture, Memory Leak Diagnostics & Profiling
- **JVM Memory Regions**:
  - Heap: Young Generation (Eden, Survivor 0, Survivor 1) and Old Generation (Tenured).
  - Non-Heap: Metaspace (native memory for class metadata, replaces PermGen), Thread Stacks (default 1MB per thread `-Xss`), Code Cache (JIT compiled native instructions), Direct Native Memory (NIO `ByteBuffer.allocateDirect`).
- **Garbage Collectors**:
  - Serial / Parallel GC: Throughput-focused collectors utilizing full Stop-The-World (STW) pauses.
  - G1 GC: Region-based collector, target pause time goal (`-XX:MaxGCPauseMillis`), concurrent marking phases, mixed collections.
  - ZGC / Shenandoah: Ultra-low latency collectors performing concurrent compaction with STW pauses $< 1\text{ ms}$ regardless of heap size (gigabytes to terabytes).
- **Production Diagnostics & Profiling**:
  - CLI Diagnostic Utilities:
    - `jps -lv` : List running JVM processes with system flags.
    - `jcmd <pid> Thread.print` : Capture thread dump.
    - `jcmd <pid> GC.heap_dump /path/dump.hprof` : Trigger heap dump without process shutdown.
    - `jstat -gcutil <pid> 1000` : Monitor real-time GC statistics and generation utilization every 1 second.
    - `jmap -histo:live <pid>` : Quick object histogram of live objects.
  - Root Cause Triage for `OutOfMemoryError` Types:
    - `java.lang.OutOfMemoryError: Java heap space`: Memory leak (unclosed collections, static maps holding references) or insufficient memory allocation (`-Xmx`).
    - `java.lang.OutOfMemoryError: Metaspace`: Dynamic class loading leaks (unbound CGLIB proxies, memory leaks in custom ClassLoaders).
    - `java.lang.OutOfMemoryError: Unable to create new native thread`: OS process/user limits (`ulimit -u`) reached or stack allocation memory starvation.

---

## Phase 2: Persistence, JDBC, Servlets & ORM Tuning

### 1. Servlet Container & Raw JDBC Architecture
- **Servlet Specification**:
  - Servlet Lifecycle: `init()`, `service(ServletRequest, ServletResponse)`, `destroy()`.
  - Servlet Filters: Intercepting requests prior to servlet execution (`doFilter()`), chaining via `FilterChain`. Thread safety warning: Servlets and Filters are singletons shared across requests—do not store request state in instance variables.
- **Low-Level JDBC & Connection Pooling**:
  - JDBC Abstraction: `DriverManager`, `Connection`, `PreparedStatement` (pre-compiled binary SQL protecting against SQL injection), `ResultSet`.
  - Connection Pool Internals (HikariCP):
    - Key metrics & tuning: `maximumPoolSize`, `minimumIdle`, `connectionTimeout`, `idleTimeout`, `maxLifetime`, `leakDetectionThreshold`.
    - Connection Pool Exhaustion Debugging: Identifying unclosed connections, thread state blocked on `HikariPool.getConnection()`.

### 2. ORM & Hibernate Core Mechanics
- **Entity Lifecycle States**:
  - Transient: Object instantiated in Java, not associated with Session, no primary key in DB.
  - Persistent (Managed): Object attached to active Session, monitored for Dirty Checking.
  - Detached: Session closed or entity cleared (`session.evict()`); changes not automatically tracked.
  - Removed: Entity scheduled for deletion upon session flush.
- **Mapping & Fetching Strategies**:
  - Relationships: `@OneToOne`, `@OneToMany`, `@ManyToOne`, `@ManyToMany`.
  - Cascade Types: `CascadeType.PERSIST`, `MERGE`, `REMOVE`, `REFRESH`, `DETACH`, `ALL`.
  - Fetch Types: `FetchType.LAZY` (Proxy objects instantiated via ByteBuddy/CGLIB) vs `FetchType.EAGER` (Immediate load). Rule: Default all relationships to `LAZY` to avoid accidental N+1 queries.

### 3. Production ORM Performance Tuning
- **The N+1 Select Problem**:
  - Cause: Fetching 1 parent entity query followed by N individual queries for lazy/eager child associations during collection iteration.
  - Detection: Hibernate SQL logging (`spring.jpa.show-sql=true`), Vlad Mihalcea’s `db-util` query inspector.
  - Resolution Strategies:
    1. JPQL `JOIN FETCH p.children`
    2. JPA `@EntityGraph(attributePaths = {"children"})`
    3. Hibernate Batch Fetching: `@BatchSize(size = 25)` or `hibernate.default_batch_fetch_size=25`.
- **First & Second Level Caching**:
  - First-Level Cache: Session-scoped cache (default, non-configurable).
  - Second-Level Cache: SessionFactory-scoped cache across sessions using providers like Redisson or Ehcache. `@Cacheable`, `@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)`.
- **Dangers of LazyInitializationException**:
  - Occurs when accessing a `LAZY` loaded association outside an active Hibernate session/transaction.
  - Anti-pattern resolution: `enable_lazy_load_no_trans=true` (creates a new database connection for every lazy fetch, blowing out connection pools). Correct fix: Use DTO projections or explicit fetch joins.

---

## Phase 3: Spring Framework & Spring Boot Architecture

### 1. Spring Core Framework & Dependency Injection
- **IoC Container Internals**:
  - `BeanFactory` vs `ApplicationContext` (`AnnotationConfigApplicationContext`, `WebApplicationContext`).
  - Bean Definition Reading, Bean Definition Registry, Metadata compilation.
- **Bean Lifecycle Phases**:
  1. Instantiation (Constructor invocation).
  2. Dependency Population (Setter/Field Injection).
  3. Aware Headers (`BeanNameAware`, `ApplicationContextAware`).
  4. Post-Initialization Pre-Process (`BeanPostProcessor.postProcessBeforeInitialization()`).
  5. Initializing Hooks (`@PostConstruct`, `InitializingBean.afterPropertiesSet()`).
  6. Post-Initialization Post-Process (`BeanPostProcessor.postProcessAfterInitialization()` - Dynamic Proxies created here).
  7. Ready for use.
  8. Destruction (`@PreDestroy`, `DisposableBean.destroy()`).
- **Aspect-Oriented Programming (AOP)**:
  - Concepts: Aspect, Join Point, Pointcut, Advice (`@Before`, `@AfterReturning`, `@AfterThrowing`, `@Around`).
  - Spring AOP Mechanisms: JDK Dynamic Proxies (for interfaces) vs CGLIB Bytecode weaving (for concrete classes).
  - Self-Invocation Pitfall: Calling an `@Transactional` or `@Async` method from within the same class bypasses the Spring proxy, rendering the aspect ineffective.

### 2. Spring Boot Mechanics & External Configuration
- **Auto-Configuration Engine**:
  - `@SpringBootApplication` composite annotation: `@Configuration`, `@EnableAutoConfiguration`, `@ComponentScan`.
  - Condition Evaluations: `@ConditionalOnClass`, `@ConditionalOnMissingBean`, `@ConditionalOnProperty`. Auto-configuration metadata loaded via `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`.
- **Actuator & Production Monitoring**:
  - Endpoints: `/actuator/health`, `/actuator/metrics`, `/actuator/prometheus`, `/actuator/env`, `/actuator/heapdump`, `/actuator/threaddump`.
  - Custom Health Indicators (`HealthIndicator`) and custom Micrometer counters/timers.

### 3. Enterprise Transaction Management
- **Declarative Transactions (`@Transactional`)**:
  - Propagation Behavior:
    - `REQUIRED` (Default: join existing or create new).
    - `REQUIRES_NEW` (Suspend current transaction, open independent new transaction).
    - `MANDATORY` (Must execute within existing transaction, else throw exception).
    - `SUPPORTS`, `NOT_SUPPORTED`, `NEVER`, `NESTED`.
  - Isolation Levels: `READ_UNCOMMITTED`, `READ_COMMITTED`, `REPEATABLE_READ`, `SERIALIZABLE`.
  - Rollback Rules: By default, Spring rolls back **only** for unchecked exceptions (`RuntimeException` and `Error`). Checked exceptions do not trigger rollback unless explicitly specified: `@Transactional(rollbackFor = Exception.class)`.

---

## Phase 4: Enterprise Backend Integration Capabilities

### 1. Security Architecture (JWT, OAuth2, RBAC)
- **Spring Security Filter Chain**:
  - `DelegatingFilterProxy` forwarding requests to `FilterChainProxy` containing ordered `SecurityFilterChain` beans.
  - Key Filters: `SecurityContextPersistenceFilter`, `UsernamePasswordAuthenticationFilter`, `BearerTokenAuthenticationFilter`, `ExceptionTranslationFilter`, `FilterSecurityInterceptor`.
- **JWT (JSON Web Tokens)**:
  - Structure: `Header.Payload.Signature`.
  - Stateless Auth Flow: Client requests `/api/auth/login` -> Server validates credentials -> Issues Signed JWT (HMAC-SHA256 or RSA public/private key) -> Client submits header `Authorization: Bearer <token>` on subsequent requests.
- **OAuth2 / OIDC**:
  - Authorization Code Flow with PKCE (Proof Key for Code Exchange).
  - Roles: Resource Owner, Client, Authorization Server, Resource Server.
- **Role-Based Access Control (RBAC)**:
  - `@PreAuthorize("hasRole('ADMIN')")`, `@PreAuthorize("hasAuthority('SCOPE_read')")`.

### 2. API Design & Large-Scale Processing
- **RESTful API Standards**:
  - Uniform Resource Identifiers, Standard HTTP Status Codes (200, 201, 204, 400, 401, 403, 404, 409, 422, 500, 503).
  - RFC 7807 `ProblemDetail` specification for structured error payloads.
- **Pagination Approaches**:
  - Offset Pagination (`LIMIT 50 OFFSET 1000000`): Degrades linearly $O(N)$ as offset grows because the database must scan and discard rows.
  - Keyset / Cursor Pagination (`WHERE id > last_seen_id ORDER BY id ASC LIMIT 50`): $O(\log N)$ performance utilizing index scans.
- **Streaming & Memory-Safe Processing**:
  - Processing large files without loading into memory: Apache POI `SXSSFWorkbook` (streaming XML for Excel) or OpenCSV streaming iterators.

---

## Phase 5: Distributed Systems, Databases, Caching & Messaging

### 1. Database Performance & Optimization
- **Indexing Internals**:
  - B-Tree Indexes: Balanced search trees optimized for range queries and equality lookups.
  - Covering Indexes: Query satisfied entirely out of index entries without accessing table heap pages.
- **Query Execution Diagnostics**:
  - `EXPLAIN ANALYZE`: Identifying Sequential Scans (Seq Scan), Index Scans, Bitmap Index Scans, Nested Loop Joins, Hash Joins, and High Disk Spills.

### 2. Distributed Caching & Redis
- **Caching Topologies**:
  - Cache-Aside (Lazy Loading): Application queries cache; on miss, queries DB and populates cache.
  - Cache Invalidation Problems: Cache Stampede / Thundering Herd (multiple parallel requests rebuild cache simultaneously on key expiry). Remediation: Mutex locks or probabilistic early expiration (XFetch algorithm).
- **Redis Operations**:
  - Data Structures: Strings, Hashes, Lists, Sets, Sorted Sets (ZSet), HyperLogLogs.
  - Distributed Locking: Redlock algorithm / Redisson `RLock` implementing lease renewal background threads ("watchdog").

### 3. Distributed Messaging (Kafka & RabbitMQ)
- **Apache Kafka**:
  - Fundamental Concepts: Topics, Partitions, Consumer Groups, Offsets, Brokers.
  - Ordering Guarantee: Messages are ordered **only** within a single partition.
  - Consumer Lag & Rebalancing: Occurs when consumers take longer to process records than `max.poll.interval.ms`, causing heartbeat timeouts and rebalance storms.
  - Dead Letter Queue (DLQ): Routing unprocessable records after $N$ retries to a separate topic for manual inspection.
- **RabbitMQ**:
  - Broker topology: Publishers -> Exchanges (Direct, Fanout, Topic, Headers) -> Queues -> Consumers.
  - Flow Control: Prefetch count (`basicQos`) to prevent overwhelming consumers with unacknowledged messages.

---

## Phase 6: Production Diagnostics, DevOps & Server Operations

### 1. Linux CLI Mastery for On-Call Maintenance Engineers
- **System Resource Diagnostics**:
  - `top` / `htop`: Real-time system monitor (CPU load averages, memory usage).
  - `free -h`: Display total, used, free, and cached system memory.
  - `df -h` / `du -sh *`: Disk space utilization and directory disk consumption triage.
  - `vmstat 1`: virtual memory statistics (r: runnable threads, b: blocked threads, bi/bo: block I/O).
  - `iostat -xz 1`: Detailed disk I/O metrics (%util, await, svctm). High `%util` with high `await` indicates I/O bottlenecks.
- **Network & Socket Diagnostics**:
  - `ss -tulpn` or `netstat -tulpn`: Show listening ports and process IDs.
  - `lsof -i :8080`: Identify process using port 8080.
  - `lsof -p <pid> | wc -l`: Count open file descriptors for a specific process (detecting file descriptor leaks).
  - `curl -v -X POST https://internal-api/endpoint -H "Content-Type: application/json" -d '{"key":"val"}'`: Verify HTTP endpoints directly from server.
  - `nc -zv <host> <port>` / `telnet <host> <port>`: Test TCP connection connectivity through firewalls.
- **Log Processing & Text Manipulation**:
  - `tail -100f /var/log/application.log`: Live tailing of application log files.
  - `grep -E "ERROR|Exception" application.log | awk '{print $1, $2, $5}'`: Filtering errors and printing specific columns.
  - `zgrep "OutOfMemoryError" application.log.2026-10-31.gz`: Searching compressed archived logs.
  - `journalctl -u my-service.service -n 200 --no-pager`: Fetching systemd service logs.

### 2. CI/CD & Deployment Strategies
- **Containerization (Docker & Kubernetes)**:
  - Multi-stage Dockerfiles: Separate build environment from lean distroless/alpine runtime images.
  - Non-Root Execution: Executing containers under custom non-privileged user IDs (`USER 10001`).
  - Kubernetes Health Probes:
    - Liveness Probe: Checks if container is running. Failure triggers container restart.
    - Readiness Probe: Checks if application is ready to accept traffic. Failure removes Pod from Service endpoints.
    - Startup Probe: Protects legacy applications with slow startup times.

---

# PART 2: LEETCODE 100+ TOP INTERVIEW QUESTIONS (JAVA MAPPED)

Below is an curated list of 100 essential LeetCode problems categorized by topic, complete with optimal time/space complexity target goals for Java technical rounds.

### Array & Hashing (1-12)
1. **Two Sum** (LC #1) - Easy | Target: $O(N)$ Time, $O(N)$ Space (`HashMap`)
2. **Contains Duplicate** (LC #217) - Easy | Target: $O(N)$ Time, $O(N)$ Space (`HashSet`)
3. **Valid Anagram** (LC #242) - Easy | Target: $O(N)$ Time, $O(1)$ Space (Fixed size array `int[26]`)
4. **Group Anagrams** (LC #49) - Medium | Target: $O(N \cdot K)$ Time, $O(N \cdot K)$ Space (`HashMap<String, List<String>>`)
5. **Top K Frequent Elements** (LC #347) - Medium | Target: $O(N)$ Time via Bucket Sort or $O(N \log K)$ via Min-Heap
6. **Product of Array Except Self** (LC #238) - Medium | Target: $O(N)$ Time, $O(1)$ Auxiliary Space (Prefix & Suffix products)
7. **Valid Sudoku** (LC #36) - Medium | Target: $O(1)$ Time, $O(1)$ Space (`HashSet` encoding)
8. **Encode and Decode Strings** (LC #271) - Medium | Target: $O(N)$ Time, $O(N)$ Space (Length-prefix encoding)
9. **Longest Consecutive Sequence** (LC #128) - Medium | Target: $O(N)$ Time, $O(N)$ Space (`HashSet` boundary lookup)
10. **Subarray Sum Equals K** (LC #560) - Medium | Target: $O(N)$ Time, $O(N)$ Space (Prefix Sum + `HashMap`)
11. **Sort Colors (75 Ball Sort)** (LC #75) - Medium | Target: $O(N)$ Time, $O(1)$ Space (Dutch National Flag algorithm)
12. **Majority Element** (LC #169) - Easy | Target: $O(N)$ Time, $O(1)$ Space (Boyer-Moore Voting Algorithm)

### Two Pointers (13-20)
13. **Valid Palindrome** (LC #125) - Easy | Target: $O(N)$ Time, $O(1)$ Space
14. **Two Sum II - Input Array Is Sorted** (LC #167) - Medium | Target: $O(N)$ Time, $O(1)$ Space
15. **3Sum** (LC #15) - Medium | Target: $O(N^2)$ Time, $O(1)$ Auxiliary Space (Sorting + Two Pointers)
16. **Container With Most Water** (LC #11) - Medium | Target: $O(N)$ Time, $O(1)$ Space
17. **Trapping Rain Water** (LC #42) - Hard | Target: $O(N)$ Time, $O(1)$ Space (Two Pointers / Two Arrays)
18. **Remove Duplicates from Sorted Array** (LC #26) - Easy | Target: $O(N)$ Time, $O(1)$ Space
19. **Move Zeroes** (LC #283) - Easy | Target: $O(N)$ Time, $O(1)$ Space
20. **BackSpace String Compare** (LC #844) - Easy | Target: $O(N)$ Time, $O(1)$ Space

### Sliding Window (21-27)
21. **Best Time to Buy and Sell Stock** (LC #121) - Easy | Target: $O(N)$ Time, $O(1)$ Space
22. **Longest Substring Without Repeating Characters** (LC #3) - Medium | Target: $O(N)$ Time, $O(\min(N, M))$ Space
23. **Longest Repeating Character Replacement** (LC #424) - Medium | Target: $O(N)$ Time, $O(1)$ Space
24. **Permutation in String** (LC #567) - Medium | Target: $O(N)$ Time, $O(1)$ Space (Fixed window size array matching)
25. **Minimum Window Substring** (LC #76) - Hard | Target: $O(N)$ Time, $O(K)$ Space
26. **Sliding Window Maximum** (LC #239) - Hard | Target: $O(N)$ Time, $O(K)$ Space (`ArrayDeque` monotonic queue)
27. **Maximum Average Subarray I** (LC #643) - Easy | Target: $O(N)$ Time, $O(1)$ Space

### Stack (28-34)
28. **Valid Parentheses** (LC #20) - Easy | Target: $O(N)$ Time, $O(N)$ Space (`ArrayDeque<Character>`)
29. **Min Stack** (LC #155) - Medium | Target: $O(1)$ for all stack operations (`getMin`, `push`, `pop`)
30. **Evaluate Reverse Polish Notation** (LC #150) - Medium | Target: $O(N)$ Time, $O(N)$ Space
31. **Generate Parentheses** (LC #22) - Medium | Target: $O(\frac{4^n}{\sqrt{n}})$ Backtracking
32. **Daily Temperatures** (LC #739) - Medium | Target: $O(N)$ Time, $O(N)$ Space (Monotonic Stack)
33. **Car Fleet** (LC #853) - Medium | Target: $O(N \log N)$ Time, $O(N)$ Space
34. **Largest Rectangle in Histogram** (LC #84) - Hard | Target: $O(N)$ Time, $O(N)$ Space (Monotonic Stack)

### Binary Search (35-42)
35. **Binary Search** (LC #704) - Easy | Target: $O(\log N)$ Time, $O(1)$ Space
36. **Search a 2D Matrix** (LC #74) - Medium | Target: $O(\log(M \cdot N))$ Time, $O(1)$ Space
37. **Koko Eating Bananas** (LC #875) - Medium | Target: $O(N \log(\max P))$ Binary Search on Answer
38. **Find Minimum in Rotated Sorted Array** (LC #153) - Medium | Target: $O(\log N)$ Time, $O(1)$ Space
39. **Search in Rotated Sorted Array** (LC #33) - Medium | Target: $O(\log N)$ Time, $O(1)$ Space
40. **Time Based Key-Value Store** (LC #981) - Medium | Target: $O(\log N)$ Get, $O(1)$ Set (`TreeMap` or `ArrayList` binary search)
41. **Median of Two Sorted Arrays** (LC #4) - Hard | Target: $O(\log(\min(M,N)))$ Binary search partition
42. **Find First and Last Position of Element in Sorted Array** (LC #34) - Medium | Target: $O(\log N)$ Time

### Linked List (43-53)
43. **Reverse Linked List** (LC #206) - Easy | Target: $O(N)$ Time, $O(1)$ Iterative Space
44. **Merge Two Sorted Lists** (LC #21) - Easy | Target: $O(N+M)$ Time, $O(1)$ Space
45. **Reorder List** (LC #143) - Medium | Target: $O(N)$ Time, $O(1)$ Space (Find middle, reverse 2nd half, merge)
46. **Remove Nth Node From End of List** (LC #19) - Medium | Target: $O(N)$ Time, $O(1)$ Space (Fast/Slow pointers)
47. **Copy List with Random Pointer** (LC #138) - Medium | Target: $O(N)$ Time, $O(1)$ Auxiliary Space (Interleaving nodes)
48. **Add Two Numbers** (LC #2) - Medium | Target: $O(\max(N,M))$ Time
49. **Linked List Cycle** (LC #141) - Easy | Target: $O(N)$ Time, $O(1)$ Space (Floyd's Tortoise and Hare)
50. **Linked List Cycle II** (LC #142) - Medium | Target: $O(N)$ Time, $O(1)$ Space
51. **Find the Duplicate Number** (LC #287) - Medium | Target: $O(N)$ Time, $O(1)$ Space (Floyd's cycle on array indices)
52. **LRU Cache** (LC #146) - Medium | Target: $O(1)$ Get & Put (`HashMap` + Doubly Linked List)
53. **Merge k Sorted Lists** (LC #23) - Hard | Target: $O(N \log K)$ Time (`PriorityQueue` Min-Heap)

### Trees & Binary Search Trees (54-68)
54. **Invert Binary Tree** (LC #226) - Easy | Target: $O(N)$ Time, $O(H)$ Stack Space
55. **Maximum Depth of Binary Tree** (LC #104) - Easy | Target: $O(N)$ Time
56. **Diameter of Binary Tree** (LC #543) - Easy | Target: $O(N)$ Time
57. **Balanced Binary Tree** (LC #110) - Easy | Target: $O(N)$ Time (Bottom-up DFS)
58. **Same Tree** (LC #100) - Easy | Target: $O(N)$ Time
59. **Subtree of Another Tree** (LC #572) - Easy | Target: $O(N \cdot M)$ Time
60. **Lowest Common Ancestor of a Binary Search Tree** (LC #235) - Medium | Target: $O(H)$ Time
61. **Binary Tree Level Order Traversal** (LC #102) - Medium | Target: $O(N)$ Time (`Queue` BFS)
62. **Binary Tree Right Side View** (LC #199) - Medium | Target: $O(N)$ Time
63. **Count Good Nodes in Binary Tree** (LC #1448) - Medium | Target: $O(N)$ Time
64. **Validate Binary Search Tree** (LC #98) - Medium | Target: $O(N)$ Time (Min/Max range boundary validation)
65. **Kth Smallest Element in a BST** (LC #230) - Medium | Target: $O(H + K)$ Time (In-order traversal)
66. **Construct Binary Tree from Preorder and Inorder Traversal** (LC #105) - Medium | Target: $O(N)$ Time (`HashMap` index lookup)
67. **Binary Tree Maximum Path Sum** (LC #124) - Hard | Target: $O(N)$ Time
68. **Serialize and Deserialize Binary Tree** (LC #297) - Hard | Target: $O(N)$ Time (Pre-order BFS/DFS)

### Tries (69-71)
69. **Implement Trie (Prefix Tree)** (LC #208) - Medium | Target: $O(L)$ Insert/Search where $L$ is word length
70. **Design Add and Search Words Data Structure** (LC #211) - Medium | Target: $O(L)$ Search with DFS wildcards
71. **Word Search II** (LC #212) - Hard | Target: Backtracking with Trie pruning

### Backtracking (72-78)
72. **Subsets** (LC #78) - Medium | Target: $O(N \cdot 2^N)$
73. **Combination Sum** (LC #39) - Medium | Target: $O(2^{\text{target}})$
74. **Permutations** (LC #46) - Medium | Target: $O(N \cdot N!)$
75. **Subsets II** (LC #90) - Medium | Target: $O(N \cdot 2^N)$ (Duplicate handling)
76. **Word Search** (LC #79) - Medium | Target: $O(N \cdot M \cdot 4^L)$ Grid DFS
77. **Palindrome Partitioning** (LC #131) - Medium | Target: $O(N \cdot 2^N)$
78. **N-Queens** (LC #51) - Hard | Target: $O(N!)$ Placement validation

### Graphs (79-89)
79. **Number of Islands** (LC #200) - Medium | Target: $O(M \cdot N)$ Time (DFS/BFS)
80. **Clone Graph** (LC #133) - Medium | Target: $O(V + E)$ Time (`HashMap` node mapping)
81. **Max Area of Island** (LC #695) - Medium | Target: $O(M \cdot N)$ Time
82. **Pacific Atlantic Water Flow** (LC #417) - Medium | Target: $O(M \cdot N)$ Time (Reverse DFS from oceans)
83. **Surrounded Regions** (LC #130) - Medium | Target: $O(M \cdot N)$ Time
84. **Rotting Oranges** (LC #994) - Medium | Target: $O(M \cdot N)$ Time (Multi-source BFS)
85. **Walls and Gates** (LC #286) - Medium | Target: $O(M \cdot N)$ Time (Multi-source BFS)
86. **Course Schedule** (LC #207) - Medium | Target: $O(V + E)$ Time (Topological Sort / Kahn's Algorithm / Cycle DFS)
87. **Course Schedule II** (LC #210) - Medium | Target: $O(V + E)$ Time
88. **Redundant Connection** (LC #684) - Medium | Target: $O(V \cdot \alpha(V))$ (Union-Find / Disjoint Set)
89. **Word Ladder** (LC #127) - Hard | Target: $O(M^2 \cdot N)$ Time (BFS Shortest Path)

### Dynamic Programming (90-97)
90. **Climbing Stairs** (LC #70) - Easy | Target: $O(N)$ Time, $O(1)$ Space
91. **House Robber** (LC #198) - Medium | Target: $O(N)$ Time, $O(1)$ Space
92. **House Robber II** (LC #213) - Medium | Target: $O(N)$ Time, $O(1)$ Space
93. **Longest Palindromic Substring** (LC #5) - Medium | Target: $O(N^2)$ Time, $O(1)$ Space (Expand around center)
94. **Decode Ways** (LC #91) - Medium | Target: $O(N)$ Time, $O(1)$ Space
95. **Coin Change** (LC #322) - Medium | Target: $O(S \cdot N)$ Time (Bottom-up DP)
96. **Longest Increasing Subsequence** (LC #300) - Medium | Target: $O(N \log N)$ Time (Patience Sorting + Binary Search)
97. **Word Break** (LC #139) - Medium | Target: $O(N^3)$ or $O(N^2 \cdot L)$ Time

### Bit Manipulation & Math (98-100)
98. **Single Number** (LC #136) - Easy | Target: $O(N)$ Time, $O(1)$ Space (XOR property $A \oplus A = 0$)
99. **Number of 1 Bits** (LC #191) - Easy | Target: $O(1)$ Time (Brian Kernighan’s Algorithm `n & (n - 1)`)
100. **Reverse Integer** (LC #7) - Medium | Target: $O(\log_{10} N)$ Time (Overflow checking before multiplication)

---

# PART 3: 50+ ENTERPRISE CODE REVIEW ANTI-PATTERNS & REMEDIATION

The following real-world code snippets demonstrate bug-prone or poorly performing enterprise code, along with detailed explanations of the issue and production-ready refactored solutions.

### 1. Spring AOP Self-Invocation Defect
**Problematic Code:**
```java
@Service
public class OrderService {
    public void processOrder(Order order) {
        // Business logic...
        saveAuditLog(order); // Problem: Self-invocation bypasses transactional proxy!
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveAuditLog(Order order) {
        // Audit log persistence expected in new transaction
    }
}
```
**Code Review Explanation**: Calling `@Transactional` or `@Async` methods from within the same class bypasses the Spring AOP proxy wrapper, executing `saveAuditLog` within the caller's existing transaction context without initiating `REQUIRES_NEW`.
**Remediated Code:**
```java
@Service
@RequiredArgsConstructor
public class OrderService {
    private final AuditLogService auditLogService;

    public void processOrder(Order order) {
        // Business logic...
        auditLogService.saveAuditLog(order); // Executed through injected proxy instance
    }
}

@Service
public class AuditLogService {
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveAuditLog(Order order) {
        // Properly suspended caller transaction and created fresh transaction
    }
}
```

---

### 2. Double-Checked Locking Without Volatile
**Problematic Code:**
```java
public class CacheManager {
    private static CacheManager instance;

    public static CacheManager getInstance() {
        if (instance == null) {
            synchronized (CacheManager.class) {
                if (instance == null) {
                    instance = new CacheManager(); // Flawed: Instruction reordering hazard!
                }
            }
        }
        return instance;
    }
}
```
**Code Review Explanation**: `instance = new CacheManager()` involves 3 steps: allocate memory, initialize object, assign reference to `instance`. Without `volatile`, step 3 can be reordered before step 2, causing another thread to observe a non-null but partially initialized object.
**Remediated Code:**
```java
public class CacheManager {
    // volatile guarantees memory barrier preventing instruction reordering
    private static volatile CacheManager instance;

    public static CacheManager getInstance() {
        CacheManager result = instance; // Read volatile variable once into local variable
        if (result == null) {
            synchronized (CacheManager.class) {
                result = instance;
                if (result == null) {
                    instance = result = new CacheManager();
                }
            }
        }
        return result;
    }
}
```

---

### 3. Modifying Collection During Iteration (`ConcurrentModificationException`)
**Problematic Code:**
```java
public void purgeInactiveUsers(List<User> users) {
    for (User user : users) {
        if (!user.isActive()) {
            users.remove(user); // Throws ConcurrentModificationException!
        }
    }
}
```
**Code Review Explanation**: Structural modifications to an ArrayList during active iteration via `for-each` invalidate the iterator's expected `modCount`, raising a `ConcurrentModificationException`.
**Remediated Code:**
```java
public void purgeInactiveUsers(List<User> users) {
    // In-place removeIf utilizing internal collection iterator
    users.removeIf(user -> !user.isActive());
}
```

---

### 4. Swallowing InterruptedException in Concurrency Pipelines
**Problematic Code:**
```java
public class QueueWorker implements Runnable {
    @Override
    public void run() {
        try {
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            System.out.println("Interrupted!"); // Silent interrupt erasure!
        }
    }
}
```
**Code Review Explanation**: Catching `InterruptedException` clears the thread's interrupted status flag. Higher-level thread pool execution frameworks will miss the shutdown signal, leading to orphaned threads.
**Remediated Code:**
```java
@Slf4j
public class QueueWorker implements Runnable {
    @Override
    public void run() {
        try {
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            log.warn("Worker thread interrupted during sleep sequence");
            Thread.currentThread().interrupt(); // Restore interrupted status flag
        }
    }
}
```

---

### 5. Infinite Loop Hazard in Custom `hashCode()` with Mutable Objects
**Problematic Code:**
```java
@Entity
public class Employee {
    private Long id;
    private List<Department> departments = new ArrayList<>();

    @Override
    public int hashCode() {
        return Objects.hash(id, departments); // Catastrophic: Mutating departments breaks HashSet/HashMap lookups!
    }
}
```
**Code Review Explanation**: Including mutable collections inside `hashCode()` calculation alters the hash code if items are added to `departments` after insertion into a `HashSet` or `HashMap`. This leaves the entity lost in the wrong hash bucket, causing memory leaks and lookup failures.
**Remediated Code:**
```java
@Entity
@Getter @Setter
public class Employee {
    @Id
    @GeneratedValue
    private Long id;

    @OneToMany(mappedBy = "employee")
    private List<Department> departments = new ArrayList<>();

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Employee)) return false;
        Employee employee = (Employee) o;
        return id != null && id.equals(employee.getId());
    }

    @Override
    public int hashCode() {
        // Use static class-level hashCode for JPA entities to maintain consistency across lifecycle states
        return getClass().hashCode();
    }
}
```

---

### 6. Unbounded Thread Pool Instantiation (`Executors.newCachedThreadPool`)
**Problematic Code:**
```java
@Configuration
public class AppConfig {
    @Bean
    public Executor taskExecutor() {
        return Executors.newCachedThreadPool(); // Danger: Spawns Integer.MAX_VALUE threads under load!
    }
}
```
**Code Review Explanation**: `Executors.newCachedThreadPool()` utilizes a `SynchronousQueue` with an upper bound of `Integer.MAX_VALUE` threads. High concurrent traffic creates thousands of OS platform threads, triggering `java.lang.OutOfMemoryError: Unable to create new native thread`.
**Remediated Code:**
```java
@Configuration
public class AppConfig {
    @Bean
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);
        executor.setMaxPoolSize(50);
        executor.setQueueCapacity(500); // Bounded queue enforces backpressure
        executor.setThreadNamePrefix("async-exec-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
}
```

---

### 7. Hibernate N+1 Query in Rest Controller
**Problematic Code:**
```java
@GetMapping("/users")
public List<UserDTO> getAllUsers() {
    List<User> users = userRepository.findAll(); // 1 query for Users
    return users.stream()
            .map(u -> new UserDTO(u.getName(), u.getOrders().size())) // N queries for Orders!
            .collect(Collectors.toList());
}
```
**Code Review Explanation**: Accessing lazy `u.getOrders()` inside the stream iteration issues 1 SQL query for every single user row retrieved, causing massive database overhead.
**Remediated Code:**
```java
// UserRepository.java
public interface UserRepository extends JpaRepository<User, Long> {
    @Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.orders")
    List<User> findAllWithOrders();
}

// Controller
@GetMapping("/users")
public List<UserDTO> getAllUsers() {
    List<User> users = userRepository.findAllWithOrders(); // Single join fetch query
    return users.stream()
            .map(u -> new UserDTO(u.getName(), u.getOrders().size()))
            .collect(Collectors.toList());
}
```

---

### 8. Memory Leak via Unclosed File Resources
**Problematic Code:**
```java
public String readLogFile(String path) throws IOException {
    FileInputStream fis = new FileInputStream(path);
    BufferedReader reader = new BufferedReader(new InputStreamReader(fis));
    return reader.readLine(); // Problem: File descriptors remain open on exception!
}
```
**Code Review Explanation**: If reading throws an `IOException`, streams remain open, exhausting OS file descriptors (`Too many open files`).
**Remediated Code:**
```java
public String readLogFile(String path) throws IOException {
    try (BufferedReader reader = Files.newBufferedReader(Paths.get(path))) {
        return reader.readLine();
    } // Auto-closed via AutoCloseable protocol
}
```

---

### 9. Incorrect `@Transactional` Handling for Checked Exceptions
**Problematic Code:**
```java
@Service
public class PaymentService {
    @Transactional
    public void processPayment(PaymentRequest req) throws PaymentException {
        paymentDao.updateBalance(req);
        if (req.isFailed()) {
            throw new PaymentException("Payment declined"); // Transaction does NOT roll back!
        }
    }
}
```
**Code Review Explanation**: Spring declarative transactions roll back only for unchecked exceptions (`RuntimeException` / `Error`). Throwing checked `PaymentException` commits the transaction.
**Remediated Code:**
```java
@Service
public class PaymentService {
    @Transactional(rollbackFor = PaymentException.class)
    public void processPayment(PaymentRequest req) throws PaymentException {
        paymentDao.updateBalance(req);
        if (req.isFailed()) {
            throw new PaymentException("Payment declined"); // Correctly rolls back
        }
    }
}
```

---

### 10. `SimpleDateFormat` Thread Instability Hazard
**Problematic Code:**
```java
@Component
public class DateParser {
    private final SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd"); // Shared mutable state!

    public Date parse(String dateStr) throws ParseException {
        return formatter.parse(dateStr); // Corrupts state under multithreaded calls!
    }
}
```
**Code Review Explanation**: `SimpleDateFormat` is internal state mutable and non-thread-safe. Shared concurrent usage yields corrupted parsing outputs or `NumberFormatException`.
**Remediated Code:**
```java
@Component
public class DateParser {
    // Thread-safe, immutable Java 8+ DateTimeFormatter
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    public LocalDate parse(String dateStr) {
        return LocalDate.parse(dateStr, FORMATTER);
    }
}
```

---

### 11-50 Summary Matrix: Critical Maintenance Code Reviews

Below is a structured analysis of 40 additional code review anti-patterns encountered during production maintenance codebases.

| # | Domain / Component | Anti-Pattern Code Pattern | Severity | Root Cause & Security / System Impact | Modern Standard Remediation |
|---|---|---|---|---|---|
| **11** | Spring Data | `repository.findAll().stream().filter(...)` | Critical | Loads entire database table into JVM memory space; causes heap OOM on large datasets. | Use DB filtering via Spring Data JPA Query methods or Specifications (`WHERE` clause execution). |
| **12** | Logging Framework | `log.info("User: " + user.toString())` | Low | String concatenation allocates Heap memory even when `INFO` log level is disabled. | Use parameterized logging: `log.info("User: {}", user)`. |
| **13** | Core Java | `new String("text")` or String concatenation in loops | Medium | Instantiates redundant Heap objects; defeats String Constant Pool deduplication. | Use String literals directly or `StringBuilder` for loop operations. |
| **14** | REST Integration | Instantiating `new RestTemplate()` inside method calls | High | Destroys connection pool reuse; creates socket starvation (`TIME_WAIT` socket leak). | Declare `RestTemplate` / `WebClient` as a shared singleton Spring Bean with configured pooling. |
| **15** | Security | Storing plain-text password strings in `String` | Critical | `String` values persist indefinitely in the JVM heap string pool until GC occurs. | Store sensitive credentials in `char[]` arrays and clear (`Arrays.fill(pwd, '0')`) after use. |
| **16** | Concurrency | Synchronizing on non-final Object or String literals | High | String lock pooling synchronizes unrelated components globally, causing thread deadlocks. | Lock on `private final Object lock = new Object();` or explicit `ReentrantLock`. |
| **17** | JPA Hibernate | `@OneToMany(fetch = FetchType.EAGER)` | High | Fetches entire downstream entity graph unconditionally, triggering exponential joins and queries. | Retain default `FetchType.LAZY` and use dynamic fetch joins per query requirements. |
| **18** | Security | SQL string concatenation in JDBC (`"SELECT * FROM users WHERE id = " + id`) | Critical | Direct SQL Injection vulnerability exposing database read/write access. | Use parametrized queries with `PreparedStatement` or Spring Data JPA parameters. |
| **19** | Core Java | Catching `java.lang.Throwable` or `java.lang.Error` | High | Catches non-recoverable JVM internal errors (`OutOfMemoryError`, `StackOverflowError`), destabilizing the process. | Catch specific application exceptions or `java.lang.Exception`. |
| **20** | Concurrency | Missing timeout duration on BlockingQueue `poll()` or `Future.get()` | High | Indefinitely hangs worker threads if producers stall or tasks block indefinitely. | Supply explicit timeout parameters: `future.get(5, TimeUnit.SECONDS)`. |
| **21** | Exception Handling | `catch(Exception e) { e.printStackTrace(); }` | Medium | Logs to `System.err`, losing context, trace correlation IDs, and file appender routing. | Log via SLF4J facade: `log.error("Operation failed", e);`. |
| **22** | JPA Hibernate | Long-running transactions around external HTTP calls | Critical | Holds open database connections while waiting for third-party HTTP responses, starving connection pools. | Execute remote HTTP calls *outside* `@Transactional` boundary methods. |
| **23** | Enterprise Java | Using `System.currentTimeMillis()` for execution timing | Low | Susceptible to OS wall-clock adjustments (NTP time shifts), leading to negative duration values. | Measure elapsed execution duration using `System.nanoTime()`. |
| **24** | Redis Caching | Missing TTL configuration on Redis keys (`redisTemplate.opsForValue().set(key, val)`) | High | Fills Redis memory completely over time, causing evicted key loss or OOM crashes. | Supply explicit expiration TTL parameter settings on write calls. |
| **25** | Spring Security | Permitting `/actuator/**` publicly without role restrictions | Critical | Exposes sensitive configuration keys, environment secrets, and thread/heap dump data. | Restrict Actuator endpoints behind robust authentication (`hasRole('ADMIN')`). |
| **26** | CompletableFuture | Using default `CompletableFuture.supplyAsync(supplier)` without Executor | Medium | Uses shared `ForkJoinPool.commonPool()`, which can starve parallel streams across the application. | Pass a dedicated custom `Executor` pool instance as second parameter. |
| **27** | Core Java | Creating `new Random()` instance per random generation call | Medium | Repeated initialization yields weak randomness and high allocation overhead. | Utilize `ThreadLocalRandom.current().nextInt()` for concurrent random generation. |
| **28** | Serialization | Missing `serialVersionUID` on `Serializable` classes | Low | Slight class structural shifts cause deserialization breakage (`InvalidClassException`). | Define `private static final long serialVersionUID = 1L;`. |
| **29** | JPA Hibernate | Updating entities using manual JPQL UPDATE queries inside active sessions | High | Bypasses Hibernate 1st-level cache, resulting in stale in-memory entity states. | Invoke `entityManager.clear()` or add `@Modifying(clearAutomatically = true)`. |
| **30** | Modern Java | Calling `Optional.get()` without `isPresent()` check | Medium | Defeats the safety purpose of `Optional`, throwing `NoSuchElementException`. | Use `optional.orElseThrow(() -> new EntityNotFoundException(...))`. |
| **31** | Jackson JSON | Deserializing polymorphic types without explicit subtype validation | Critical | Enables Remote Code Execution (RCE) via arbitrary class instantiation gadgets. | Restrict type resolution using safe Jackson polymorphic type validation annotations. |
| **32** | Network I/O | Unbounded socket read timeouts (`setSoTimeout(0)`) | High | Infinite socket blockages during network drops freeze thread execution permanently. | Configure realistic timeouts (`setConnectTimeout(3000)`, `setReadTimeout(5000)`). |
| **33** | Kafka Consumer | Long synchronous message processing inside `@KafkaListener` | High | Exceeds `max.poll.interval.ms`, triggering consumer group rebalances continuously. | Offload processing to background async workers or commit offsets manually. |
| **34** | File System | Using relative file paths (`File f = new File("config.xml")`) | Medium | Fails dynamically depending on server working directory launch context. | Use absolute classpath resources: `ClassPathResource` or environment properties. |
| **35** | Concurrency | Modifying non-atomic shared variables inside parallel streams | High | Causes data race conditions and lost updates due to concurrent thread execution. | Use atomic references (`AtomicInteger`) or collect via thread-safe Collectors. |
| **36** | Core Java | Neglecting to close `ExecutorService` on application shutdown | Medium | Keeps JVM process active indefinitely during deployment restarts. | Implement graceful shutdown hooks calling `executor.shutdown()` + `awaitTermination()`. |
| **37** | Spring Boot | Cyclic Bean Dependencies (`ServiceA` depends on `ServiceB` which depends on `ServiceA`) | High | Fails application startup initialization sequence. | Refactor shared functionality into a third service (`ServiceC`) or use setter injection. |
| **38** | Microservices | Missing Circuit Breaker around flaky external HTTP dependencies | Critical | Slow downstream services cause cascading failures by depleting caller thread pools. | Wrap remote integration calls using Resilience4j `@CircuitBreaker`. |
| **39** | Database Access | Fetching heavy LOB/CLOB columns inside simple list queries | High | Exceeds JVM heap limits by streaming megabytes of unused blob binary data. | Map heavy fields to `LAZY` or use lightweight scalar DTO projections. |
| **40** | Unit Testing | Tests depending on execution order (`@TestMethodOrder`) | Medium | Leads to non-deterministic, flaky test suite execution in CI/CD build environments. | Ensure absolute test isolation by resetting state in `@BeforeEach` methods. |
| **41** | Spring MVC | Storing user state inside Controller instance variables | Critical | Controllers are singletons; storing state leaks data across concurrent user requests. | Pass request data via parameters or request/session scoped beans. |
| **42** | Microservices | Using system environment variables directly in logic (`System.getenv("API_KEY")`) | Medium | Hampers testability and dynamic configuration reloads. | Inject properties via Spring `@Value("${api.key}")` or `@ConfigurationProperties`. |
| **43** | JVM Tuning | Setting `-Xms` and `-Xmx` to vastly different values | Medium | Triggers overhead from frequent OS memory re-allocations during traffic spikes. | Set identical minimum and maximum heap allocations (`-Xms4g -Xmx4g`). |
| **44** | Core Java | Array comparison using `.equals()` instead of `Arrays.equals()` | Medium | Array `.equals()` performs reference identity check, failing value comparisons. | Use `Arrays.equals(arr1, arr2)` or `Arrays.deepEquals()` for multi-dimensional arrays. |
| **45** | JPA Hibernate | Modifying entity collections directly inside getter methods | High | Mutates persistent collection tracking, confusing Hibernate dirty checking mechanisms. | Return unmodifiable wrappers: `Collections.unmodifiableList(this.items)`. |
| **46** | Security | Printing raw exception messages containing connection strings in HTTP responses | High | Exposes internal infrastructure topology details to external callers (Information Leak). | Map exceptions cleanly via `@ControllerAdvice` using sanitized standard error representations. |
| **47** | Concurrency | Invoking `Thread.stop()` or `Thread.suspend()` | Critical | Unlocks all monitors instantly, leaving shared objects in corrupted states. | Implement cooperative cancellation flags via `Thread.currentThread().isInterrupted()`. |
| **48** | Database Access | Executing unindexed `COUNT(*)` queries on multi-million row tables | High | Triggers full table scans, spiking CPU load and locking DB pages. | Utilize database metadata stats or dedicated count tracking counters where appropriate. |
| **49** | Core Java | Passing `null` to represent empty collections | Low | Forces callers to add defensive null checks, increasing `NullPointerException` risks. | Return `Collections.emptyList()` or `List.of()` instead of `null`. |
| **50** | Production Diagnostic | Suppressing GC logging output flags on production servers | Medium | Leaves operators blind to GC pause times during performance degradation incidents. | Enable GC logging (`-Xlog:gc*:file=/var/log/gc.log:time,uptime:filecount=5,filesize=20M`). |

---

# PART 4: 30+ REAL-WORLD PRODUCTION MAINTENANCE SCENARIO QUESTIONS

### Scenario 1: CPU Utilization Spikes to 100% on Live Tomcat Server
**Question**: Production monitoring alerts report that a single Java application instance's CPU usage has hit 100%. Requests are timing out. How do you isolate the root cause?
**Detailed Remediation & Triage**:
1. Log into the affected server shell immediately.
2. Identify the target Java process ID: `jps -l` or `ps aux | grep java`. (Assume PID = 14205).
3. Find the specific thread consuming maximum CPU using `top`:
   `top -H -p 14205`
   Note the Thread ID operating at high CPU (e.g., PID 14233). Convert this Thread ID to hexadecimal format: `14233` -> `0x3799`.
4. Generate a thread dump using `jcmd`:
   `jcmd 14205 Thread.print > /tmp/thread_dump.txt`
5. Search for the hex Thread ID within the thread dump file:
   `grep -A 30 "nid=0x3799" /tmp/thread_dump.txt`
6. Analyze the stack trace:
   - If stuck in `java.util.HashMap.get()`, it indicates a legacy non-thread-safe map experiencing infinite looping during concurrent rehash.
   - If stuck in application business logic loops, inspect code conditions for missing loop termination triggers.

---

### Scenario 2: Memory Leak Triage (`java.lang.OutOfMemoryError: Java heap space`)
**Question**: An application crashes every 48 hours with `java.lang.OutOfMemoryError: Java heap space`. Restarting fixes it temporarily. How do you locate the leaking objects?
**Detailed Remediation & Triage**:
1. Ensure the JVM is configured with automatic heap dumping on OOM:
   `-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/var/log/heap_dump.hprof`
2. If the application is currently degrading near full heap capacity prior to crashing, trigger a live dump manually:
   `jcmd <pid> GC.heap_dump /tmp/manual_heap_dump.hprof`
3. Download the `.hprof` file and open it in Eclipse Memory Analyzer Tool (MAT) or JProfiler.
4. Run the **Leak Suspects Report**.
5. Inspect the **Dominator Tree** to identify objects retaining high retained heap sizes.
6. Common culprit patterns:
   - Static `Collection` classes (e.g., in-memory cache maps missing eviction TTLs).
   - Unclosed `ThreadLocal` variables retaining large request contexts on pooled threads.
   - Long-lived event listeners missing unregistration hooks.

---

### Scenario 3: Connection Pool Exhaustion (`HikariPool-1 - Connection is not available`)
**Question**: Application logs show `Exception: HikariPool-1 - Connection is not available, request timed out after 30000ms`. Database CPU is only at 10%. How do you diagnose and fix this?
**Detailed Remediation & Triage**:
1. Cause Verification: Database CPU is low, meaning the DB is not overloaded. The issue lies within application-side connection checkout leaks.
2. Enable HikariCP leak detection logging temporarily:
   `spring.datasource.hikari.leak-detection-threshold=5000` (Logs warning if connection is checked out for $>5\text{ seconds}$).
3. Inspect thread dumps while the application is locked:
   `grep -A 10 "HikariPool.getConnection" /tmp/thread_dump.txt`
4. Typical Maintenance Finding: A method queries the DB, then makes an external synchronous HTTP web service call *while keeping the DB transaction open*. The HTTP call stalls, holding onto the database connection indefinitely and exhausting the pool.
5. Fix: Refactor code to complete remote API integration *prior* to opening database transactions.

---

### Scenario 4: Investigating Transient Database Deadlocks
**Question**: PostgreSQL logs report `ERROR: deadlock detected` during high-throughput order processing. How do you resolve this at the DB and Spring application layers?
**Detailed Remediation & Triage**:
1. Extract deadlock traces from PostgreSQL logs to identify the competing transaction SQL statements and lock resources:
   `LOG: deadlock detected ... Process 2101 waits for ShareLock on transaction 88102; Process 88102 waits for ExclusiveLock on tuple...`
2. Cause Analysis: Transaction A updates Table X then Table Y; concurrently Transaction B updates Table Y then Table X.
3. Remediation Actions:
   - **Enforce Strict Resource Ordering**: Ensure all service transactions acquire locks/updates in identical entity order (e.g., sort IDs prior to executing updates).
   - **Add Retry Logic**: Annotate Spring service methods with Spring Retry:
     `@Retryable(retryFor = {CannotAcquireLockException.class}, maxAttempts = 3, backoff = @Backoff(delay = 100))`

---

### Scenario 5: Microservice Memory Starvation in Kubernetes (OOMKilled)
**Question**: A Spring Boot Pod in Kubernetes is repeatedly killed with status `OOMKilled` (exit code 137). However, no `java.lang.OutOfMemoryError` appears in application logs. Why?
**Detailed Remediation & Triage**:
1. Cause Identification: `OOMKilled` (Exit Code 137) means the Linux Kernel OS killer terminated the container process because total container native memory exceeded Kubernetes `resources.limits.memory`. JVM Heap was fine, but off-heap/native memory overflowed container bounds.
2. Root Causes:
   - Misconfigured `-Xmx`: JVM Heap was assigned 2GB, but container limit was set to 2GB. Non-heap memory (Metaspace, thread stacks, Direct ByteBuffers, C-runtime allocations) pushed total memory usage over 2GB.
3. Fix Strategy:
   - Align memory container limits correctly: Set `-Xmx` to 70-75% of total container resource limit.
   - Container setting: `resources.limits.memory: 4Gi`
   - JVM Flags setting: `-Xms3g -Xmx3g -XX:MaxMetaspaceSize=512m`

---

### Scenario 6: Debugging Unintended Cache Stampede / Thundering Herd
**Question**: When a high-traffic Redis cache key expires (e.g., homepage configuration), database CPU spikes to 100% instantly for 5 seconds. How do you prevent this?
**Detailed Remediation & Triage**:
1. Cause: Thousands of concurrent requests receive a cache miss simultaneously when the key expires, all executing the underlying heavy DB query in parallel.
2. Fix Options:
   - **Mutex Locking (Redisson)**: Acquire a distributed lock on cache miss; only the lock winner queries the DB and populates Redis, while others wait/retry.
   - **Soft Expiry / Background Refresh**: Store payload with an embedded logical timestamp field. When close to expiry, a background thread asynchronously refreshes the cache while serving slightly stale data to incoming requests.

---

### Scenario 7: Thread Contention & Lock Bottlenecks
**Question**: High traffic performance degrades drastically. Thread dumps show 150 threads in `BLOCKED` state waiting on `0x000000076c112288`. How do you resolve this?
**Detailed Remediation & Triage**:
1. Inspect thread dump details:
   ```text
   "http-nio-8080-exec-45" #112 daemon prio=5 os_prio=0 tid=0x00007f WAITING
   java.lang.Thread.State: BLOCKED (on object monitor)
   at com.legacy.service.SecurityTokenGenerator.generateToken(SecurityTokenGenerator.java:42)
   - waiting to lock <0x000000076c112288> (a java.lang.Class for com.legacy.service.SecurityTokenGenerator)
   ```
2. Identify lock holder thread: Search dump for `locked <0x000000076c112288>`.
3. Root Cause: Method `generateToken()` uses `synchronized static`, forcing all HTTP request threads to pass through a single bottleneck.
4. Remediation: Replace class-level synchronized block with non-blocking concurrency constructs (`ThreadLocalRandom`, `java.util.concurrent.atomic`, or fine-grained locks).

---

### Scenario 8: Kafka Consumer Group Rebalance Storms
**Question**: A Spring Kafka service continuously leaves and rejoins its consumer group, resulting in stalled message consumption. Logs report `CommitFailedException`.
**Detailed Remediation & Triage**:
1. Cause: The consumer takes longer to process a batch of records than configured in `max.poll.interval.ms`. Kafka broker assumes the consumer is dead, revokes its partitions, and triggers a consumer group rebalance.
2. Fix Strategy:
   - Increase processing capacity by processing messages asynchronously using a worker thread pool.
   - Reduce batch intake size: `max.poll.records=50` (down from default 500).
   - Increase processing timeout threshold: `max.poll.interval.ms=600000` (10 minutes).

---

### Scenario 9: Cascading Failure Due to Downstream Service Outage
**Question**: External payment gateway latency spikes from 200ms to 30 seconds. As a result, your primary e-commerce backend stops responding to all user requests. How do you decouple the failure?
**Detailed Remediation & Triage**:
1. Root Cause: Request threads calling the slow payment API block for 30s, exhausting Tomcat’s thread pool (`max-threads=200`), starving unrelated endpoints like `/catalog` or `/health`.
2. Remediation Strategy:
   - Wrap remote REST calls inside Resilience4j `@CircuitBreaker` and `@TimeLimiter`.
   - Configure call timeouts aggressively (`readTimeout = 3000ms`).
   - Define fallback behavior returning a degraded response or queuing requests for async execution.

---

### Scenario 10: Silent Transaction Rollbacks (`UnexpectedRollbackException`)
**Question**: Service execution throws `org.springframework.transaction.UnexpectedRollbackException: Transaction rolled back because it has been marked as rollback-only`. Why did this happen?
**Detailed Remediation & Triage**:
1. Cause: Method A (`@Transactional`) calls Method B (`@Transactional`). Method B throws a `RuntimeException`, catching it internally in a try-catch block in Method A.
2. Mechanics: Even though Method A caught the exception, Method B's transaction aspect marked the global physical transaction as `rollback-only`. When Method A attempts to commit, the transaction manager enforces a rollback and throws `UnexpectedRollbackException`.
3. Fix: If Method B's failure should be recoverable without aborting the parent transaction, declare Method B with `@Transactional(propagation = Propagation.REQUIRES_NEW)`.

---

### Scenarios 11-30: Diagnostic & Maintenance Quick-Reference Matrix

| # | Operational Incident / Symptom | Root Cause Diagnostics | Immediate Production Remediation Strategy |
|---|---|---|---|
| **11** | `java.lang.OutOfMemoryError: Metaspace` | Dynamic proxy generation leak or ClassLoader failure. | Increase `-XX:MaxMetaspaceSize`; profile ClassLoaders via MAT to locate un-garbage-collected dynamic classes. |
| **12** | Log disk space at 100% capacity (`No space left on device`). | Logback/Log4j rotation failed or application writing uncontrolled error loops. | Execute `truncate -s 0 application.log`; configure `logrotate` / max history file caps. |
| **13** | Latency spikes occurring precisely every 5 minutes. | Full Garbage Collection STW pauses executing via Parallel/G1 GC. | Switch to low-latency GC (`ZGC` or `Shenandoah`); tune `-XX:MaxGCPauseMillis=20`. |
| **14** | `java.lang.StackOverflowError` thrown on specific API call. | Infinite recursion loop in entity tree serialization or deep graph navigation. | Add missing base case termination; break circular JSON serialization using `@JsonIgnore`. |
| **15** | Redis `OOM command not allowed when used memory > 'maxmemory'` | Missing Redis key eviction policy or unbounded keys without TTLs. | Set Redis `maxmemory-policy volatile-lru` or `allkeys-lru`; audit keys missing TTL settings. |
| **16** | DB queries hang indefinitely after network drops between App and DB. | JDBC driver missing socket read timeout settings. | Set connection property string: `socketTimeout=10000` & `connectTimeout=3000`. |
| **17** | `Servlet.service() for servlet thrown exception: OutOfMemoryError: Direct buffer memory` | Netty/NIO allocating memory via `ByteBuffer.allocateDirect` without clearing memory. | Tune JVM flag `-XX:MaxDirectMemorySize=512m`; audit unreleased byte buffers. |
| **18** | High disk read I/O wait (`%util > 95%` on `iostat`). | Database executing full table scans due to missing or invalidated indexes. | Run `EXPLAIN ANALYZE` on active slow queries; create targeted B-Tree indexes. |
| **19** | Spring Boot application context startup takes $>3\text{ minutes}$. | Heavy component scanning over massive classpath or synchronous initialization in `@PostConstruct`. | Narrow scan base packages; offload heavy setup logic to asynchronous background initializers. |
| **20** | Socket descriptor leak (`java.net.SocketException: Too many open files`). | Unclosed HTTP clients or unreleased streaming connection resources. | Check open descriptors via `lsof -p <pid>`; ensure clients are wrapped in try-with-resources. |
| **21** | HTTP 500 error returned due to `LazyInitializationException` during JSON serialization. | Jackson accessing lazy entity properties outside active database transaction session. | Use DTO projections to map required fields within service boundary before returning. |
| **22** | CPU starvation caused by continuous ForkJoinPool thread creation. | Utilizing `parallelStream()` inside heavy concurrent request handlers. | Replace parallel streams with standard sequential loops or dedicated ThreadPoolExecutors. |
| **23** | Scheduled tasks (`@Scheduled`) stop executing silently after one failure. | Unhandled `RuntimeException` leaked out of scheduled task method without try-catch protection. | Wrap execution body inside top-level `try-catch(Throwable t)` block inside scheduled method. |
| **24** | Stale cache reads after database updates. | Cache eviction missing on `@Transactional` failure or non-atomic cache write. | Execute cache evictions using `@CacheEvict(afterCommit = true)` hooks. |
| **25** | TLS/SSL Handshake failure (`javax.net.ssl.SSLHandshakeException: PKIX path building failed`) | Server missing self-signed or internal CA certificate in JVM truststore. | Import certificate using keytool: `keytool -importcert -keystore $JAVA_HOME/lib/security/cacerts`. |
| **26** | Database queries returning duplicate entity rows in child collections. | Performing `JOIN FETCH` across multiple `@OneToMany` collection associations simultaneously. | Use `Set` instead of `List` for child collections or execute separate query fetch passes. |
| **27** | High memory usage by `ThreadLocal` variables in Tomcat environment. | ThreadLocal variables not removed before returning pooled thread to pool. | Enforce cleanup in `finally` blocks using `threadLocal.remove()`. |
| **28** | App server responsive, but health check `/actuator/health` returns HTTP 503. | Custom `HealthIndicator` dependency (e.g., database or queue) failing or timing out. | Configure health indicator timeouts so dependencies do not block health endpoints. |
| **29** | Microservice instance IP changes cause connection failures. | JVM caching DNS lookups indefinitely (`networkaddress.cache.ttl = -1`). | Configure JVM DNS TTL setting in `security.properties` (`networkaddress.cache.ttl=30`). |
| **30** | Asynchronous operations (`@Async`) failing silently without logging. | Async methods returning `void` suppress exceptions raised on background threads. | Return `CompletableFuture<T>` from `@Async` methods or implement custom `AsyncUncaughtExceptionHandler`. |