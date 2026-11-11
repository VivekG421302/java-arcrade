# Java Developer Comprehensive Mastery Roadmap & Production Question Bank
## Enterprise Maintenance, Maintenance Engineering & Systems Diagnostic Focus

---

# PART 1: COMPREHENSIVE ROADMAP & SKILL MATRIX

## Phase 1: The Story of Java (for everyone)

### Prologue – The whole story on one map

Every technology in this guide exists because something hurt. Java’s story is a chain of pains and fixes: each chapter below begins with a problem people had, then shows the fix, and then what the fix cost, which becomes the next chapter’s problem.

> **Imagine:** A relay race: each runner (Java version) carries the baton a little further and hands it on.

```diagram
{"n":"A:1991 Oak:0:0|B:1995 Java 1.0:1:0|C:1998 Web and J2EE:2:0|D:2004 Java 5 and Spring:3:0|E:2014 Java 8:3:1|F:2017 Six-month releases:2:1|G:2021 Java 17:1:1|H:!2023 Java 21:0:1","e":"A>B:the internet arrives|B>C:websites need servers|C>D:too heavy, simplify|D>E:many-core CPUs|E>F:keep pace|F>G:less boilerplate|G>H:handle huge traffic"}
```

1. **1991** – a language for gadgets is born.
2. **1995** – the internet makes it famous.
3. **1998** – it becomes the language of company servers.
4. **2004** – heavy tools are replaced by lighter ones.
5. **2014** – a big modernisation for modern CPUs.
6. **2017** – new versions arrive every six months.
7. **2023** – threads become cheap, so servers handle far more users.

### Chapter 1 – 1991: The gadget problem

**The problem:** A small Sun Microsystems team wanted to program smart TVs and gadgets. Every device had a different chip, and a program for one chip would not run on another, so it had to be rewritten each time. **The fix:** a new language (first called Oak) that is not built for one chip. It becomes a neutral code (bytecode) which a small translator on each device, the JVM, understands. **The twist:** smart TVs flopped, but the internet exploded, and ‘one program, any machine’ was exactly what the internet needed.

> **Imagine:** Instead of writing a new book for every country, you write one book and each country hires its own interpreter.

```diagram
{"n":"A:Program for chip A:0:0|B:Rewrite for chip B:1:0|C:Rewrite for chip C:2:0|J:Write once:0:1|V:JVM on each device:1:1|R:!Runs anywhere:2:1","e":"A>B:rewrite|B>C:rewrite|J>V:bytecode|V>R"}
```

1. **Before** – every new device meant rewriting the program.
2. **After** – one program is translated by a JVM that exists on every device.
3. **Result** – the famous promise: write once, run anywhere.

### Chapter 2 – 1995: Java goes public

**The problem:** Early websites were just still pages, and running a stranger’s program on your computer was dangerous. Languages like C also crashed often because programmers had to free memory by hand. **The fix:** Java 1.0 ran small programs (applets) inside a protected box (sandbox) and cleaned memory automatically (garbage collection). **What happened next:** applets faded because browser plug-ins were insecure and JavaScript took over, but the safe, automatic design was exactly what companies wanted for servers.

> **Imagine:** A child playing in a fenced garden with a cleaner who tidies the toys. Safe, and no mess to manage.

### Chapter 3 – 1996 to 2000: Java moves to the server

**The problem:** Websites had to become alive: read a database, remember who you are. The old way started a new program for every visitor, which was slow. **The fixes:** Servlets (one program serving many visitors at once), JDBC (one standard way to talk to any database), JSP (pages with blanks filled by Java) and J2EE (a rulebook for big company systems). **The cost:** J2EE’s EJB parts were heavy, full of paperwork and hard to test. That pain starts the next chapter.

> **Imagine:** A new cashier for every single customer (old way) versus one cashier with a queue (servlet).

### Chapter 4 – 2002 to 2006: The rebellion

**The problem:** Building with EJB felt like filling in forms in triplicate. Saving an object also meant writing endless SQL by hand. **The fixes:** Spring (ordinary objects, with a container that creates and connects them, called dependency injection) and Hibernate (describe how an object maps to a table and it writes the SQL). **Why it mattered:** they were so successful that the official standard copied them: JPA in 2006.

> **Imagine:** Instead of every cook buying their own knives, the manager hands each cook the tools they need.

### Chapter 5 – 2004: Java 5 helps catch mistakes early

**The problem:** A list could hold anything, so putting a word where a number belonged only crashed later, in front of real users. Configuration also lived in huge XML files far from the code. **The fixes:** generics (the list says what it holds, and mistakes are caught before running) and annotations (small tags written next to the code). **Why it mattered:** annotations let Spring drop most XML, which led to Spring Boot.

> **Imagine:** A labelled shelf: ‘Apples only’ stops someone placing a shoe there.

### Chapter 6 – 2014: Java 8 and the many-core CPU

**The problem:** Computers stopped getting faster and instead got more cores. Java code for handling lists of data was long and clumsy, and the old Date class was error-prone. **The fixes:** lambdas (tiny inline instructions), streams (a conveyor belt of steps), Optional (a safer ‘maybe nothing’) and java.time (reliable dates). **Same year:** Spring Boot removed the painful project setup.

> **Imagine:** A factory belt: each machine does one small job, and the belt can be split across many workers.

```diagram
{"n":"D:List of orders:0:0|F:filter paid:1:0|M:map to amount:2:0|C:!sum:3:0","e":"D>F:start|F>M:keep matches|M>C:transform"}
```

1. **Source** – the data you begin with.
2. **filter** – keep only what matches.
3. **map** – transform each item.
4. **Terminal step** – nothing runs until this is reached, and the work can be spread over several cores.

### Chapter 7 – 2017 onwards: A new release every six months

**The problem:** Java 9 arrived more than three years after Java 8, and rivals were moving faster. Memory cleaning also caused long freezes. **The fixes:** a new version every six months, with an LTS (long-term support) version every few years (11, 17, 21) for companies that want stability. Free OpenJDK builds ended licence worries. Small features cut boilerplate: var (10), text blocks (15), records (16), sealed types (17). The cleaner improved from Serial to G1 to ZGC, which pauses for a tiny fraction of a second.

> **Imagine:** A bus on a timetable every six months, versus waiting years for a special train.

### Chapter 8 – 2022 to 2023: Jakarta and virtual threads

**Name change:** Oracle gave Java EE to the Eclipse Foundation but kept the ‘javax’ name, so packages became ‘jakarta’. Spring Boot 3 and Hibernate 6 followed. **The problem:** every user request needed one costly operating-system thread, mostly sitting idle while waiting for the database, so thousands of users meant thousands of heavy threads. Async code solved this but was hard to read. **The fix:** Java 21 virtual threads are so light that you can have millions, and you write plain simple code.

> **Imagine:** A hotel where every guest needs a full-time butler versus a few butlers who serve guests only when they ring.

```diagram
{"n":"R:10,000 requests:0:0|P:Old: one OS thread each:1:0|W:Mostly waiting on DB:2:0|V:New: virtual threads:1:1|CT:!A few OS threads carry all:2:1","e":"R>P:heavy|P>W:thread sits idle|R>V:light|V>CT:parked while waiting"}
```

1. **Old** – one expensive thread per request, mostly waiting.
2. Waiting wastes memory and limits how many users fit.
3. **New** – a virtual thread costs very little.
4. When it waits, the real thread is freed to serve someone else.

## Phase 2: Java Version by Version (8 to 27)

### Overview – Which versions matter and why

Java ships every March and September. Only some are LTS (long-term support): companies stay on those and skip the rest. The rest are six-month previews of the future. Read the cards below from Java 8 up to the newest to follow the story of what changed and why. Feature status can change as previews become final, so check the official release notes for the exact version you use.

> **Imagine:** Like phone updates: a few big stable releases that people keep for years, and monthly ones that early adopters try.

```diagram
{"n":"A:Java 8:0:0|B:Java 11:1:0|C:Java 17:2:0|D:Java 21:3:0|E:!Java 25 (newest LTS):3:1|F:Java 27 (latest):2:1","e":"A>B:modules, HttpClient|B>C:records, sealed|C>D:virtual threads|D>E:compact files, lighter objects|E>F:six-month steps"}
```

1. **8** – lambdas and streams made modern Java possible.
2. **11** – the stable step after the faster release rhythm began.
3. **17** – the baseline for Spring Boot 3.
4. **21** – virtual threads and pattern matching.
5. **25** – the current long-term release.
6. **27** – the latest short-term release, shown for orientation.

#### Detailed explanation

The long-term releases and what each added for everyday work.

| Version | Released | Headline |
| --- | --- | --- |
| **Java 8** | 2014 | lambdas, streams, java.time |
| **Java 11** | 2018 | HttpClient, modules removed from EE, run single file |
| **Java 17** | 2021 | records, sealed classes, text blocks |
| **Java 21** | 2023 | virtual threads, pattern matching, sequenced collections |
| **Java 25** | 2025 | compact source files, compact object headers, scoped values |

### Java 8 – March 2014 (LTS)

**Why:** CPUs gained cores instead of speed, and Java code for working with data was long and clumsy. **New:** lambdas, streams, Optional, default methods in interfaces, the java.time date API and CompletableFuture for async work. **Why it matters:** this release changed how Java is written, and millions of systems are still on it.

> **Imagine:** A factory belt of small steps that can be shared across many workers.

### Java 9 – September 2017

**Why:** the JDK itself was one giant bundle, so even a tiny app carried all of it. **New:** the module system (JPMS), jshell for trying code instantly, List.of / Map.of for quick collections, and G1 as the default memory cleaner. **Also:** after this, releases move to a six-month rhythm.

### Java 10 – March 2018

**Why:** too much repeated typing, and containers (Docker) confused the JVM about how much memory it had. **New:** var (the compiler works out the type of a local variable) and the JVM now respects container memory and CPU limits.

### Java 11 – September 2018 (LTS)

**Why:** the first long-term release after the new rhythm, so companies could move from 8 with a stable target. **New:** the standard HttpClient, handy String methods (isBlank, lines, repeat), running a single file with java Hello.java, and TLS 1.3. **Removed:** the old Java EE and CORBA modules, which is why javax code needed extra libraries.

### Java 12 – March 2019

**New:** switch expressions (preview), the Shenandoah low-pause cleaner (experimental) and compact number formatting. **Why:** the old switch was error-prone because forgetting a break caused silent bugs.

### Java 13 – September 2019

**New:** text blocks (preview) for multi-line text such as JSON or SQL, yield in switch expressions, and ZGC now returns unused memory to the system. **Why:** writing JSON in code meant a mess of quotes and plus signs.

### Java 14 – March 2020

**New:** switch expressions become final, records and pattern matching for instanceof arrive as previews, and helpful NullPointerException messages say exactly which variable was null. **Why:** to cut boilerplate and make crashes easy to diagnose.

### Java 15 – September 2020

**New:** text blocks become final, sealed classes (preview) let you list exactly which classes may extend another, and ZGC and Shenandoah become production-ready. **Why:** developers wanted tidy text and control over inheritance.

### Java 16 – March 2021

**New:** records are final (a data class in one line), pattern matching for instanceof is final, Stream.toList(), and Unix domain sockets. **Also:** OpenJDK moved to Git and GitHub. **Why:** a record replaces dozens of lines of getters, equals and hashCode.

### Java 17 – September 2021 (LTS)

**New:** sealed classes are final, pattern matching for switch (preview), a new random-number API, and strong encapsulation of JDK internals. **Deprecated:** the Applet API and the Security Manager. **Why it matters:** this is the baseline for Spring Boot 3 and Hibernate 6, so it is the common upgrade from 8 or 11.

### Java 18 – March 2022

**New:** UTF-8 becomes the default text encoding everywhere, jwebserver (a one-command test web server) and code snippets in Javadoc. **Why:** the old default encoding made the same program behave differently on Windows and Linux.

### Java 19 – September 2022

**New:** virtual threads (preview), structured concurrency (incubator) and record patterns (preview). **Why:** the first public look at the fix for servers that need huge numbers of simultaneous users.

### Java 20 – March 2023

**New:** scoped values (incubator) to share data safely with virtual threads, plus second previews of virtual threads and record patterns. **Why:** feedback rounds before the next LTS.

### Java 21 – September 2023 (LTS)

**New:** virtual threads are final, pattern matching for switch and record patterns are final, sequenced collections (getFirst, getLast, reversed) and generational ZGC. **Why it matters:** cheap threads let simple blocking code handle huge traffic, and the language can now take data apart in a single expression.

> **Imagine:** A hotel with a few butlers serving thousands of guests, each only when called.

### Java 22 – March 2024

**New:** unnamed variables (_) for values you ignore, the Foreign Function and Memory API (safe calls to native code, replacing risky JNI), running multi-file programs directly, and Stream Gatherers (preview). **Why:** less clutter and safer links to C libraries.

### Java 23 – September 2024

**New:** Markdown in Javadoc comments, generational ZGC becomes the default mode, and module imports and primitive patterns (previews). **Dropped:** string templates were withdrawn to be redesigned. **Why:** shorter imports, and lessons from feedback.

### Java 24 – March 2025

**New:** Stream Gatherers final (custom steps in a stream), the Class-File API final, virtual threads no longer get stuck when using synchronized, ahead-of-time class loading for faster startup, post-quantum cryptography (ML-KEM, ML-DSA), and the Security Manager permanently disabled. **Why:** faster start, safer encryption for the future, and fewer virtual-thread surprises.

### Java 25 – September 2025 (LTS)

**New:** compact source files and instance main methods are final (a first program no longer needs the public static void main ceremony), flexible constructor bodies (code before super()), module import declarations, scoped values, compact object headers (smaller objects, less memory), and generational Shenandoah are all final or production-ready. **Why it matters:** the newest LTS: friendlier for beginners, lighter on memory, and the current target for new production systems.

> **Imagine:** Learning to drive without first being asked to explain the engine.

### Java 26 – March 2026

**New:** HTTP/3 in the HttpClient (it runs over QUIC and UDP for lower latency), ahead-of-time object caching with any garbage collector, faster G1, and warnings when code changes a final field via reflection (Prepare to Make Final Mean Final). **Removed:** the Applet API, finally gone after being deprecated in 17. **Still previewing:** structured concurrency, lazy constants and primitive types in patterns.

### Java 27 – September 2026

**New:** G1 becomes the default garbage collector in all environments, post-quantum hybrid key exchange for TLS 1.3 (protection against future quantum computers), and Lazy Constants in a third preview. It is a short-term release with about six months of support. **Why:** one predictable default cleaner everywhere, and encryption ready for the future.

## Phase 3: The Story of Backend Ideas (for everyone)

### Story – How a website learned who you are (sessions to JWT)

**The problem:** The web forgets you after every click, so early sites made you log in each time. **Fix 1:** sessions. The server remembers you and gives your browser a number on a cookie. **New problem:** a busy site has many servers, and they do not share memory, so a visit to server B can forget the login on server A. **Fix 2:** JWT, a signed pass that carries your identity inside it, so any server can check it without asking anyone. **Its cost:** a stolen pass is hard to cancel, so passes expire fast and a refresh token gets new ones.

> **Imagine:** A cloakroom ticket (session) needs the cloakroom to look it up. A festival wristband (JWT) is checked on sight by anyone.

```diagram
{"n":"A:Password on every click:0:0|B:Session cookie:1:0|C:JWT token:2:0|D:!Short JWT + refresh token:3:0","e":"A>B:annoying, risky|B>C:many servers|C>D:hard to revoke"}
```

1. **Passwords each time** – tiring and risky.
2. **Session** – the server keeps your login in its memory.
3. **JWT** – no server memory needed, scales easily.
4. **Short expiry plus refresh** – limits the damage of a stolen token.

