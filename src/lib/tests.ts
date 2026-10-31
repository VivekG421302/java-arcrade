// Phase tests: 4 MCQ + 1 code question each (so 4/5 = 80% passes). Drawn from each phase's content.
export type TestQ =
  | { type: 'mcq'; q: string; opts: string[]; answer: number; why: string }
  | { type: 'code'; q: string; code: string; lang: string; accept: string[]; why: string }

const mcq = (q: string, opts: string[], answer: number, why: string): TestQ => ({ type: 'mcq', q, opts, answer, why })

export const TESTS: Record<number, TestQ[]> = {
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