### Story – OAuth: Letting an app in without your password

**The problem:** In the late 2000s apps asked for your Gmail password to import contacts. They then had total power over your account and could never be safely trusted. **The fix:** OAuth. You approve on Google’s own page, and the app receives a limited key that works only for what you allowed and can be cancelled. OpenID Connect adds a simple ‘who is this person’ answer, which is what ‘Sign in with Google’ uses.

> **Imagine:** A valet key: it starts the car and parks it, but opens neither the boot nor the glove box.

```sequence
{"p":"U:You|A:The app|G:Google login|R:Google contacts","m":"U>A:Import my contacts|A>G:redirect: needs permission|U>G:log in and approve|G>A:~short-lived code|A>G:swap code for token|G>A:~access token|A>R:ask for contacts + token|R>A:~contacts only"}
```

1. You ask the app to do something.
2. The app sends you to Google. It never sees your password.
3. You sign in on Google and approve exactly what is asked.
4. Google returns a one-time code through your browser.
5. The app swaps the code for a token, privately.
6. The token is a limited key.
7. The app presents the key to the contacts service.
8. It gets contacts only, nothing else.

### Story – Caching: Do not answer the same question twice

**The problem:** Thousands of people ask for the same product page, and each time the database repeats the same slow work. **The fix:** keep a ready-made copy nearby (a cache such as Redis or Caffeine). Ask the cache first; on a miss, read the database and save the answer. **The catch:** the copy can go stale, so each entry gets an expiry time or is deleted when the original changes. As programmers joke, naming things and invalidating caches are the two hard problems.

> **Imagine:** A teacher keeping a note of the answer to the question every student asks, instead of looking it up in the big book each time.

```diagram
{"n":"R:Request:0:0|C:Cache:1:0|H:!Fast answer:2:0|D:Database:1:1|S:Save copy + expiry:0:1","e":"R>C:ask first|C>H:hit|C>D:miss|D>S:read|S>C:store"}
```

1. Every request asks the cache first.
2. **Hit** – the answer returns in microseconds.
3. **Miss** – go to the slow database.
4. Save the result with an expiry time.
5. **Stale data** – the price of speed; delete or expire entries when the data changes.

### Story – Pagination: Never hand over the whole library

**The problem:** A shop with a million orders cannot send them all at once. The phone would freeze and the server would run out of memory. **Fix 1:** pages (‘give me page 5’). **New problem:** the database still counts past all earlier rows, so very deep pages get slow, and if new rows arrive meanwhile the pages shift and show repeats. **Fix 2:** a cursor, or bookmark. ‘Give me the 20 after this one’ jumps straight there and stays stable.

> **Imagine:** Reading a long book: page numbers are fine at first, but a bookmark is quicker and never loses your place.

```diagram
{"n":"A:Send everything:0:0|B:Offset pages:1:0|C:!Cursor / keyset:2:0","e":"A>B:too big|B>C:slow and shifting"}
```

1. **Send everything** – crashes with large data.
2. **Offset pages** – simple, but slower the deeper you go.
3. **Cursor** – fast and stable, but you cannot jump to page 50.

#### Detailed explanation

Offset pages make the database read and throw away every earlier row. A cursor uses an index to jump straight to the next rows.

```sql
SELECT * FROM orders ORDER BY id LIMIT 20 OFFSET 100000; -- reads 100,020 rows
SELECT * FROM orders WHERE id > 100020 ORDER BY id LIMIT 20; -- jumps via the index
```

| Style | Good for | Weakness |
| --- | --- | --- |
| **Offset** | small data, jump to page N | slow when deep, rows can repeat |
| **Cursor** | feeds, large data | no random page jump |

### Story – Architectures: How software was organised over time

**Monolith:** one big program that does everything. Easy at first, but one small change means redeploying all of it. **SOA (2000s):** split into services joined by a central switchboard, which became a heavy bottleneck. **Microservices (2010s):** small independent services owned by small teams, as at Amazon and Netflix. Teams move quickly, but calls over a network fail and debugging gets harder. **Event-driven:** services announce what happened (Kafka) rather than calling each other. **Serverless:** you supply a function and the cloud runs it. **Today:** many teams return to a well-organised monolith (modular) until size really demands splitting.

> **Imagine:** One giant restaurant kitchen, then separate food stalls. The stalls are faster, but now they need a way to coordinate.

```diagram
{"n":"M:Monolith:0:0|S:SOA + central bus:1:0|MS:Microservices:2:0|E:Event-driven:2:1|SL:Serverless:1:1|MM:!Modular monolith:0:1","e":"M>S:too big to change|S>MS:bus is a bottleneck|MS>E:chatty calls fail together|E>SL:stop running servers|SL>MM:too complex"}
```

1. **Monolith** – simple but hard to change at scale.
2. **SOA** – separate services, one heavy switchboard.
3. **Microservices** – independent teams and deployments.
4. **Event-driven** – loose coupling, harder to follow the flow.
5. **Serverless** – no servers to manage, but vendor lock-in.
6. **Modular monolith** – the sensible middle for most teams.

### Timeline: tools and the problems they solved

Each tool appeared because the one before it hurt.

| Year | Technology | Problem solved |
| --- | --- | --- |
| 1995 | Java 1.0 | Write once, run anywhere: one program for many machines. |
| 1996–97 | PostgreSQL, Servlets, JDBC | Open database; web pages without a new process per request; one API for all databases. |
| 1999 | JSP, J2EE, Tomcat | Templates and enterprise standards, but EJB was heavy. |
| 2001 | Hibernate | Stopped hand-writing endless SQL for object saving. |
| 2002–04 | Spring, Java 5 | Lightweight objects and DI replaced heavy EJB; generics and annotations added safety. |
| 2006 | JPA 1.0 | One standard for ORM across vendors. |
| 2009 | Spring 3, Java config | Cut XML overload; REST support. |
| 2011–14 | Kafka, Docker, Kubernetes | Reliable messaging; “works on my machine” fixed by containers; automated scaling. |
| 2014 | Java 8, Spring Boot 1 | Lambdas and streams; Boot removed setup pain. |
| 2018–21 | Java 11 and 17 LTS | Records, sealed types, cleaner code. |
| 2022 | Boot 3, Hibernate 6 | javax became jakarta; Java 17 baseline. |
| 2023 | Java 21 | Virtual threads: many concurrent requests without huge thread cost. |

## Phase 4: Dependencies Explained (pom.xml)

### Dependencies at a glance – how they fit together

A pom.xml is a shopping list. A **starter** is a ready-made basket: you ask for one thing (web, security) and get every library it usually needs, in versions known to work together. Plain libraries (Lombok, ModelMapper, POI, jjwt) are single items. Follow one request through the diagram: each box is a dependency doing its job.

> **Imagine:** Building a kitchen: starters are fitted units, plain libraries are single tools you add yourself.

```diagram
{"n":"W:starter-web:0:0|S:security + jjwt:1:0|C:Controller + Mapper:2:0|JP:data-jpa (Hibernate):2:1|H:HikariCP pool:1:1|MY:!mysql-connector-j:0:1","e":"W>S:request|S>C:authenticated|C>JP:service call|JP>H:borrow connection|H>MY:SQL over JDBC"}
```

1. **starter-web** – Tomcat receives the HTTP request and Jackson reads the JSON.
2. **starter-security and jjwt** – the filter chain checks the token before the controller runs.
3. **Controller and ModelMapper** – your code runs and converts between entities and DTOs.
4. **starter-data-jpa** – Hibernate turns objects into SQL.
5. **HikariCP** – lends a ready connection so you do not reconnect every time.
6. **mysql-connector-j** – the driver that speaks to MySQL.

#### Detailed explanation

Scope tells Maven when a jar is needed. Getting it right keeps the final jar smaller and safer.

| Dependency | Typical scope | Reason |
| --- | --- | --- |
| **spring-boot-starter-web** | compile (default) | needed to run |
| **spring-boot-starter-tomcat** | provided (only for WAR) | the external server supplies it |
| **mysql-connector-j** | runtime | never called in your code |
| **jjwt-impl, jjwt-jackson** | runtime | used behind the scenes |
| **jjwt-api** | compile | your code calls it |
| **lombok** | provided / annotation processor | only needed to compile |
| **spring-boot-configuration-processor** | optional | only for IDE help |

### spring-boot-starter-web

**What it is:** the basket for building web and REST apps. **What it brings:** Spring MVC (DispatcherServlet, @RestController), Jackson for JSON, and embedded Tomcat, so you run a jar with no separate server. **Why you need it:** without it you have no way to receive HTTP requests. **Watch out:** validation (@Valid) lives in its own spring-boot-starter-validation.

> **Imagine:** The front desk and the phone lines of your hotel.

### spring-boot-starter-tomcat

**What it is:** the embedded Tomcat web server. starter-web already includes it, so you rarely add it yourself. **When you do:** (1) building a WAR for an external Tomcat, mark it scope provided so you do not ship a second server; (2) swapping to Jetty or Undertow, exclude it from starter-web first. **Tune it with:** server.tomcat.threads.max, server.port, and timeouts.

> **Imagine:** Your app normally carries its own shop; for a WAR you rent a shop and leave yours at home.

### spring-boot-starter-data-jpa

**What it is:** database access made easy. **What it brings:** Spring Data repositories (interfaces that generate queries from method names), Hibernate as the JPA provider, transaction support and HikariCP. **Why you need it:** you write findByEmail(String e) and no SQL. **Watch out:** ddl-auto=update is risky in production (use Flyway or Liquibase), turn off open-in-view, and watch for the N+1 problem (see Module 3).

> **Imagine:** A translator that turns your Java objects into table rows and back.

#### Detailed explanation

Typical settings for a MySQL JPA app. Validate the schema and let Flyway change it.

```sql
spring.datasource.url=jdbc:mysql://localhost:3306/shop
spring.datasource.username=app
spring.datasource.password=${DB_PASSWORD}
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.open-in-view=false
spring.jpa.show-sql=false
```

```java
public interface UserRepository extends JpaRepository<User, Long> {
  Optional<User> findByEmail(String email); // no SQL written
}
```

### HikariCP

**What it is:** the connection pool. Opening a database connection is slow, so it keeps a few open and lends them out. **Where it comes from:** bundled with starter-data-jpa and starter-jdbc, and the Boot default since 2.0. **Key settings:** maximum-pool-size (default 10), connection-timeout (30 s), max-lifetime (30 min). **Rule of thumb:** a smaller pool is often faster; do not set it to hundreds. See the Connection Pool Lifecycle diagram.

> **Imagine:** A set of rental phone lines instead of buying a new phone for each call.

#### Detailed explanation

Start with the defaults, measure, then change one value at a time.

```sql
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.connection-timeout=30000
spring.datasource.hikari.max-lifetime=1800000
spring.datasource.hikari.leak-detection-threshold=20000
```

### mysql-connector-j

**What it is:** the official MySQL JDBC driver, the piece that speaks MySQL’s language. Earlier named mysql-connector-java. **Why you need it:** JPA and Hikari know how to ask; the driver knows how to talk to MySQL. **Tips:** scope runtime (you never import it in code), Boot manages its version, and set the timezone and SSL options in the URL for production.

### spring-boot-starter-security

**What it is:** authentication (who are you) and authorization (what may you do). **What it brings:** Spring Security and its filter chain. **Surprise:** just adding it locks every endpoint and prints a random password at startup. **You then define:** a SecurityFilterChain bean, a PasswordEncoder (BCrypt) and a way to load users. For stateless APIs you add a JWT filter. See Spring Security Filter Flow and the JWT flow in Module 5.

> **Imagine:** A building security desk that checks every visitor before they reach any room.

### jjwt-api, jjwt-impl, jjwt-jackson

**What they are:** one library (JJWT) split into three jars. **jjwt-api** is what your code calls to build and read tokens. **jjwt-impl** is the engine (runtime only). **jjwt-jackson** lets it read and write the token’s JSON using Jackson (runtime only). You need all three, and the same version. **Remember:** keep the secret key long (256 bits or more for HS256), put it in config or a vault rather than in code, and keep expiry short.

> **Imagine:** A remote control (api) that needs the motor (impl) and a translator (jackson) inside the box.

#### Detailed explanation

Build a token and read it back. Version 0.12 style API.

```java
SecretKey key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)); // 32+ bytes
String token = Jwts.builder()
  .subject("asha")
  .expiration(new Date(System.currentTimeMillis() + 15 * 60_000))
  .signWith(key)
  .compact();

String user = Jwts.parser().verifyWith(key).build()
  .parseSignedClaims(token).getPayload().getSubject();
```

### jackson-datatype-jsr310

**What it is:** teaches Jackson to read and write Java’s modern date types (LocalDate, LocalDateTime, Instant). **Problem it solves:** without it, dates fail or come out as strange numbers. **Good news:** starter-web already includes it and Boot registers it automatically, so you rarely add it yourself. **Tip:** set spring.jackson.serialization.write-dates-as-timestamps=false to get readable ISO dates.

### spring-boot-starter-mail

**What it is:** sends email from your app. **What it brings:** JavaMailSender and the Jakarta Mail library. **Why you need it:** password resets, OTPs and notifications. **Tips:** with Gmail or Office 365 use an app password, not your real one; send mail asynchronously (@Async) or through a queue so a slow mail server never slows a request; never log the credentials.

> **Imagine:** A post office counter your app calls whenever it must send a letter.

#### Detailed explanation

Settings and a simple send. Do not call it directly from a slow request path.

```sql
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=app@example.com
spring.mail.password=${MAIL_APP_PASSWORD}
spring.mail.properties.mail.smtp.starttls.enable=true
```

```java
@Async
public void send(String to, String text) {
  SimpleMailMessage m = new SimpleMailMessage();
  m.setTo(to); m.setSubject("Welcome"); m.setText(text);
  mailSender.send(m);
}
```

### spring-boot-starter-aop

**What it is:** support for aspects (@Aspect): logging, timing or auditing added around methods without editing them. **What it brings:** AspectJ annotations and weaving support on top of Spring AOP. **Tip:** aspects work through proxies, so a call from inside the same class is not intercepted (see Transactional self-call). Newer Boot versions may rename this starter, so check your version’s documentation.

> **Imagine:** Security cameras that watch doors without changing the rooms.

#### Detailed explanation

A tiny aspect that times every service method.

```java
@Aspect @Component
class TimingAspect {
  @Around("execution(* com.shop.service..*(..))")
  Object time(ProceedingJoinPoint pjp) throws Throwable {
    long t = System.nanoTime();
    try { return pjp.proceed(); }
    finally { System.out.println(pjp.getSignature() + " " + (System.nanoTime() - t) / 1_000_000 + " ms"); }
  }
}
```

### spring-boot-configuration-processor

**What it is:** a compile-time helper (annotation processor) that reads your @ConfigurationProperties classes and generates metadata. **Why you need it:** your IDE then auto-completes your own application.yml keys and shows descriptions. **Tip:** mark it optional or annotationProcessor so it is not shipped in the final jar. Nothing breaks without it; you simply lose the help.

> **Imagine:** A spell-checker for your settings file.

#### Detailed explanation

Typed settings that your IDE can auto-complete once the processor is present.

```java
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProps(String secret, Duration expiry) {}
// application.yml:  app.jwt.expiry: 15m
```

### Lombok

**What it is:** a compile-time tool that writes boilerplate for you: getters, setters, constructors, builders and loggers. **Common ones:** @Getter, @Setter, @Builder, @RequiredArgsConstructor (perfect for constructor injection), @Slf4j. **Watch out:** avoid @Data on JPA entities. Its equals, hashCode and toString can trigger lazy loading or endless loops between linked entities. Your IDE needs the Lombok plugin enabled.

> **Imagine:** An assistant who fills in the repetitive paperwork so you only write what matters.

#### Detailed explanation

Lombok shrinks a service and a DTO. Avoid @Data on entities.

```java
@Service @RequiredArgsConstructor @Slf4j
public class OrderService {
  private final OrderRepository repo; // constructor generated
}

@Builder @Getter
class OrderDto { Long id; String status; }
```

### ModelMapper

**What it is:** copies fields between objects by matching names, typically Entity to DTO. **Why use it:** it avoids dozens of manual setters. **Watch out:** it works by reflection at runtime, so a renamed field can silently stop mapping and only a test will notice. Use STRICT matching, keep one ModelMapper bean, and never expose entities directly in APIs. Larger teams often prefer MapStruct, which checks mappings at compile time.

> **Imagine:** A clerk who copies information between two forms by matching the labels.

#### Detailed explanation

Configure once, map anywhere.

```java
@Bean ModelMapper mapper() {
  ModelMapper m = new ModelMapper();
  m.getConfiguration().setMatchingStrategy(MatchingStrategies.STRICT);
  return m;
}
UserDto dto = mapper.map(user, UserDto.class);
```

### poi-ooxml (Apache POI)

**What it is:** a library for reading and writing Microsoft Office files, mainly .xlsx (Excel) and .docx (Word). **Why you need it:** report downloads and Excel imports. **Watch out:** XSSFWorkbook keeps the whole sheet in memory, so for large exports use SXSSFWorkbook, which streams rows. Always close the workbook, and validate uploaded files before reading them.

> **Imagine:** Your own spreadsheet robot that opens, fills and saves Excel files for you.

#### Detailed explanation

Stream a large export so it does not fill memory.

```java
try (SXSSFWorkbook wb = new SXSSFWorkbook(100)) { // keeps 100 rows in memory
  Sheet sh = wb.createSheet("Orders");
  Row r = sh.createRow(0);
  r.createCell(0).setCellValue("Id");
  wb.write(response.getOutputStream());
}
```

## Phase 5: Build It: Step-by-Step Implementations

### Build it – JWT login (register, login, protected API)

The most common backend task, built from zero. Follow the steps below in order: dependencies, settings, folders, then each file.

> **Imagine:** Like building a security desk: first the equipment, then the room, then each guard’s instructions.

```diagram
{"n":"A:1 pom.xml:0:0|B:2 application.yml:1:0|C:3 Folders + AppUser:2:0|D:5 UserDetails:2:1|E:6 JwtService:1:1|F:7 JwtAuthFilter:0:1|G:8 SecurityConfig:0:2|H:!9 AuthController:1:2","e":"A>B|B>C|C>D|D>E|E>F|F>G|G>H"}
```

1. Add the libraries and settings first.
2. Create the user entity and loader.
3. Build the token service, then the filter that reads it.
4. Wire everything in SecurityConfig, then add the login endpoint.

#### Detailed explanation

Written for Spring Boot 3.x with Java 17 or newer. Boot 4 renamed some starters, so check its docs if you use it. The jjwt version is not managed by Boot, so use the latest 0.12.x or newer.

**Step 1 – Add dependencies** to pom.xml.

```xml
<dependencies>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
  </dependency>
  <dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
  </dependency>
  <dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.6</version>
  </dependency>
  <dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
  </dependency>
  <dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
  </dependency>
  <dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
  </dependency>
</dependencies>
```

**Step 2 – Configure** src/main/resources/application.yml. Generate the secret once with: openssl rand -base64 32 (keep it in an environment variable, never in Git).

```xml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/shop
    username: app
    password: ${DB_PASSWORD}
  jpa:
    hibernate.ddl-auto: validate   # use Flyway for schema changes
    open-in-view: false
app:
  jwt:
    secret: ${JWT_SECRET}          # base64, 32+ bytes
    expiry-ms: 900000              # 15 minutes
```

#### Line by line: why each part exists

- `ddl-auto: validate` – Hibernate only checks that the tables match your entities and never changes them, so a typo cannot damage production data.
- `open-in-view: false` – Stops Hibernate holding a database connection for the whole web request, which wastes connections from the pool.
- `secret: ${JWT_SECRET}` – Read from an environment variable so the key is never in Git. Anyone holding this key can forge tokens.
- `expiry-ms: 900000` – 15 minutes. A short life limits the damage if a token is stolen.

#### Line by line: why each part exists

- `ddl-auto: validate` – Hibernate only checks that the tables match your entities and never changes them, so a typo cannot damage production data.
- `open-in-view: false` – Stops Hibernate holding a database connection for the whole web request, which wastes connections from the pool.
- `secret: ${JWT_SECRET}` – Read from an environment variable so the key is never in Git. Anyone holding this key can forge tokens.
- `expiry-ms: 900000` – 15 minutes. A short life limits the damage if a token is stolen.

**Step 3 – Create the folder structure** (package com.example.shop). Each name below is a file you will create in the next steps.

#### Line by line: why each part exists

- `config/` – Spring setup classes, such as the security rules.
- `security/` – Token creation and checking, and loading users for Spring Security.
- `user/` – The database side: entity and repository.
- `auth/` – Public endpoints for register and login.
- `api/` – Your normal endpoints, which are protected.

```xml
src/main/java/com/example/shop/
  ShopApplication.java
  config/
    SecurityConfig.java
  security/
    JwtService.java
    JwtAuthFilter.java
    CustomUserDetailsService.java
  user/
    AppUser.java
    UserRepository.java
  auth/
    AuthController.java
    AuthDtos.java
  api/
    MeController.java
```

#### Line by line: why each part exists

- `config/` – Spring setup classes, such as the security rules.
- `security/` – Token creation and checking, and loading users for Spring Security.
- `user/` – The database side: entity and repository.
- `auth/` – Public endpoints for register and login.
- `api/` – Your normal endpoints, which are protected.

#### Line by line: why each part exists

- `@Entity @Table(name = "users")` – Marks the class as a database table. Named users because user is a reserved word in some databases.
- `@Getter @Setter @NoArgsConstructor` – Lombok writes the getters, setters and the empty constructor. JPA needs the empty constructor to build objects from rows.
- `@Id @GeneratedValue(strategy = IDENTITY)` – The primary key. The database fills it with the next number.
- `@Column(unique = true, nullable = false) email` – The database itself refuses duplicate or missing emails, a safety net behind existsByEmail.
- `private String passwordHash` – Stores the BCrypt hash. The real password is never saved.
- `private String role = "USER"` – Every new user starts as an ordinary user. Spring will see it as ROLE_USER.
- `extends JpaRepository<AppUser, Long>` – Gives save, findById, delete and more for free. Long is the type of the id.
- `findByEmail(String email)` – Spring writes the SQL from the method name. It returns Optional because the user may not exist.
- `existsByEmail(String email)` – A cheap yes/no check used by register to answer 409 for a duplicate.

**Step 4 – user/AppUser.java and UserRepository.java**. The table is named users because user is a reserved word in some databases.

```java
@Entity @Table(name = "users")
@Getter @Setter @NoArgsConstructor
public class AppUser {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @Column(unique = true, nullable = false) private String email;
  @Column(nullable = false) private String passwordHash;
  @Column(nullable = false) private String role = "USER";
}

public interface UserRepository extends JpaRepository<AppUser, Long> {
  Optional<AppUser> findByEmail(String email);
  boolean existsByEmail(String email);
}
```

#### Line by line: why each part exists

- `implements UserDetailsService` – The contract Spring Security uses to ask: who is this username?
- `private final UserRepository repo` – The database access. With @RequiredArgsConstructor, Lombok makes the constructor that injects it.
- `loadUserByUsername(String email)` – The method name is fixed by the interface. We treat the email as the username.
- `.orElseThrow(() -> new UsernameNotFoundException(email))` – Spring expects exactly this exception for an unknown user and turns it into a failed login.
- `User.withUsername(...).password(u.getPasswordHash())` – Builds Spring’s own user object. The password is the stored hash, which Spring later compares with BCrypt.
- `.roles(u.getRole())` – Adds the ROLE_ prefix automatically, so hasRole("ADMIN") matches ROLE_ADMIN.

#### Line by line: why each part exists

- `@Entity @Table(name = "users")` – Marks the class as a database table. Named users because user is a reserved word in some databases.
- `@Getter @Setter @NoArgsConstructor` – Lombok writes the getters, setters and the empty constructor. JPA needs the empty constructor to build objects from rows.
- `@Id @GeneratedValue(strategy = IDENTITY)` – The primary key. The database fills it with the next number.
- `@Column(unique = true, nullable = false) email` – The database itself refuses duplicate or missing emails, a safety net behind existsByEmail.
- `private String passwordHash` – Stores the BCrypt hash. The real password is never saved.
- `private String role = "USER"` – Every new user starts as an ordinary user. Spring will see it as ROLE_USER.
- `extends JpaRepository<AppUser, Long>` – Gives save, findById, delete and more for free. Long is the type of the id.
- `findByEmail(String email)` – Spring writes the SQL from the method name. It returns Optional because the user may not exist.
- `existsByEmail(String email)` – A cheap yes/no check used by register to answer 409 for a duplicate.

**Step 5 – security/CustomUserDetailsService.java**. Spring Security calls this to load a user by name.

#### Line by line: why each part exists

- `@Service` – One shared instance, created once by Spring.
- `@Value("${app.jwt.secret}")` – Copies the value from application.yml into the constructor parameter at startup.
- `Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret))` – Turns the base64 text into bytes and builds the signing key. It refuses keys that are too short, which protects you from a weak secret.
- `Jwts.builder().subject(u.getUsername())` – Sets the sub claim: who the token is about.
- `.claim("roles", ...)` – Adds extra data. The stream turns authorities into plain strings such as ROLE_USER.
- `.issuedAt(...).expiration(...)` – When the token was made and when it stops working.
- `.signWith(key).compact()` – Signs it (the algorithm is chosen from the key size) and returns the final header.payload.signature text.
- `Jwts.parser().verifyWith(key).build().parseSignedClaims(t)` – Checks the signature and the expiry. If the token was changed or expired it throws JwtException.
- `valid(): subject equals username && not expired` – Confirms the token belongs to this user. The expiry is already checked by the parser, so this is a second safety check.

```java
@Service @RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {
  private final UserRepository repo;
  @Override public UserDetails loadUserByUsername(String email) {
    AppUser u = repo.findByEmail(email)
      .orElseThrow(() -> new UsernameNotFoundException(email));
    return User.withUsername(u.getEmail()).password(u.getPasswordHash())
      .roles(u.getRole()).build();   // becomes ROLE_USER
  }
}
```

#### Line by line: why each part exists

- `implements UserDetailsService` – The contract Spring Security uses to ask: who is this username?
- `private final UserRepository repo` – The database access. With @RequiredArgsConstructor, Lombok makes the constructor that injects it.
- `loadUserByUsername(String email)` – The method name is fixed by the interface. We treat the email as the username.
- `.orElseThrow(() -> new UsernameNotFoundException(email))` – Spring expects exactly this exception for an unknown user and turns it into a failed login.
- `User.withUsername(...).password(u.getPasswordHash())` – Builds Spring’s own user object. The password is the stored hash, which Spring later compares with BCrypt.
- `.roles(u.getRole())` – Adds the ROLE_ prefix automatically, so hasRole("ADMIN") matches ROLE_ADMIN.

#### Line by line: why each part exists

- `extends OncePerRequestFilter` – Guarantees the filter runs exactly once per request.
- `doFilterInternal(req, res, chain)` – The method to override. Spring calls it with the request, the response and the rest of the chain.
- `req.getHeader("Authorization")` – The client sends Bearer followed by the token in this header.
- `h.startsWith("Bearer ")` – Ignores other kinds of login headers.
- `getAuthentication() == null` – Skips the work if someone has already been authenticated in this request.
- `h.substring(7)` – Removes the 7 characters of Bearer and a space, leaving only the token.
- `uds.loadUserByUsername(jwt.username(token))` – Reads the name from the token and loads the user fresh, so current roles and state are used.
- `jwt.valid(token, u)` – Only trust the token if it is correct and unexpired.
- `new UsernamePasswordAuthenticationToken(u, null, u.getAuthorities())` – The object meaning this user is authenticated. The password is null because it is not needed now.
- `setDetails(new WebAuthenticationDetailsSource()...)` – Attaches the IP address and session info, useful for audit.
- `SecurityContextHolder...setAuthentication(auth)` – The step that actually logs the person in for this request. Later rules and controllers read it.
- `catch (JwtException | UsernameNotFoundException e)` – A bad token must not crash the request. Leaving it unauthenticated lets the entry point answer 401.
- `chain.doFilter(req, res)` – Hands over to the next filter. Without it the request would stop here.

**Step 6 – security/JwtService.java**. Creates and checks tokens. parseSignedClaims throws JwtException if the signature is wrong or the token expired.

```java
@Service
public class JwtService {
  private final SecretKey key;
  private final long expiryMs;
  public JwtService(@Value("${app.jwt.secret}") String secret,
                    @Value("${app.jwt.expiry-ms}") long expiryMs) {
    this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
    this.expiryMs = expiryMs;
  }
  public String generate(UserDetails u) {
    return Jwts.builder().subject(u.getUsername())
      .claim("roles", u.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList())
      .issuedAt(new Date())
      .expiration(new Date(System.currentTimeMillis() + expiryMs))
      .signWith(key).compact();
  }
  public String username(String token) { return claims(token).getSubject(); }
  public boolean valid(String token, UserDetails u) {
    Claims c = claims(token);
    return c.getSubject().equals(u.getUsername()) && c.getExpiration().after(new Date());
  }
  private Claims claims(String t) {
    return Jwts.parser().verifyWith(key).build().parseSignedClaims(t).getPayload();
  }
}
```

#### Line by line: why each part exists

- `@EnableMethodSecurity` – Lets you use annotations like @PreAuthorize on methods.
- `csrf.disable()` – CSRF attacks rely on browsers sending cookies automatically. A token in a header is not sent automatically, so this is safe for token APIs only.
- `STATELESS` – Never create an HTTP session. Every request must carry its own token.
- `requestMatchers("/api/auth/**").permitAll()` – Register and login must work without a token.
- `hasRole("ADMIN")` – Needs ROLE_ADMIN. Only matching users reach /api/admin.
- `anyRequest().authenticated()` – Everything else needs a login. Rules are read top to bottom and the first match wins.
- `HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)` – Without this, Spring answers 403 for a missing login. 401 is the correct meaning.
- `addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)` – Puts our filter early, so identity is known before the permission checks run.
- `BCryptPasswordEncoder` – Slow, salted hashing. Used when registering and when Spring checks a login.
- `AuthenticationManager bean` – Lets the controller trigger a login check. Spring builds it from your UserDetailsService and PasswordEncoder.

#### Line by line: why each part exists

- `@Service` – One shared instance, created once by Spring.
- `@Value("${app.jwt.secret}")` – Copies the value from application.yml into the constructor parameter at startup.
- `Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret))` – Turns the base64 text into bytes and builds the signing key. It refuses keys that are too short, which protects you from a weak secret.
- `Jwts.builder().subject(u.getUsername())` – Sets the sub claim: who the token is about.
- `.claim("roles", ...)` – Adds extra data. The stream turns authorities into plain strings such as ROLE_USER.
- `.issuedAt(...).expiration(...)` – When the token was made and when it stops working.
- `.signWith(key).compact()` – Signs it (the algorithm is chosen from the key size) and returns the final header.payload.signature text.
- `Jwts.parser().verifyWith(key).build().parseSignedClaims(t)` – Checks the signature and the expiry. If the token was changed or expired it throws JwtException.
- `valid(): subject equals username && not expired` – Confirms the token belongs to this user. The expiry is already checked by the parser, so this is a second safety check.

**Step 7 – security/JwtAuthFilter.java**. Runs once per request: reads the Bearer token and, if valid, tells Spring Security who the caller is.

#### Line by line: why each part exists

- `public record RegisterRequest(...)` – A record is a short immutable data holder, ideal for JSON input and output.
- `@Email @NotBlank @Size(min = 8) with @Valid` – Checks the input before any logic runs. A bad request is answered with 400.
- `@RestController @RequestMapping("/api/auth")` – Returns JSON and gives every method here the base path /api/auth.
- `repo.existsByEmail(...) then status(409)` – 409 Conflict tells the client the email is already taken.
- `encoder.encode(r.password())` – Hashes the password with a random salt. The plain password is never stored.
- `status(201)` – 201 Created is the correct answer for a successful create.
- `authManager.authenticate(new UsernamePasswordAuthenticationToken(email, password))` – One call loads the user, compares the BCrypt hash and throws if it is wrong.
- `jwt.generate(uds.loadUserByUsername(...))` – Runs only if authenticate did not throw, so a token is given only after a real login.
- `@ExceptionHandler(AuthenticationException.class)` – Turns the wrong-password exception into 401 instead of a 500 error.

```java
@Component @RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {
  private final JwtService jwt;
  private final UserDetailsService uds;
  @Override protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res,
      FilterChain chain) throws ServletException, IOException {
    String h = req.getHeader("Authorization");
    if (h != null && h.startsWith("Bearer ")
        && SecurityContextHolder.getContext().getAuthentication() == null) {
      try {
        String token = h.substring(7);
        UserDetails u = uds.loadUserByUsername(jwt.username(token));
        if (jwt.valid(token, u)) {
          var auth = new UsernamePasswordAuthenticationToken(u, null, u.getAuthorities());
          auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(req));
          SecurityContextHolder.getContext().setAuthentication(auth);
        }
      } catch (JwtException | UsernameNotFoundException e) {
        // leave the request unauthenticated: it will get 401
      }
    }
    chain.doFilter(req, res);
  }
}
```

#### Line by line: why each part exists

- `extends OncePerRequestFilter` – Guarantees the filter runs exactly once per request.
- `doFilterInternal(req, res, chain)` – The method to override. Spring calls it with the request, the response and the rest of the chain.
- `req.getHeader("Authorization")` – The client sends Bearer followed by the token in this header.
- `h.startsWith("Bearer ")` – Ignores other kinds of login headers.
- `getAuthentication() == null` – Skips the work if someone has already been authenticated in this request.
- `h.substring(7)` – Removes the 7 characters of Bearer and a space, leaving only the token.
- `uds.loadUserByUsername(jwt.username(token))` – Reads the name from the token and loads the user fresh, so current roles and state are used.
- `jwt.valid(token, u)` – Only trust the token if it is correct and unexpired.
- `new UsernamePasswordAuthenticationToken(u, null, u.getAuthorities())` – The object meaning this user is authenticated. The password is null because it is not needed now.
- `setDetails(new WebAuthenticationDetailsSource()...)` – Attaches the IP address and session info, useful for audit.
- `SecurityContextHolder...setAuthentication(auth)` – The step that actually logs the person in for this request. Later rules and controllers read it.
- `catch (JwtException | UsernameNotFoundException e)` – A bad token must not crash the request. Leaving it unauthenticated lets the entry point answer 401.
- `chain.doFilter(req, res)` – Hands over to the next filter. Without it the request would stop here.

#### Line by line: why each part exists

- `Authentication a` – Spring injects the logged-in identity set by the filter.
- `a.getName()` – The username (email) of the caller.
- `a.getAuthorities()` – The caller’s roles.

**Step 8 – config/SecurityConfig.java**. Stateless (no session), public login paths, filter placed before the normal login filter.

```java
@Configuration @EnableMethodSecurity @RequiredArgsConstructor
public class SecurityConfig {
  private final JwtAuthFilter jwtFilter;

  @Bean SecurityFilterChain chain(HttpSecurity http) throws Exception {
    return http
      .csrf(c -> c.disable())   // fine for token APIs, not for cookie sessions
      .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
      .authorizeHttpRequests(a -> a
        .requestMatchers("/api/auth/**").permitAll()
        .requestMatchers("/api/admin/**").hasRole("ADMIN")
        .anyRequest().authenticated())
      .exceptionHandling(e -> e.authenticationEntryPoint(
        new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
      .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
      .build();
  }
  @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
  @Bean AuthenticationManager authenticationManager(AuthenticationConfiguration c) throws Exception {
    return c.getAuthenticationManager();
  }
}
```

#### Line by line: why each part exists

- `@EnableMethodSecurity` – Lets you use annotations like @PreAuthorize on methods.
- `csrf.disable()` – CSRF attacks rely on browsers sending cookies automatically. A token in a header is not sent automatically, so this is safe for token APIs only.
- `STATELESS` – Never create an HTTP session. Every request must carry its own token.
- `requestMatchers("/api/auth/**").permitAll()` – Register and login must work without a token.
- `hasRole("ADMIN")` – Needs ROLE_ADMIN. Only matching users reach /api/admin.
- `anyRequest().authenticated()` – Everything else needs a login. Rules are read top to bottom and the first match wins.
- `HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)` – Without this, Spring answers 403 for a missing login. 401 is the correct meaning.
- `addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)` – Puts our filter early, so identity is known before the permission checks run.
- `BCryptPasswordEncoder` – Slow, salted hashing. Used when registering and when Spring checks a login.
- `AuthenticationManager bean` – Lets the controller trigger a login check. Spring builds it from your UserDetailsService and PasswordEncoder.

**Step 9 – auth/AuthDtos.java and AuthController.java**. Register stores a BCrypt hash, never the password. Login checks credentials and returns a token.

```java
public record RegisterRequest(@Email @NotBlank String email, @Size(min = 8) String password) {}
public record LoginRequest(String email, String password) {}
public record TokenResponse(String token) {}

@RestController @RequestMapping("/api/auth") @RequiredArgsConstructor
class AuthController {
  private final UserRepository repo;
  private final PasswordEncoder encoder;
  private final AuthenticationManager authManager;
  private final JwtService jwt;
  private final CustomUserDetailsService uds;

  @PostMapping("/register")
  ResponseEntity<Void> register(@Valid @RequestBody RegisterRequest r) {
    if (repo.existsByEmail(r.email())) return ResponseEntity.status(409).build();
    AppUser u = new AppUser();
    u.setEmail(r.email());
    u.setPasswordHash(encoder.encode(r.password()));
    repo.save(u);
    return ResponseEntity.status(201).build();
  }

  @PostMapping("/login")
  TokenResponse login(@RequestBody LoginRequest r) {
    authManager.authenticate(new UsernamePasswordAuthenticationToken(r.email(), r.password()));
    return new TokenResponse(jwt.generate(uds.loadUserByUsername(r.email())));
  }

  @ExceptionHandler(AuthenticationException.class)   // wrong password -> 401, not 500
  ResponseEntity<Void> bad() { return ResponseEntity.status(401).build(); }
}
```

#### Line by line: why each part exists

- `public record RegisterRequest(...)` – A record is a short immutable data holder, ideal for JSON input and output.
- `@Email @NotBlank @Size(min = 8) with @Valid` – Checks the input before any logic runs. A bad request is answered with 400.
- `@RestController @RequestMapping("/api/auth")` – Returns JSON and gives every method here the base path /api/auth.
- `repo.existsByEmail(...) then status(409)` – 409 Conflict tells the client the email is already taken.
- `encoder.encode(r.password())` – Hashes the password with a random salt. The plain password is never stored.
- `status(201)` – 201 Created is the correct answer for a successful create.
- `authManager.authenticate(new UsernamePasswordAuthenticationToken(email, password))` – One call loads the user, compares the BCrypt hash and throws if it is wrong.
- `jwt.generate(uds.loadUserByUsername(...))` – Runs only if authenticate did not throw, so a token is given only after a real login.
- `@ExceptionHandler(AuthenticationException.class)` – Turns the wrong-password exception into 401 instead of a 500 error.

**Step 10 – api/MeController.java**, a protected endpoint to prove it works.

```java
@RestController
class MeController {
  @GetMapping("/api/me")
  Map<String, Object> me(Authentication a) {
    return Map.of("user", a.getName(), "roles", a.getAuthorities().toString());
  }
}
```

#### Line by line: why each part exists

- `Authentication a` – Spring injects the logged-in identity set by the filter.
- `a.getName()` – The username (email) of the caller.
- `a.getAuthorities()` – The caller’s roles.

**Step 11 – Test it** (database must exist and the app must be running).

```xml
# 1. register
curl -X POST localhost:8080/api/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"asha@example.com","password":"Passw0rd!"}'
# 2. login -> {"token":"eyJ..."}
curl -X POST localhost:8080/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"asha@example.com","password":"Passw0rd!"}'
# 3. call a protected endpoint
curl localhost:8080/api/me -H 'Authorization: Bearer eyJ...'
# no token -> 401
```

**Next steps for production:** add a refresh token, keep expiry short, set CORS for your frontend, rate-limit login, and never log tokens.

### Build it – Google OAuth2 login (on top of JWT)

Adds ‘Sign in with Google’ in about six small steps, reusing the JWT from the previous guide.

> **Imagine:** Showing the valet key to the guard instead of your own house key.

#### Detailed explanation

Adds ‘Sign in with Google’ on top of the JWT guide above. Spring does the OAuth steps; you only decide what happens after success.

**Step 1 – Register the app with Google.** In Google Cloud Console create an OAuth client (type Web application). Add the redirect URI exactly as below, then copy the client id and secret into environment variables.

```xml
Authorised redirect URI:
http://localhost:8080/login/oauth2/code/google
```

**Step 2 – Add the dependency** (the web, security and jjwt ones are already there).

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-oauth2-client</artifactId>
</dependency>
```

**Step 3 – application.yml**. Spring already knows Google’s addresses, so only your id, secret and scopes are needed.

```xml
spring:
  security:
    oauth2:
      client:
        registration:
          google:
            client-id: ${GOOGLE_CLIENT_ID}
            client-secret: ${GOOGLE_CLIENT_SECRET}
            scope: openid,profile,email
```

**Step 4 – New file security/OAuthSuccessHandler.java**. Runs after Google confirms the user: it finds or creates the user and issues your own JWT.

```java
@Component @RequiredArgsConstructor
public class OAuthSuccessHandler implements AuthenticationSuccessHandler {
  private final UserRepository repo;
  private final PasswordEncoder encoder;
  private final JwtService jwt;
  private final CustomUserDetailsService uds;

  @Override public void onAuthenticationSuccess(HttpServletRequest req,
      HttpServletResponse res, Authentication auth) throws IOException {
    OAuth2User p = (OAuth2User) auth.getPrincipal();
    String email = p.getAttribute("email");
    repo.findByEmail(email).orElseGet(() -> {
      AppUser n = new AppUser();
      n.setEmail(email);
      n.setPasswordHash(encoder.encode(UUID.randomUUID().toString())); // unused password
      return repo.save(n);
    });
    Cookie c = new Cookie("access_token", jwt.generate(uds.loadUserByUsername(email)));
    c.setHttpOnly(true); c.setPath("/"); c.setMaxAge(900);
    res.addCookie(c);
    res.sendRedirect("/");
  }
}
```

#### Line by line: why each part exists

- `implements AuthenticationSuccessHandler` – Spring calls onAuthenticationSuccess after Google has confirmed the user.
- `(OAuth2User) auth.getPrincipal()` – Holds what Google told us about the person.
- `p.getAttribute("email")` – Available because the yml asked for the email scope.
- `findByEmail(email).orElseGet(...)` – Reuses an existing user and creates one only if missing. orElseGet runs lazily, unlike orElse.
- `encoder.encode(UUID.randomUUID().toString())` – Social users have no password. A random hash keeps the column filled and unguessable.
- `new Cookie("access_token", jwt.generate(...))` – Your own JWT, issued after Google approved the user.
- `c.setHttpOnly(true)` – JavaScript cannot read the cookie, which protects it from theft through XSS.
- `setPath("/") and setMaxAge(900)` – Sent on every path of the site and lasts 15 minutes, matching the token life.
- `res.sendRedirect("/")` – Sends the browser back into your app.

#### Line by line: why each part exists

- `implements AuthenticationSuccessHandler` – Spring calls onAuthenticationSuccess after Google has confirmed the user.
- `(OAuth2User) auth.getPrincipal()` – Holds what Google told us about the person.
- `p.getAttribute("email")` – Available because the yml asked for the email scope.
- `findByEmail(email).orElseGet(...)` – Reuses an existing user and creates one only if missing. orElseGet runs lazily, unlike orElse.
- `encoder.encode(UUID.randomUUID().toString())` – Social users have no password. A random hash keeps the column filled and unguessable.
- `new Cookie("access_token", jwt.generate(...))` – Your own JWT, issued after Google approved the user.
- `c.setHttpOnly(true)` – JavaScript cannot read the cookie, which protects it from theft through XSS.
- `setPath("/") and setMaxAge(900)` – Sent on every path of the site and lasts 15 minutes, matching the token life.
- `res.sendRedirect("/")` – Sends the browser back into your app.

**Step 5 – Change SecurityConfig.java.** Add the OAuth login, allow its paths, and let a short session exist, because the login handshake needs to remember its state.

#### Line by line: why each part exists

- `.oauth2Login(o -> o.successHandler(oauthSuccess))` – Switches on the Google login flow (/oauth2/authorization/google) and plugs in our handler.
- `SessionCreationPolicy.IF_REQUIRED` – OAuth stores a short-lived state value in a session to stop forged callbacks, so a session must be allowed.
- `permitAll() for /oauth2/** and /login/**` – The login start and callback addresses must be public.

```java
private final OAuthSuccessHandler oauthSuccess;   // new field

// inside chain(): change the session line and add oauth2Login
.sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
.authorizeHttpRequests(a -> a
  .requestMatchers("/api/auth/**", "/oauth2/**", "/login/**").permitAll()
  /* the rest as before */)
.oauth2Login(o -> o.successHandler(oauthSuccess))
```

#### Line by line: why each part exists

- `.oauth2Login(o -> o.successHandler(oauthSuccess))` – Switches on the Google login flow (/oauth2/authorization/google) and plugs in our handler.
- `SessionCreationPolicy.IF_REQUIRED` – OAuth stores a short-lived state value in a session to stop forged callbacks, so a session must be allowed.
- `permitAll() for /oauth2/** and /login/**` – The login start and callback addresses must be public.

#### Line by line: why each part exists

- `h != null && h.startsWith("Bearer ")` – Prefer the header, used by API clients.
- `else if (req.getCookies() != null)` – Browser users come through the cookie instead. The null check avoids a crash when no cookies exist.
- `c.getName().equals("access_token")` – Picks out our token cookie among any others.

**Step 6 – Let the filter read the cookie.** In JwtAuthFilter, if there is no Authorization header, take the token from the access_token cookie instead. Try it: open http://localhost:8080/oauth2/authorization/google in a browser.

```java
String token = null;
if (h != null && h.startsWith("Bearer ")) token = h.substring(7);
else if (req.getCookies() != null)
  for (Cookie c : req.getCookies())
    if (c.getName().equals("access_token")) token = c.getValue();
```

#### Line by line: why each part exists

- `h != null && h.startsWith("Bearer ")` – Prefer the header, used by API clients.
- `else if (req.getCookies() != null)` – Browser users come through the cookie instead. The null check avoids a crash when no cookies exist.
- `c.getName().equals("access_token")` – Picks out our token cookie among any others.

**Safety notes:** cookie-based auth brings CSRF back, so enable CSRF protection or use SameSite=Lax cookies; use HTTPS in production (add Secure to the cookie); and never put the token in the redirect URL.

### Build it – Pagination (page and cursor)

A paged list endpoint in five steps, plus the fast cursor version for large tables.

#### Detailed explanation

Step by step for a paged list endpoint, then the faster cursor version for large data.

**Step 1 – No new dependency.** Spring Data JPA already includes paging. Optionally cap the page size in application.yml.

```xml
spring:
  data:
    web:
      pageable:
        default-page-size: 20
        max-page-size: 100
```

**Step 2 – Repository.** JpaRepository already has findAll(Pageable). Add a filter if you need one.

```java
public interface OrderRepository extends JpaRepository<Order, Long> {
  Page<Order> findByStatus(String status, Pageable pageable);
}
```

**Step 3 – Controller.** Spring turns ?page=0&size=20&sort=id,desc into a Pageable. Return DTOs, not entities.

```java
@GetMapping("/api/orders")
Page<OrderDto> list(@RequestParam(required = false) String status,
    @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC) Pageable p) {
  Page<Order> page = (status == null) ? repo.findAll(p) : repo.findByStatus(status, p);
  return page.map(o -> new OrderDto(o.getId(), o.getStatus()));
}
```

#### Line by line: why each part exists

- `@PageableDefault(size = 20, sort = "id", direction = DESC)` – Builds the Pageable from ?page, ?size and ?sort. These defaults apply when the client sends nothing.
- `status == null ? repo.findAll(p) : repo.findByStatus(status, p)` – The filter is optional, so pick the matching repository call.
- `repo.findAll(p)` – Runs the SQL with LIMIT and OFFSET, plus a COUNT query for the totals.
- `page.map(o -> new OrderDto(...))` – Converts each entity to a DTO and keeps the paging details. Entities are never returned directly.

#### Line by line: why each part exists

- `@PageableDefault(size = 20, sort = "id", direction = DESC)` – Builds the Pageable from ?page, ?size and ?sort. These defaults apply when the client sends nothing.
- `status == null ? repo.findAll(p) : repo.findByStatus(status, p)` – The filter is optional, so pick the matching repository call.
- `repo.findAll(p)` – Runs the SQL with LIMIT and OFFSET, plus a COUNT query for the totals.
- `page.map(o -> new OrderDto(...))` – Converts each entity to a DTO and keeps the paging details. Entities are never returned directly.

**Step 4 – Read the response.** It includes content, totalElements, totalPages, number and size. Try: GET /api/orders?page=2&size=10&sort=id,desc

**Step 5 – Cursor version (large tables).** Return a Slice and let the client send the last id it saw. There is no COUNT query, so it stays fast.

#### Line by line: why each part exists

- `Slice<Order> findByIdLessThanOrderByIdDesc` – Means: rows with id below X, newest first. A Slice skips the COUNT query and fetches one extra row to learn if there is a next page.
- `defaultValue = Long.MAX_VALUE` – For the first page there is no cursor, so everything is below the maximum.
- `PageRequest.ofSize(20)` – A limit only, no page number.
- `WHERE id < ?` – Uses the primary-key index to jump straight to the place. This is why it stays fast on page 50,000.

```java
// Repository
Slice<Order> findByIdLessThanOrderByIdDesc(Long lastId, Pageable p);

// Controller: GET /api/orders/feed?after=1050
@GetMapping("/api/orders/feed")
Slice<OrderDto> feed(@RequestParam(defaultValue = "9223372036854775807") Long after) {
  return repo.findByIdLessThanOrderByIdDesc(after, PageRequest.ofSize(20))
             .map(o -> new OrderDto(o.getId(), o.getStatus()));
}
```

#### Line by line: why each part exists

- `Slice<Order> findByIdLessThanOrderByIdDesc` – Means: rows with id below X, newest first. A Slice skips the COUNT query and fetches one extra row to learn if there is a next page.
- `defaultValue = Long.MAX_VALUE` – For the first page there is no cursor, so everything is below the maximum.
- `PageRequest.ofSize(20)` – A limit only, no page number.
- `WHERE id < ?` – Uses the primary-key index to jump straight to the place. This is why it stays fast on page 50,000.

**Tip:** sort by a column that has an index, and always add a unique tie-breaker (the id), or rows may repeat between pages.

### Build it – Caching (Caffeine, then Redis)

Make repeated reads fast in six steps, then switch to a shared cache for many servers.

#### Detailed explanation

Step by step for caching with Caffeine (in memory), then how to switch to Redis when you run several servers.

**Step 1 – Add dependencies.**

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
  </dependency>
<dependency>
    <groupId>com.github.ben-manes.caffeine</groupId>
    <artifactId>caffeine</artifactId>
  </dependency>
```

**Step 2 – Configure** size and expiry in application.yml.

```xml
spring:
  cache:
    type: caffeine
    cache-names: products
    caffeine:
      spec: maximumSize=1000,expireAfterWrite=10m
```

**Step 3 – Turn caching on** in your main class or a config class.

```java
@SpringBootApplication
@EnableCaching
public class ShopApplication { /* main method as usual */ }
```

#### Line by line: why each part exists

- `@EnableCaching` – Turns on the proxy that checks the cache. Without it the cache annotations are silently ignored.

#### Line by line: why each part exists

- `@EnableCaching` – Turns on the proxy that checks the cache. Without it the cache annotations are silently ignored.

**Step 4 – Annotate the service** (file product/ProductService.java). Reads fill the cache; writes clear or refresh it.

#### Line by line: why each part exists

- `@Cacheable(value = "products", key = "#id")` – Before running, look in the cache named products for this id. On a hit the method body is skipped.
- `#id` – A SpEL expression that refers to the parameter named id.
- `returns ProductDto` – The returned value is what gets stored, so return a small DTO, not an entity.
- `@CachePut(... key = "#result.id()")` – Always runs the method and stores the result, keeping the cache fresh after an update. #result is the return value.
- `@CacheEvict(... key = "#id")` – Removes the entry when the product is deleted, so a stale copy is never served.
- `Self-call warning` – Calling get() from another method in the same class skips the proxy, so nothing is cached.

```java
@Service @RequiredArgsConstructor
public class ProductService {
  private final ProductRepository repo;

  @Cacheable(value = "products", key = "#id")
  public ProductDto get(Long id) {            // first call hits the database
    return toDto(repo.findById(id).orElseThrow());
  }

  @CachePut(value = "products", key = "#result.id()")
  public ProductDto update(Long id, UpdateRequest r) { /* save, return dto */ }

  @CacheEvict(value = "products", key = "#id")
  public void delete(Long id) { repo.deleteById(id); }
}
```

#### Line by line: why each part exists

- `@Cacheable(value = "products", key = "#id")` – Before running, look in the cache named products for this id. On a hit the method body is skipped.
- `#id` – A SpEL expression that refers to the parameter named id.
- `returns ProductDto` – The returned value is what gets stored, so return a small DTO, not an entity.
- `@CachePut(... key = "#result.id()")` – Always runs the method and stores the result, keeping the cache fresh after an update. #result is the return value.
- `@CacheEvict(... key = "#id")` – Removes the entry when the product is deleted, so a stale copy is never served.
- `Self-call warning` – Calling get() from another method in the same class skips the proxy, so nothing is cached.

**Step 5 – Check it works.** Call GET /api/products/1 twice with SQL logging on: the second call should print no query.

**Step 6 – Move to Redis when you have many servers.** Each server’s Caffeine cache is separate, so use a shared cache instead.

```xml
<!-- replace caffeine with: -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
  </dependency>

spring:
  cache:
    type: redis
    redis.time-to-live: 10m
  data.redis.host: localhost
```

**Remember:** cache DTOs (they must be serializable for Redis), not JPA entities; a call from inside the same class skips the cache (proxy rule); and expiry is your safety net against stale data.

## Phase 6: Core Java & Servlet/JDBC

### JVM Architecture

Your .java file is compiled to bytecode. The JVM loads it, verifies it, and runs it. It first interprets, then the JIT compiler turns frequently used (hot) code into fast machine code.

> **Imagine:** Bytecode is a recipe that any chef (JVM on any OS) can cook. The chef notices which dishes are ordered all day and prepares them in advance. That is JIT.

#### Lifecycle diagram: JVM Execution Pipeline

```diagram
{"n":"A:Hello.java:0:0|B:javac:1:0|C:.class bytecode:2:0|D:Class loader:2:1|E:Interpreter:1:1|F:JIT compiler:0:1|G:!Machine code:0:2","e":"A>B|B>C:compile|C>D:load, verify|D>E:run|E>F:hot method|F>G:optimise"}
```

1. javac compiles source into platform-neutral bytecode.
2. The class loader loads, verifies and initialises the class.
3. The interpreter starts running immediately.
4. Methods called often are marked hot.
5. The JIT compiles hot methods into native code, so long-running apps speed up.

### Java Memory Model

Rules for when a change made by one thread becomes visible to another. Without them, threads may see stale values because of CPU caches and reordering.

> **Imagine:** Two cooks each keep a private notepad. volatile or synchronized is like shouting the update across the whole kitchen so everyone rewrites their notes.

### Object Internals & Primitives

Every object has a hidden header plus its fields. Primitives (int) hold values; wrappers (Integer) are objects. Integer caches -128 to 127, so == can lie for bigger numbers.

> **Imagine:** int is a number on a card. Integer is a box containing the card. == asks “is this the same box?”, equals() asks “is the card the same?”.

#### Detailed explanation

Boxing wraps a primitive in an object. The JVM caches boxes for -128 to 127, so == behaves differently for small and large values. This is a classic bug source.

```java
Integer a = 127, b = 127;
System.out.println(a == b);      // true  (same cached box)
Integer c = 128, d = 128;
System.out.println(c == d);      // false (two different boxes)
System.out.println(c.equals(d)); // true  (compare values)
```

| Type | Size | Default |
| --- | --- | --- |
| **byte** | 1 byte | 0 |
| **int** | 4 bytes | 0 |
| **long** | 8 bytes | 0L |
| **double** | 8 bytes | 0.0 |
| **boolean** | JVM-dependent | false |

### Generics & Type Erasure

Generics give compile-time type safety, but the types are erased at runtime. Wildcards (? extends, ? super) control what you may read or write.

> **Imagine:** A box labelled “Apples” gets its label removed at the warehouse door. A basket marked ? extends Fruit lets you take fruit out but not put anything in.

### Exception Architecture

Checked exceptions must be handled; unchecked ones (RuntimeException) need not. Use try-with-resources to close things, and never swallow errors silently.

> **Imagine:** Checked is a fire drill you must plan for. Unchecked is a surprise power cut. Swallowing an exception is pulling the batteries out of the smoke alarm.

### Collections Internals

ArrayList is a resizable array. HashMap uses hashCode to choose a bucket and equals to find the key inside it. Break the hashCode/equals contract and lookups fail.

> **Imagine:** HashMap is a hotel with lockers. hashCode picks the corridor; equals finds your exact locker. Change your name after check-in and nobody can find your bag.

#### Lifecycle diagram: HashMap put() Flow

```diagram
{"n":"K:put(k, v):0:0|H:hash(k):1:0|B:Bucket index:2:0|EM:Bucket empty?:2:1|EQ:equals() match?:1:1|RP:!Replace value:0:1|NW:!Add new node:2:2|RZ:Resize check:1:2","e":"K>H|H>B:spread bits|B>EM:hash & (n-1)|EM>NW:empty|EM>EQ:occupied|EQ>RP:same key|EQ>NW:different key|NW>RZ:over 75%?"}
```

1. **hash** – hashCode() is mixed so high bits also matter.
2. **Index** – the bucket is chosen with hash & (length-1).
3. **Empty bucket** – the new node is placed straight in.
4. **Occupied** – every node in the bucket is compared with equals().
5. **Same key** – only the value is replaced.
6. **Different key** – the node is appended; a chain of 8 or more becomes a tree.
7. **Resize** – above 75% full the table doubles and entries are re-spread.

#### Detailed explanation

put(key, value) computes hash(key), picks a bucket, and uses equals() to find an existing key. When a bucket gets long (8+ entries) it becomes a tree. The table doubles when it is 75% full. If you mutate a key after inserting it, its hash changes and the entry is lost.

```java
class UserKey {
  final long id;
  UserKey(long id) { this.id = id; }
  @Override public boolean equals(Object o) {
    return o instanceof UserKey u && u.id == id;
  }
  @Override public int hashCode() { return Long.hashCode(id); } // must match equals
}
Map<UserKey, String> m = new HashMap<>();
m.put(new UserKey(1), "Asha");
m.get(new UserKey(1)); // "Asha" only because equals+hashCode agree
```

| Structure | get | insert | Ordered? |
| --- | --- | --- | --- |
| **ArrayList** | O(1) by index | O(n) middle | insertion order |
| **LinkedList** | O(n) | O(1) at ends | insertion order |
| **HashMap** | O(1) average | O(1) average | no |
| **TreeMap** | O(log n) | O(log n) | sorted by key |

### I/O, NIO & Files

Classic streams read byte by byte and block. NIO uses buffers and channels, and selectors let one thread watch many connections. Files and Path make file work simple.

> **Imagine:** Streams are carrying water in one bucket at a time. NIO is a pipe system with many taps watched by a single plumber.

### Concurrency: Threads & Locks

Threads run tasks in parallel. Use ExecutorService for pools, locks and atomics to protect shared data, and avoid deadlocks.

> **Imagine:** Two people meet in a narrow doorway, each saying “after you” forever. That is a deadlock. Fix: everybody agrees to use doors in the same order.

#### Lifecycle diagram: Thread Lifecycle

```diagram
{"n":"N:NEW:0:1|R:RUNNABLE:1:1|BL:BLOCKED:2:0|W:WAITING:2:1|TW:TIMED_WAITING:2:2|TM:!TERMINATED:1:2","e":"N>R:start()|R>BL:needs lock|BL>R:got lock|R>W:wait() / join()|W>R:notify()|R>TW:sleep(ms)|TW>R:time up|R>TM:run() ends"}
```

1. **NEW** – created but not started.
2. **RUNNABLE** – running or ready to run.
3. **BLOCKED** – waiting for a synchronized lock held by another thread.
4. **WAITING** – waits until another thread signals it.
5. **TIMED_WAITING** – waits for a limited time.
6. **TERMINATED** – finished; it cannot be restarted.

#### Detailed explanation

A deadlock happens when threads hold one lock each and wait for the other’s. The cure is a fixed lock order, or timeouts with tryLock. For everyday work, prefer a thread pool over raw threads.

```java
Object A = new Object(), B = new Object();
// Thread 1
synchronized (A) { synchronized (B) { /* work */ } }
// Thread 2 - opposite order, can deadlock
synchronized (B) { synchronized (A) { /* work */ } }
// Fix: both threads lock A first, then B.
```

```java
ExecutorService pool = Executors.newFixedThreadPool(4);
Future<Integer> f = pool.submit(() -> 21 * 2);
System.out.println(f.get()); // 42
pool.shutdown();
```

### Classloading & Reflection

Class loaders find and load classes on demand, asking their parent first. Reflection lets code inspect and call classes at runtime, which frameworks rely on.

> **Imagine:** A new employee always asks their manager before deciding anything (parent delegation). Reflection is reading someone’s name badge and job title without being introduced.

#### Lifecycle diagram: Class Loading Lifecycle

```diagram
{"n":"L:Loading:0:0|V:Verification:1:0|PR:Preparation:2:0|RS:Resolution:2:1|IN:Initialization:1:1|US:In use:0:1|UN:!Unloaded:0:2","e":"L>V:bytes become a Class|V>PR:bytecode is safe|PR>RS:statics get defaults|RS>IN:names become references|IN>US:static blocks ran|US>UN:loader is collected"}
```

1. **Loading** – a class loader asks its parent first, then reads the .class bytes.
2. **Verification** – the JVM checks the bytecode is well formed and safe.
3. **Preparation** – static fields get default values (0, null).
4. **Resolution** – symbolic names turn into direct references.
5. **Initialization** – static initializers run once, thread-safely. A failure here gives ExceptionInInitializerError.
6. **Unloading** – only when the loader itself is garbage collected. A classic cause of leaks in redeployed apps.

### Garbage Collection

The JVM frees objects nobody references. Most objects die young, so memory is split into young and old regions. G1 and ZGC trade pauses for throughput.

> **Imagine:** A restaurant cleaner clears tables guests have left. Fast-turnover tables (young) are cleaned often; long-stay tables (old) rarely.

#### Lifecycle diagram: Object Lifecycle in GC

```diagram
{"n":"E:Eden (new):0:0|S:Survivor S0/S1:1:0|O:Old generation:2:0|R:!Reclaimed:1:1","e":"E>S:survives minor GC|S>S:age + 1|S>O:age limit|E>R:dead|O>R:major GC"}
```

1. new puts the object in Eden.
2. A minor GC copies live objects to Survivor and frees the rest.
3. Each survived GC raises the age.
4. At the age limit the object is promoted to Old.
5. A major or mixed GC cleans Old. Frequent full GCs signal a leak or undersized heap.

### Streams & Lambdas

A stream is a pipeline (filter, map, collect). Lambdas are short inline functions. Streams are lazy: nothing runs until a terminal step.

> **Imagine:** A factory conveyor belt. You can set up all the machines, but nothing moves until someone presses “collect”.

### java.time API

Immutable, thread-safe date and time types replace Date and Calendar: LocalDate, Instant, ZonedDateTime.

> **Imagine:** “Meet at 9 AM” is meaningless until you say Mumbai or New York. ZonedDateTime carries the city; LocalDateTime does not.

### Serialization

Turning an object into bytes and back. serialVersionUID checks version compatibility. Deserializing untrusted data is a security risk.

> **Imagine:** Flat-pack furniture: you can ship it and rebuild it, but only with matching instructions (version). Never assemble a box from a stranger.

### Servlet API & Lifecycle

A servlet is a Java class that handles HTTP. The container creates one instance and calls service() on many threads, so it must not keep per-user data in fields.

> **Imagine:** One receptionist (the servlet) served by many assistants (threads). If she writes a visitor’s name on her own desk, the next visitor sees it.

#### Lifecycle diagram: Servlet Lifecycle

```diagram
{"n":"L:Load class:0:0|I:init():1:0|S:service():2:0|D:!destroy():3:0","e":"L>I:create 1 instance|I>S:ready|S>S:every request|S>D:shutdown"}
```

1. **Load** – the container loads the class and builds one instance.
2. **init()** – runs once. Open shared resources here.
3. **service()** – runs on a thread for every request and routes to doGet or doPost. Keep fields free of per-user data.
4. **destroy()** – runs once at shutdown. Release resources.

### Context, Filters, Listeners, Sessions

Filters run before and after servlets (auth, logging). Listeners react to events. A session is server-side memory tied to a browser by the JSESSIONID cookie.

> **Imagine:** A filter is airport security. A session is the wristband that tells staff you already checked in.

### JSP, JSTL & Legacy Views

JSP is HTML with Java inside that compiles to a servlet. JSTL tags replace messy scriptlets. It is legacy but still met in old systems.

> **Imagine:** A letter template with blanks. The server fills the blanks, then posts it.

### JDBC: Driver to Connection

JDBC is the standard way Java talks to databases. A connection is expensive, so use a DataSource with a connection pool.

> **Imagine:** Phoning a bank takes time to dial and verify you. A pool keeps a few lines open and lends them out.

#### Lifecycle diagram: Connection Pool Lifecycle (HikariCP)

```diagram
{"n":"P:Pool (idle):0:0|B:Borrowed:1:0|U:Running SQL:2:0|R:close() called:2:1|V:Reset connection:1:1|E:!Evicted, replaced:0:2","e":"P>B:getConnection()|B>U:use|U>R:finished|R>V:rollback if open|V>P:idle again|P>E:maxLifetime reached"}
```

1. **Pool** – holds idle, already-open connections. If none is free, callers wait up to connectionTimeout and then get an exception.
2. **Borrowed** – your code owns the connection, so keep this period short.
3. **Running SQL** – statements and the transaction happen here.
4. **close()** – does not close the socket. It hands the connection back.
5. **Reset** – uncommitted work is rolled back and settings are restored.
6. **Evicted** – past maxLifetime or idle timeout, the connection is closed and a fresh one is made. A leak is a borrow that never returns.

### JDBC: Statements & Transactions

Use PreparedStatement (stops SQL injection), batch many inserts, and commit or rollback as one unit.

> **Imagine:** A bank transfer: debit and credit must both happen or neither. Otherwise money vanishes.

#### Detailed explanation

Never build SQL by joining strings: input like ' OR '1'='1 would rewrite the query (SQL injection). PreparedStatement sends values separately. Wrap related updates in one transaction.

```sql
-- BAD: "SELECT * FROM users WHERE name = '" + input + "'"
-- GOOD: SELECT * FROM users WHERE name = ?
```

```java
try (Connection c = ds.getConnection()) {
  c.setAutoCommit(false);
  try (PreparedStatement debit = c.prepareStatement(
         "UPDATE account SET bal = bal - ? WHERE id = ?");
       PreparedStatement credit = c.prepareStatement(
         "UPDATE account SET bal = bal + ? WHERE id = ?")) {
    debit.setBigDecimal(1, amt);  debit.setLong(2, from);  debit.executeUpdate();
    credit.setBigDecimal(1, amt); credit.setLong(2, to);   credit.executeUpdate();
    c.commit();
  } catch (SQLException e) { c.rollback(); throw e; }
}
```

## Phase 7: Relational Databases (PostgreSQL)

### Relational Theory & Modeling

Data lives in tables linked by keys. Normalization removes duplication so each fact is stored once.

> **Imagine:** Don’t write the customer’s address on every order slip. Store it once and let orders point to it.

### SQL DDL & Schema Objects

CREATE and ALTER define tables, types and constraints (PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK). The database itself enforces your rules.

### SELECT Mastery

Joins combine tables, subqueries and CTEs break big queries into steps, and window functions calculate across rows without collapsing them.

> **Imagine:** A bank statement’s running balance: every transaction row stays visible, yet each shows the total so far. That is a window function.

### Indexing

An index is a separate sorted structure that makes lookups fast. B-tree is the default; GIN, GiST and BRIN suit text, geometry and huge ordered data.

> **Imagine:** A book’s index at the back: jump to the page instead of reading every page. But each new page means updating the index too.

#### Detailed explanation

Without an index PostgreSQL scans the whole table (Seq Scan). A matching index lets it jump straight to the rows. Indexes speed reads but slow writes and use disk, so add them for real query patterns only.

```sql
CREATE INDEX idx_orders_cust ON orders (customer_id);
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 42;
-- Index Scan using idx_orders_cust  (instead of Seq Scan)
CREATE INDEX idx_open ON orders (created_at) WHERE status = 'OPEN'; -- partial index
```

| Index | Best for |
| --- | --- |
| **B-tree** | equality, ranges, sorting (default) |
| **GIN** | arrays, JSONB, full-text search |
| **GiST** | geometry, ranges, nearest-neighbour |
| **BRIN** | huge tables stored in natural order, such as logs |

### Transactions, MVCC & Isolation

ACID keeps data correct. MVCC keeps several versions of a row so readers never block writers. Isolation levels choose how much concurrency anomaly you accept.

> **Imagine:** Like Google Docs history: you read a snapshot while someone else writes a new version.

#### Lifecycle diagram: MVCC Row Lifecycle (PostgreSQL)

```diagram
{"n":"I:INSERT, xmin set:0:0|L:Live version:1:0|U:UPDATE:2:0|NV:New version:2:1|OV:Old version, xmax set:1:1|DD:Dead tuple:1:2|VC:!VACUUM frees space:0:2","e":"I>L:commit|L>U:other tx|U>NV:writes new copy|U>OV:stamps old copy|OV>DD:no snapshot needs it|DD>VC:autovacuum"}
```

1. **Insert** – the row records the transaction that created it (xmin).
2. **Live** – visible to snapshots taken after that commit.
3. **Update** – a new row version is written.
4. **Old version** – gets an xmax and stays visible to older snapshots.
5. **Dead** – once no running transaction can see it, it is garbage.
6. **VACUUM** – marks the space reusable. Without it tables bloat.

#### Detailed explanation

Isolation levels decide which anomalies you may see. In PostgreSQL, readers use a snapshot, so they never block writers.

| Level | Dirty read | Non-repeatable read | Phantom |
| --- | --- | --- | --- |
| **Read Committed (default)** | No | Possible | Possible |
| **Repeatable Read** | No | No | No (in PostgreSQL) |
| **Serializable** | No | No | No, may abort and need a retry |

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT balance FROM account WHERE id = 1; -- sees one stable snapshot
COMMIT;
```

### Query Planning & EXPLAIN

The planner picks the cheapest way to run a query. EXPLAIN shows the plan, EXPLAIN ANALYZE shows what actually happened.

> **Imagine:** A GPS choosing a route. EXPLAIN is the planned route; ANALYZE is the real trip with times.

### Functions, Procedures & Triggers

PL/pgSQL lets you put logic inside the database. Triggers run automatically on insert, update or delete.

### Views & Materialized Views

A view is a saved query. A materialized view stores the result for speed and must be refreshed.

> **Imagine:** A view is a live window. A materialized view is a photograph: quick to look at, but it ages.

### PostgreSQL Internals & VACUUM

Updates leave old row versions behind. VACUUM cleans these dead rows so tables do not bloat.

> **Imagine:** Old drafts pile up in a bin. VACUUM is the cleaner who empties it.

### Performance Tuning

Tune memory settings, keep statistics fresh, and watch slow queries with pg_stat_statements before changing anything.

### Replication, HA & DR

A primary sends changes to replicas for reads and failover. Backups plus WAL give point-in-time recovery.

> **Imagine:** A twin notebook that copies every line you write. If yours burns, the twin takes over.

### Security & Hardening

Least-privilege roles, TLS, row-level security, and parameterised queries to stop injection.

## Phase 8: Spring Core & Hibernate/JPA

### Spring Philosophy & IoC

Inversion of Control: the container creates and wires your objects instead of you using new everywhere.

> **Imagine:** A restaurant manager hires cooks and hands them tools. Cooks do not shop for their own knives.

#### Lifecycle diagram: Spring Bean Lifecycle

```diagram
{"n":"A:Instantiate:0:0|B:Inject deps:1:0|C:Aware callbacks:2:0|D:BPP before init:2:1|E:@PostConstruct:1:1|F:BPP after (proxy):0:1|G:!Ready to use:0:2|H:@PreDestroy:1:2|I:Destroyed:2:2","e":"A>B|B>C|C>D|D>E|E>F|F>G|G>H:context closes|H>I"}
```

1. **Instantiate** – the constructor runs.
2. **Inject** – dependencies and values are set.
3. **Aware callbacks** – the bean may receive its name or context.
4. **BeanPostProcessor** – hooks before and after init.
5. **@PostConstruct** – your start-up logic.
6. **After-init processor** – this is where AOP and @Transactional proxies are created.
7. **@PreDestroy** – cleanup on shutdown.

### Dependency Injection & Autowiring

Dependencies arrive via the constructor (preferred), setter or field. Use @Qualifier when several candidates exist. Avoid circular dependencies.

> **Imagine:** A cook who must be handed a stove at hiring (constructor) cannot start work without one, which is exactly what you want.

#### Detailed explanation

Prefer constructor injection. Fields can be final, the object can never exist half-built, and tests can pass fakes without Spring.

```java
@Service
public class OrderService {
  private final PaymentGateway gateway;
  public OrderService(PaymentGateway gateway) { // one constructor: @Autowired not needed
    this.gateway = gateway;
  }
}
```

| Style | Verdict |
| --- | --- |
| **Constructor** | Immutable, testable, recommended |
| **Setter** | Fine for optional dependencies |
| **Field (@Autowired)** | Hides dependencies, hard to test |

### AOP: Proxies & Pointcuts

Spring wraps beans in proxies to add logging, security or transactions around methods. A call from inside the same class skips the proxy.

> **Imagine:** A guard stands at the front door of the building. If you walk between rooms inside, you bypass the guard.

#### Lifecycle diagram: Transaction Lifecycle (@Transactional)

```diagram
{"n":"C:Caller:0:0|P:Proxy:1:0|M:Your method:2:0|CM:!COMMIT:3:0|RB:!ROLLBACK:3:1","e":"C>P:call|P>M:BEGIN|M>CM:returns normally|M>RB:RuntimeException"}
```

1. **Caller** – an outside bean calls the method (self-calls skip the proxy).
2. **Proxy** – gets a connection and begins the transaction.
3. **Method** – runs your logic.
4. **Commit** – on normal return.
5. **Rollback** – on RuntimeException or Error by default; use rollbackFor for checked ones.

### Spring MVC & DispatcherServlet

One front controller receives every request, finds the matching handler, runs interceptors, calls your controller and converts the result to a response.

> **Imagine:** The hotel front desk: every guest arrives there and is sent to the right department.

#### Lifecycle diagram: Spring MVC Request Flow

```diagram
{"n":"C:Client:0:0|F:Filters:1:0|DS:DispatcherServlet:2:0|HM:HandlerMapping:2:1|I:Interceptors:1:1|CT:Controller:0:1|MC:Message converter:0:2|R:!JSON response:1:2","e":"C>F:HTTP request|F>DS|DS>HM:find handler|HM>I:preHandle|I>CT|CT>MC:return value|MC>R:serialize"}
```

1. **Filters** – servlet-level work such as security and logging.
2. **DispatcherServlet** – the single front controller for all requests.
3. **HandlerMapping** – matches URL and verb to a controller method.
4. **Interceptors** – preHandle can block the request.
5. **Controller** – your method runs; arguments are bound and validated.
6. **Message converter** – Jackson turns the return object into JSON, sent back through the same layers.

### Transaction Management

@Transactional starts and ends transactions via proxies. Learn propagation (REQUIRED, REQUIRES_NEW) and note: rollback happens only for unchecked exceptions by default.

> **Imagine:** Booking flight and hotel together. If the hotel fails, the flight must cancel, but only if the system notices the failure.

#### Lifecycle diagram: Transaction Lifecycle (@Transactional)

```diagram
{"n":"C:Caller:0:0|P:Proxy:1:0|M:Your method:2:0|CM:!COMMIT:3:0|RB:!ROLLBACK:3:1","e":"C>P:call|P>M:BEGIN|M>CM:returns normally|M>RB:RuntimeException"}
```

1. **Caller** – an outside bean calls the method (self-calls skip the proxy).
2. **Proxy** – gets a connection and begins the transaction.
3. **Method** – runs your logic.
4. **Commit** – on normal return.
5. **Rollback** – on RuntimeException or Error by default; use rollbackFor for checked ones.

#### Detailed explanation

@Transactional works through a proxy. Calls from outside go through it; a call inside the same class does not. By default only unchecked exceptions cause rollback.

```java
@Service
public class TransferService {
  @Transactional(rollbackFor = Exception.class) // also roll back on checked exceptions
  public void transfer(long from, long to, BigDecimal amt) { /* debit + credit */ }

  public void batch() {
    this.transfer(1, 2, BigDecimal.TEN); // BUG: self-call skips the proxy, no transaction
  }
}
```

| Propagation | Meaning |
| --- | --- |
| **REQUIRED** | join the current transaction or start one |
| **REQUIRES_NEW** | pause the current one and start a fresh one |
| **MANDATORY** | must already be inside one, else error |
| **NEVER** | error if one exists |

### Spring JDBC & JdbcTemplate

JdbcTemplate removes connection and exception boilerplate while you still write plain SQL.

### Hibernate Architecture & Session

A Session tracks entities in a persistence context. Entity states: transient, managed, detached, removed. Hibernate spots changes (dirty checking) and writes them on flush.

> **Imagine:** A shopping cart: you add and remove things freely, and the shop only processes it at checkout (flush).

#### Lifecycle diagram: Hibernate Entity States

```diagram
{"n":"DB:Database:1:0|T:New / Transient:0:1|M:Managed:1:1|DT:Detached:2:1|RM:Removed:1:2|X:!Row deleted:2:2","e":"DB>M:find / query|T>M:persist()|M>DT:close / detach|DT>M:merge()|M>RM:remove()|RM>X:flush / commit"}
```

1. **Transient** – a plain object Hibernate knows nothing about.
2. **Managed** – inside a Session; dirty checking writes changes at flush.
3. **Detached** – the Session closed. Changes are ignored until merge().
4. **Removed** – scheduled for DELETE; the row goes at flush or commit.

#### Lifecycle diagram: Hibernate Flush & Commit Flow

```sequence
{"p":"A:Your code|S:Session|C:Persistence context|D:Database","m":"A>S:persist(order)|S>C:track entity + snapshot|A>S:order.setQty(5)|A>S:commit()|S>C:flush: dirty check|C>D:INSERT / UPDATE SQL|D>S:~rows written|S>D:COMMIT"}
```

1. persist() makes the entity Managed. With IDENTITY ids the INSERT may run at once.
2. A copy of its loaded state is kept for comparison.
3. Setters only change the object. No SQL yet.
4. commit() (or a query in AUTO flush mode) triggers a flush.
5. Dirty checking compares each entity with its snapshot.
6. Changed entities become INSERT, UPDATE and DELETE statements.
7. The database confirms the writes.
8. Only then is the transaction committed.

### Mapping: Entities & Relationships

@Entity, @Id, @OneToMany, @ManyToOne and inheritance strategies map classes to tables. Keep the owning side clear.

### Fetching, N+1 & Caching

LAZY loads data when touched; EAGER loads upfront. The N+1 problem is one query plus N more. Fix with join fetch or entity graphs. Caches avoid repeat reads.

> **Imagine:** You ask for 100 teachers, then make 100 separate trips to ask for each teacher’s students. One combined list would have been one trip.

#### Detailed explanation

With LAZY collections, looping over parents and touching each child collection fires one extra query per parent. Fetch together instead.

```java
// BAD: 1 query for teachers + N queries for students
List<Teacher> ts = em.createQuery("select t from Teacher t", Teacher.class).getResultList();
ts.forEach(t -> t.getStudents().size());

// GOOD: one query
em.createQuery("select distinct t from Teacher t join fetch t.students", Teacher.class)
  .getResultList();
```

### JPQL, HQL, Criteria & Native SQL

JPQL queries entities, Criteria builds queries in code, and native SQL is the escape hatch for database-specific features.

### Locking & Versioning

Optimistic locking uses a @Version column and fails on conflict. Pessimistic locking blocks others up front.

> **Imagine:** Two editors open the same document. Optimistic: the second save is rejected because the version moved on. Pessimistic: the file is locked while the first edits.

#### Detailed explanation

Optimistic locking assumes conflicts are rare. Hibernate adds the version to each UPDATE and fails if the row has moved on. Pessimistic locking takes a database lock immediately.

```java
@Entity
class Product {
  @Id Long id;
  @Version long version; // 5 -> 6 on each successful update
  int stock;
}
// Two users load version 5. The first saves (becomes 6).
// The second save throws OptimisticLockException: reload and retry.

em.find(Product.class, 1L, LockModeType.PESSIMISTIC_WRITE); // SELECT ... FOR UPDATE
```

### Lifecycle Callbacks & Auditing

@PrePersist, @PostLoad and listeners run on entity events. Auditing records who changed what and when; Envers keeps history.

## Phase 9: Spring Boot & Enterprise REST

### Boot Fundamentals & Auto-Configuration

Starters bring dependencies; auto-configuration creates beans based on what is on the classpath and in your config.

> **Imagine:** A furnished flat that rearranges itself depending on what you carry in. Add a database driver and it sets up a DataSource.

#### Lifecycle diagram: Spring Boot Startup

```diagram
{"n":"A:main():0:0|B:run():1:0|C:Load config:2:0|D:Create context:2:1|E:Auto-config + scan:1:1|F:Create beans:0:1|G:Start Tomcat:0:2|H:Run runners:1:2|I:!Ready:2:2","e":"A>B|B>C:profiles, yml|C>D|D>E|E>F|F>G|G>H|H>I"}
```

1. main() calls SpringApplication.run.
2. **Config** – application.yml, profiles and environment variables are loaded.
3. The ApplicationContext is created.
4. Component scan and auto-configuration register bean definitions.
5. Singleton beans are built (see Bean Lifecycle).
6. The embedded server starts on the port.
7. CommandLineRunner beans run, then the app is ready.

### Externalized Configuration

application.yml, profiles and environment variables set values without rebuilding. @ConfigurationProperties binds them to typed classes.

### Embedded Servers & Runtime Tuning

Tomcat runs inside your jar. Tune thread pools, timeouts and keep-alive for real traffic.

### Building Enterprise REST APIs

Model resources, use correct verbs and status codes, paginate, version, and make writes idempotent so a retry is safe.

> **Imagine:** Pressing the lift button twice should not call two lifts. PUT and DELETE behave that way.

#### Detailed explanation

Use the right verb and status code so clients know what happened.

| Action | Verb and path | Success | Common errors |
| --- | --- | --- | --- |
| **List** | GET /orders | 200 | 401, 403 |
| **Create** | POST /orders | 201 + Location | 400, 409 |
| **Replace** | PUT /orders/7 | 200 or 204 | 404, 409 |
| **Delete** | DELETE /orders/7 | 204 | 404 |

```java
@RestController @RequestMapping("/orders")
class OrderController {
  @PostMapping
  ResponseEntity<Order> create(@Valid @RequestBody OrderDto d) {
    Order o = service.create(d);
    return ResponseEntity.created(URI.create("/orders/" + o.getId())).body(o);
  }
}
```

### Jackson Serialization

Converts objects to JSON and back. Annotations control names and formats. Beware lazy entities and cyclic references.

### Validation & Error Handling

@Valid checks input, @ControllerAdvice handles errors in one place, and RFC 7807 gives errors a standard JSON shape.

#### Detailed explanation

Declare rules on the input, trigger them with @Valid, and translate failures into one consistent error shape in a single place.

```java
record OrderDto(@NotBlank String sku, @Min(1) int qty) {}

@RestControllerAdvice
class Errors {
  @ExceptionHandler(MethodArgumentNotValidException.class)
  ProblemDetail bad(MethodArgumentNotValidException e) {
    return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed");
  }
}
```

### Observability

Logs say what happened, metrics say how much, traces say where time went. Actuator exposes health and metrics.

> **Imagine:** A car dashboard: speed (metrics), warning light (health), trip log (traces).

### Testing Strategy

Many fast unit tests, some slice tests (@WebMvcTest, @DataJpaTest), few end-to-end. Testcontainers runs a real database in tests.

### Spring Security

Authentication is who you are; authorization is what you may do. Requests pass a filter chain. Know JWT, OAuth2, CSRF and password hashing (BCrypt).

> **Imagine:** Authentication is showing ID at the gate. Authorization is the badge that opens only some rooms.

#### Lifecycle diagram: Spring Security Filter Flow

```diagram
{"n":"R:Request:0:0|F1:Auth filter (JWT):1:0|SC:SecurityContext:2:0|AZ:Authorization:2:1|CT:!Controller:1:1|E1:!401:0:1|E3:!403:2:2","e":"R>F1|F1>SC:token valid|F1>E1:invalid|SC>AZ|AZ>CT:allowed|AZ>E3:denied"}
```

1. The filter reads the token (Authorization header).
2. Valid: the user is stored in the SecurityContext.
3. Invalid or missing: 401 Unauthorized.
4. The authorization rules check roles and paths.
5. Allowed: the controller runs. Denied: 403 Forbidden.

#### Lifecycle diagram: JWT Login & Request Flow

```sequence
{"p":"C:Client|F:Auth filter|S:Auth service|D:Database","m":"C>S:POST /login|S>D:load user|D>S:~stored BCrypt hash|S>S:hash matches?|S>C:~200 + signed JWT|C>F:GET /orders + Bearer token|F>F:check signature, expiry|F>C:~401 or continue to controller"}
```

1. **Login** – the client sends credentials once over HTTPS.
2. The user and password hash are loaded.
3. The hash is returned; the password is never stored in plain text.
4. BCrypt compares the typed password with the hash.
5. **Success** – a signed JWT with short expiry is returned.
6. Every later call carries the token in the Authorization header.
7. The filter verifies signature and expiry without touching the database.
8. Invalid gives 401; valid fills the SecurityContext and the request goes on.

#### Detailed explanation

Every request passes the SecurityFilterChain. Below, public paths are open, everything else needs a valid JWT. Disabling CSRF is acceptable only for stateless token APIs, not for cookie sessions.

```java
@Bean
SecurityFilterChain chain(HttpSecurity http) throws Exception {
  return http
    .csrf(c -> c.disable())
    .authorizeHttpRequests(a -> a
      .requestMatchers("/public/**").permitAll()
      .anyRequest().authenticated())
    .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()))
    .build();
}
```

| Code | Meaning |
| --- | --- |
| **401** | not authenticated (who are you?) |
| **403** | authenticated but not allowed |

### Data Access: Repositories, Hikari, Migrations

Spring Data repositories generate queries from method names. HikariCP pools connections. Flyway or Liquibase version your schema.

#### Lifecycle diagram: Connection Pool Lifecycle (HikariCP)

```diagram
{"n":"P:Pool (idle):0:0|B:Borrowed:1:0|U:Running SQL:2:0|R:close() called:2:1|V:Reset connection:1:1|E:!Evicted, replaced:0:2","e":"P>B:getConnection()|B>U:use|U>R:finished|R>V:rollback if open|V>P:idle again|P>E:maxLifetime reached"}
```

1. **Pool** – holds idle, already-open connections. If none is free, callers wait up to connectionTimeout and then get an exception.
2. **Borrowed** – your code owns the connection, so keep this period short.
3. **Running SQL** – statements and the transaction happen here.
4. **close()** – does not close the socket. It hands the connection back.
5. **Reset** – uncommitted work is rolled back and settings are restored.
6. **Evicted** – past maxLifetime or idle timeout, the connection is closed and a fresh one is made. A leak is a borrow that never returns.

### Messaging & Async Processing

Queues (Kafka, RabbitMQ) decouple services. The outbox pattern saves the event and data in one transaction.

> **Imagine:** Drop a letter in a post box and walk away; the postal system delivers later, even if the receiver is out.

#### Lifecycle diagram: Outbox & Event Flow (Kafka)

```sequence
{"p":"A:Service|D:Database|R:Relay|K:Kafka|C:Consumer","m":"A>D:BEGIN: save order + outbox row|A>D:COMMIT (both or neither)|R>D:poll unsent rows|R>K:publish event|K>R:~ack|R>D:mark row sent|K>C:deliver event|C>C:process idempotently"}
```

1. One local transaction writes the business row and an outbox row.
2. Commit makes both visible together.
3. A relay (poller or CDC) finds unsent events.
4. It publishes them to the broker.
5. Kafka acknowledges.
6. The row is marked sent. A crash before this causes a duplicate.
7. Consumers receive events at least once.
8. So handlers must be idempotent, for example by checking an event id.

### Caching & Scheduling

@Cacheable stores results (Redis, Caffeine) with expiry. @Scheduled runs jobs; use a lock so only one instance runs it.

### Deployment & Cloud-Native

Package as a container, use health probes, shut down gracefully, and set JVM memory to respect container limits.

#### Lifecycle diagram: Pod Lifecycle & Graceful Shutdown

```diagram
{"n":"P:Pending:0:0|S:Starting:1:0|RD:Ready:2:0|TR:Terminating (SIGTERM):2:1|DR:Drain requests:1:1|X:!Exit cleanly:0:1|K:!SIGKILL:0:2","e":"P>S:image pulled|S>RD:probes pass|RD>TR:deploy / scale-down|TR>DR:off Service|DR>X:work done|DR>K:grace period over"}
```

1. **Pending** – scheduled and the image is pulled.
2. **Starting** – the app boots; the startup probe waits for it.
3. **Ready** – the readiness probe passes and traffic arrives.
4. **Terminating** – SIGTERM is sent and the pod leaves the load balancer.
5. **Drain** – with server.shutdown=graceful Spring finishes active requests.
6. **Exit** – beans are destroyed (@PreDestroy) and the process ends.
7. **SIGKILL** – if the grace period runs out, the process is killed and open requests are cut.

### Production Debugging Playbook

Use thread dumps (jstack), heap dumps (MAT), GC logs and flame graphs to find hangs, leaks and slowness.

> **Imagine:** Like a doctor: take the pulse (CPU), an X-ray (heap dump), and a video of the heartbeat (thread dumps over time).

## Phase 10: Appendices

### A. Legacy-to-Modern Migration

javax moved to jakarta (Boot 3); XML config moved to annotations and Boot; EJB and Struts moved to Spring; Hibernate 3 to 6; Java 8 to 21 features like records, virtual threads and text blocks.

### B. Production Incident Checklist

For latency spikes, OOM, pool exhaustion, partial outages and data corruption: follow the order metrics → logs → thread/heap dumps → fix → blameless review.

### C. Capstone Project Milestones

Phase 1: JDBC CRUD with pooling and indexes. Phase 2: Hibernate, N+1 fix, optimistic locking. Phase 3: Boot REST, validation, Actuator, Flyway, async with outbox.

## Phase 11: Lifecycles & Flows (Diagrams)

### Servlet Lifecycle

The container, not you, controls when a servlet is created, used and destroyed.

> **Imagine:** One receptionist is hired once (init), serves visitors all day through many assistants (service), and is dismissed at closing (destroy).

```diagram
{"n":"L:Load class:0:0|I:init():1:0|S:service():2:0|D:!destroy():3:0","e":"L>I:create 1 instance|I>S:ready|S>S:every request|S>D:shutdown"}
```

1. **Load** – the container loads the class and builds one instance.
2. **init()** – runs once. Open shared resources here.
3. **service()** – runs on a thread for every request and routes to doGet or doPost. Keep fields free of per-user data.
4. **destroy()** – runs once at shutdown. Release resources.

### Spring MVC Request Flow

Every HTTP request travels the same path before your controller runs.

> **Imagine:** A hotel: the guest passes security (filters), the front desk (DispatcherServlet) looks up the right department, a clerk checks papers (interceptor), then the department serves them.

```diagram
{"n":"C:Client:0:0|F:Filters:1:0|DS:DispatcherServlet:2:0|HM:HandlerMapping:2:1|I:Interceptors:1:1|CT:Controller:0:1|MC:Message converter:0:2|R:!JSON response:1:2","e":"C>F:HTTP request|F>DS|DS>HM:find handler|HM>I:preHandle|I>CT|CT>MC:return value|MC>R:serialize"}
```

1. **Filters** – servlet-level work such as security and logging.
2. **DispatcherServlet** – the single front controller for all requests.
3. **HandlerMapping** – matches URL and verb to a controller method.
4. **Interceptors** – preHandle can block the request.
5. **Controller** – your method runs; arguments are bound and validated.
6. **Message converter** – Jackson turns the return object into JSON, sent back through the same layers.

### Hibernate Entity States

An entity is always in one of four states. Hibernate only tracks and saves changes in the Managed state.

> **Imagine:** A library book: new (not catalogued), on the shelf and tracked (managed), lent out untracked (detached), withdrawn (removed).

```diagram
{"n":"DB:Database:1:0|T:New / Transient:0:1|M:Managed:1:1|DT:Detached:2:1|RM:Removed:1:2|X:!Row deleted:2:2","e":"DB>M:find / query|T>M:persist()|M>DT:close / detach|DT>M:merge()|M>RM:remove()|RM>X:flush / commit"}
```

1. **Transient** – a plain object Hibernate knows nothing about.
2. **Managed** – inside a Session; dirty checking writes changes at flush.
3. **Detached** – the Session closed. Changes are ignored until merge().
4. **Removed** – scheduled for DELETE; the row goes at flush or commit.

### Spring Bean Lifecycle

The container builds each bean in a fixed order, giving you hooks at known points.

> **Imagine:** Building a car on an assembly line: frame, parts fitted, inspection, paint (proxy), road test, finally recycling.

```diagram
{"n":"A:Instantiate:0:0|B:Inject deps:1:0|C:Aware callbacks:2:0|D:BPP before init:2:1|E:@PostConstruct:1:1|F:BPP after (proxy):0:1|G:!Ready to use:0:2|H:@PreDestroy:1:2|I:Destroyed:2:2","e":"A>B|B>C|C>D|D>E|E>F|F>G|G>H:context closes|H>I"}
```

1. **Instantiate** – the constructor runs.
2. **Inject** – dependencies and values are set.
3. **Aware callbacks** – the bean may receive its name or context.
4. **BeanPostProcessor** – hooks before and after init.
5. **@PostConstruct** – your start-up logic.
6. **After-init processor** – this is where AOP and @Transactional proxies are created.
7. **@PreDestroy** – cleanup on shutdown.

### Transaction Lifecycle (@Transactional)

A proxy wraps your method: begin before it, commit or roll back after.

> **Imagine:** A cashier session: the till is opened before serving; at the end it is either confirmed or voided.

```diagram
{"n":"C:Caller:0:0|P:Proxy:1:0|M:Your method:2:0|CM:!COMMIT:3:0|RB:!ROLLBACK:3:1","e":"C>P:call|P>M:BEGIN|M>CM:returns normally|M>RB:RuntimeException"}
```

1. **Caller** – an outside bean calls the method (self-calls skip the proxy).
2. **Proxy** – gets a connection and begins the transaction.
3. **Method** – runs your logic.
4. **Commit** – on normal return.
5. **Rollback** – on RuntimeException or Error by default; use rollbackFor for checked ones.

### Thread Lifecycle

A Java thread moves between six states.

> **Imagine:** A worker: hired (NEW), working (RUNNABLE), queueing for a tool (BLOCKED), waiting for a call (WAITING), on a timed break (TIMED_WAITING), retired (TERMINATED).

```diagram
{"n":"N:NEW:0:1|R:RUNNABLE:1:1|BL:BLOCKED:2:0|W:WAITING:2:1|TW:TIMED_WAITING:2:2|TM:!TERMINATED:1:2","e":"N>R:start()|R>BL:needs lock|BL>R:got lock|R>W:wait() / join()|W>R:notify()|R>TW:sleep(ms)|TW>R:time up|R>TM:run() ends"}
```

1. **NEW** – created but not started.
2. **RUNNABLE** – running or ready to run.
3. **BLOCKED** – waiting for a synchronized lock held by another thread.
4. **WAITING** – waits until another thread signals it.
5. **TIMED_WAITING** – waits for a limited time.
6. **TERMINATED** – finished; it cannot be restarted.

### JVM Execution Pipeline

Source code becomes bytecode, then the JVM runs it and optimises hot parts.

> **Imagine:** Translating a book once into a universal language, then interpreters read it; popular chapters get a fast professional translation (JIT).

```diagram
{"n":"A:Hello.java:0:0|B:javac:1:0|C:.class bytecode:2:0|D:Class loader:2:1|E:Interpreter:1:1|F:JIT compiler:0:1|G:!Machine code:0:2","e":"A>B|B>C:compile|C>D:load, verify|D>E:run|E>F:hot method|F>G:optimise"}
```

1. javac compiles source into platform-neutral bytecode.
2. The class loader loads, verifies and initialises the class.
3. The interpreter starts running immediately.
4. Methods called often are marked hot.
5. The JIT compiles hot methods into native code, so long-running apps speed up.

### Object Lifecycle in GC

Most objects die young. The heap is split so cleanups are cheap.

> **Imagine:** A school: most notes are binned within the day (Eden). Notes that survive several clean-ups are filed in the archive (Old).

```diagram
{"n":"E:Eden (new):0:0|S:Survivor S0/S1:1:0|O:Old generation:2:0|R:!Reclaimed:1:1","e":"E>S:survives minor GC|S>S:age + 1|S>O:age limit|E>R:dead|O>R:major GC"}
```

1. new puts the object in Eden.
2. A minor GC copies live objects to Survivor and frees the rest.
3. Each survived GC raises the age.
4. At the age limit the object is promoted to Old.
5. A major or mixed GC cleans Old. Frequent full GCs signal a leak or undersized heap.

### Spring Boot Startup

main() starts a fixed sequence from configuration to a running web server.

> **Imagine:** Opening a shop: read the rules, build the shelves, stock the goods, unlock the door, then call the staff to their stations.

```diagram
{"n":"A:main():0:0|B:run():1:0|C:Load config:2:0|D:Create context:2:1|E:Auto-config + scan:1:1|F:Create beans:0:1|G:Start Tomcat:0:2|H:Run runners:1:2|I:!Ready:2:2","e":"A>B|B>C:profiles, yml|C>D|D>E|E>F|F>G|G>H|H>I"}
```

1. main() calls SpringApplication.run.
2. **Config** – application.yml, profiles and environment variables are loaded.
3. The ApplicationContext is created.
4. Component scan and auto-configuration register bean definitions.
5. Singleton beans are built (see Bean Lifecycle).
6. The embedded server starts on the port.
7. CommandLineRunner beans run, then the app is ready.

### Spring Security Filter Flow

Each request passes the security filter chain before reaching a controller.

> **Imagine:** A concert: ticket check (authentication), seat-zone check (authorization), then you enter.

```diagram
{"n":"R:Request:0:0|F1:Auth filter (JWT):1:0|SC:SecurityContext:2:0|AZ:Authorization:2:1|CT:!Controller:1:1|E1:!401:0:1|E3:!403:2:2","e":"R>F1|F1>SC:token valid|F1>E1:invalid|SC>AZ|AZ>CT:allowed|AZ>E3:denied"}
```

1. The filter reads the token (Authorization header).
2. Valid: the user is stored in the SecurityContext.
3. Invalid or missing: 401 Unauthorized.
4. The authorization rules check roles and paths.
5. Allowed: the controller runs. Denied: 403 Forbidden.

### Connection Pool Lifecycle (HikariCP)

A connection is opened once, lent out many times and replaced when old. close() on a pooled connection only returns it.

> **Imagine:** A library with a few lent-out laptops: you borrow one, use it, hand it back to be wiped and shelved. Very old laptops are retired and replaced.

```diagram
{"n":"P:Pool (idle):0:0|B:Borrowed:1:0|U:Running SQL:2:0|R:close() called:2:1|V:Reset connection:1:1|E:!Evicted, replaced:0:2","e":"P>B:getConnection()|B>U:use|U>R:finished|R>V:rollback if open|V>P:idle again|P>E:maxLifetime reached"}
```

1. **Pool** – holds idle, already-open connections. If none is free, callers wait up to connectionTimeout and then get an exception.
2. **Borrowed** – your code owns the connection, so keep this period short.
3. **Running SQL** – statements and the transaction happen here.
4. **close()** – does not close the socket. It hands the connection back.
5. **Reset** – uncommitted work is rolled back and settings are restored.
6. **Evicted** – past maxLifetime or idle timeout, the connection is closed and a fresh one is made. A leak is a borrow that never returns.

### Class Loading Lifecycle

A class goes through fixed phases before its code can run, and each phase can fail in its own way.

> **Imagine:** Opening a new shop: receive the goods (load), inspect them (verify), shelve them (prepare), label every shelf (resolve), then open (initialize).

```diagram
{"n":"L:Loading:0:0|V:Verification:1:0|PR:Preparation:2:0|RS:Resolution:2:1|IN:Initialization:1:1|US:In use:0:1|UN:!Unloaded:0:2","e":"L>V:bytes become a Class|V>PR:bytecode is safe|PR>RS:statics get defaults|RS>IN:names become references|IN>US:static blocks ran|US>UN:loader is collected"}
```

1. **Loading** – a class loader asks its parent first, then reads the .class bytes.
2. **Verification** – the JVM checks the bytecode is well formed and safe.
3. **Preparation** – static fields get default values (0, null).
4. **Resolution** – symbolic names turn into direct references.
5. **Initialization** – static initializers run once, thread-safely. A failure here gives ExceptionInInitializerError.
6. **Unloading** – only when the loader itself is garbage collected. A classic cause of leaks in redeployed apps.

### HashMap put() Flow

Each put() follows the same decision path, which explains both its speed and the hashCode/equals rules.

> **Imagine:** A hotel: hash picks the corridor, you check each locker in it, and equals decides whether it is your bag or a new one.

```diagram
{"n":"K:put(k, v):0:0|H:hash(k):1:0|B:Bucket index:2:0|EM:Bucket empty?:2:1|EQ:equals() match?:1:1|RP:!Replace value:0:1|NW:!Add new node:2:2|RZ:Resize check:1:2","e":"K>H|H>B:spread bits|B>EM:hash & (n-1)|EM>NW:empty|EM>EQ:occupied|EQ>RP:same key|EQ>NW:different key|NW>RZ:over 75%?"}
```

1. **hash** – hashCode() is mixed so high bits also matter.
2. **Index** – the bucket is chosen with hash & (length-1).
3. **Empty bucket** – the new node is placed straight in.
4. **Occupied** – every node in the bucket is compared with equals().
5. **Same key** – only the value is replaced.
6. **Different key** – the node is appended; a chain of 8 or more becomes a tree.
7. **Resize** – above 75% full the table doubles and entries are re-spread.

### MVCC Row Lifecycle (PostgreSQL)

An UPDATE never edits a row in place. It writes a new version and leaves the old one until VACUUM removes it.

> **Imagine:** Editing a shared document by saving new copies. Readers still open the old copy; a cleaner later bins copies nobody is reading.

```diagram
{"n":"I:INSERT, xmin set:0:0|L:Live version:1:0|U:UPDATE:2:0|NV:New version:2:1|OV:Old version, xmax set:1:1|DD:Dead tuple:1:2|VC:!VACUUM frees space:0:2","e":"I>L:commit|L>U:other tx|U>NV:writes new copy|U>OV:stamps old copy|OV>DD:no snapshot needs it|DD>VC:autovacuum"}
```

1. **Insert** – the row records the transaction that created it (xmin).
2. **Live** – visible to snapshots taken after that commit.
3. **Update** – a new row version is written.
4. **Old version** – gets an xmax and stays visible to older snapshots.
5. **Dead** – once no running transaction can see it, it is garbage.
6. **VACUUM** – marks the space reusable. Without it tables bloat.

### JWT Login & Request Flow

The server signs a token at login and later trusts it only if the signature and expiry check out.

> **Imagine:** A festival wristband: issued once at the gate after ID check, then staff just inspect the band.

```sequence
{"p":"C:Client|F:Auth filter|S:Auth service|D:Database","m":"C>S:POST /login|S>D:load user|D>S:~stored BCrypt hash|S>S:hash matches?|S>C:~200 + signed JWT|C>F:GET /orders + Bearer token|F>F:check signature, expiry|F>C:~401 or continue to controller"}
```

1. **Login** – the client sends credentials once over HTTPS.
2. The user and password hash are loaded.
3. The hash is returned; the password is never stored in plain text.
4. BCrypt compares the typed password with the hash.
5. **Success** – a signed JWT with short expiry is returned.
6. Every later call carries the token in the Authorization header.
7. The filter verifies signature and expiry without touching the database.
8. Invalid gives 401; valid fills the SecurityContext and the request goes on.

### Hibernate Flush & Commit Flow

Changes are collected in memory and sent to the database later, in one batch, at flush.

> **Imagine:** Shopping: items go in the basket as you pick them; the till only rings up at checkout.

```sequence
{"p":"A:Your code|S:Session|C:Persistence context|D:Database","m":"A>S:persist(order)|S>C:track entity + snapshot|A>S:order.setQty(5)|A>S:commit()|S>C:flush: dirty check|C>D:INSERT / UPDATE SQL|D>S:~rows written|S>D:COMMIT"}
```

1. persist() makes the entity Managed. With IDENTITY ids the INSERT may run at once.
2. A copy of its loaded state is kept for comparison.
3. Setters only change the object. No SQL yet.
4. commit() (or a query in AUTO flush mode) triggers a flush.
5. Dirty checking compares each entity with its snapshot.
6. Changed entities become INSERT, UPDATE and DELETE statements.
7. The database confirms the writes.
8. Only then is the transaction committed.

### Outbox & Event Flow (Kafka)

Save the data and the event together, then publish the event afterwards, so neither is ever lost.

> **Imagine:** Write a letter and put the copy in your outbox tray in one motion. A courier later takes trays to the post office.

```sequence
{"p":"A:Service|D:Database|R:Relay|K:Kafka|C:Consumer","m":"A>D:BEGIN: save order + outbox row|A>D:COMMIT (both or neither)|R>D:poll unsent rows|R>K:publish event|K>R:~ack|R>D:mark row sent|K>C:deliver event|C>C:process idempotently"}
```

1. One local transaction writes the business row and an outbox row.
2. Commit makes both visible together.
3. A relay (poller or CDC) finds unsent events.
4. It publishes them to the broker.
5. Kafka acknowledges.
6. The row is marked sent. A crash before this causes a duplicate.
7. Consumers receive events at least once.
8. So handlers must be idempotent, for example by checking an event id.

### Pod Lifecycle & Graceful Shutdown

On deploy or scale-down the platform stops sending traffic first and kills the app only after in-flight work finishes.

> **Imagine:** A shop closing: lock the entrance, serve people already inside, then switch the lights off.

```diagram
{"n":"P:Pending:0:0|S:Starting:1:0|RD:Ready:2:0|TR:Terminating (SIGTERM):2:1|DR:Drain requests:1:1|X:!Exit cleanly:0:1|K:!SIGKILL:0:2","e":"P>S:image pulled|S>RD:probes pass|RD>TR:deploy / scale-down|TR>DR:off Service|DR>X:work done|DR>K:grace period over"}
```

1. **Pending** – scheduled and the image is pulled.
2. **Starting** – the app boots; the startup probe waits for it.
3. **Ready** – the readiness probe passes and traffic arrives.
4. **Terminating** – SIGTERM is sent and the pod leaves the load balancer.
5. **Drain** – with server.shutdown=graceful Spring finishes active requests.
6. **Exit** – beans are destroyed (@PreDestroy) and the process ends.
7. **SIGKILL** – if the grace period runs out, the process is killed and open requests are cut.

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