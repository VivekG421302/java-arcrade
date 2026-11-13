# PART 1: THE RUST ROADMAP

## Module 1: Ownership, Borrowing & The Memory Model

### Overview – Why Rust is different (read this first)

**The problem:** Programs keep data in the computer’s memory. Two old ways exist to look after that memory, and both hurt. In C and C++ the programmer frees memory by hand, and one slip crashes the program or opens a security hole. In Java, Python or Go a hidden cleaner (the garbage collector) frees memory for you, but it uses extra memory and sometimes pauses the program to do its work. **The fix:** Rust keeps a short list of rules about who owns each piece of data. The compiler checks those rules before the program ever runs. **The twist:** if the rules are broken, the program simply does not compile, so whole families of bugs never reach your users.

> **Imagine:** A restaurant kitchen. In the C way, every cook cleans their own station and sometimes forgets. In the Java way, a cleaner walks around and occasionally blocks the kitchen. In the Rust way, the head chef checks the rules before service starts: no dish is left without exactly one person responsible for it.

```diagram
{"n":"A:You write Rust code:0:0|B:Compiler checks the ownership rules:1:0|C:Rules broken - fix it now:1:1|D:!Fast program with no garbage collector:2:0","e":"A>B:cargo build|B>C:error message|C>A:edit|B>D:rules satisfied"}
```

1. **Write** the code as you normally would.
2. **The compiler** reads it and checks who owns what, and who may read or change it.
3. **If a rule is broken**, you get a clear error before anything runs. Fix it and try again.
4. **If everything passes**, you get a fast program that frees memory at exactly the right moment, with no cleaner running in the background.

| | C / C++ | Java / Python / Go | Rust |
| --- | --- | --- | --- |
| Who frees memory | You, by hand | A garbage collector | The compiler inserts the cleanup |
| Typical bug | Crash, leak, security hole | Random pauses, higher memory use | A compile error you must fix first |
| Speed | Very fast | Fast, with pauses | Very fast, no pauses |
| When a mistake is found | After release, in production | Mostly at run time | Before the program runs |

**How to read this module.** Every chapter has two layers. The part called **In plain English** explains the idea with a story, a picture and a small table. Below it, **The full technical detail** is the complete engineering syllabus for people who want everything. Read the top layer first; the second layer will then make sense.

### Chapter 1.1: Memory Layout — Stack vs. Heap

#### In plain English

**The problem:** A program needs two kinds of room. Small things that live briefly (a number, a counter) and big or growing things (a list of a million names, a downloaded file). One storage style cannot be best for both. **The fix:** the computer offers two places. The **stack** is a tidy pile that is extremely fast. The **heap** is a big warehouse for things whose size is not known in advance or which must live longer. **The twist:** in Rust you never clean the warehouse yourself. When the owner of a heap item goes out of scope, Rust frees it at that exact moment.

> **Imagine:** Your desk and a warehouse. The desk is small and quick: you put a paper on top and take it off again when the job is done. The warehouse is huge, but you need a ticket (a pointer) with the shelf number to find your box.

```diagram
{"n":"A:Function starts:0:0|B:Small values go on the stack:1:0|C:Big or growing data goes on the heap:2:0|D:Stack keeps a pointer to it:2:1|E:Function ends:1:1|F:!Stack cleared and heap freed:0:1","e":"A>B:push a frame|B>C:Box or Vec or String|C>D:ticket with the address|D>E:work is done|E>F:Drop runs automatically"}
```

| | Stack (the desk) | Heap (the warehouse) |
| --- | --- | --- |
| Speed | Extremely fast | Slower, must find free space |
| Size known at compile time? | Yes | Not needed |
| Who cleans up | Automatic when the function ends | The owner, automatically via `Drop` |
| Typical contents | Numbers, booleans, small structs, pointers | String text, Vec items, Box contents |
| Danger in C | Overflow from endless recursion | Leaks and double frees |

Here is how big common things are on a 64-bit machine. A `String` is just three numbers on the stack (where the text is, how much room is reserved, how long it is). The text itself is on the heap.

| Type | Size on the stack | What it holds |
| --- | --- | --- |
| `i32` | 4 bytes | the number itself |
| `u64` | 8 bytes | the number itself |
| `Box<i32>` | 8 bytes | one pointer to the heap |
| `&str` | 16 bytes | pointer plus length |
| `String` or `Vec<T>` | 24 bytes | pointer, capacity, length |
| `()` | 0 bytes | nothing: it only carries type information |

```rust
use std::mem::size_of;

struct Noisy(&'static str);
impl Drop for Noisy {
    fn drop(&mut self) { println!("freeing {}", self.0); }
}

fn main() {
    println!("i32={} Box<i32>={} &str={} String={} ()={}",
        size_of::<i32>(), size_of::<Box<i32>>(), size_of::<&str>(),
        size_of::<String>(), size_of::<()>());
    let _a = Noisy("first");
    let _b = Noisy("second");
    println!("end of main");
}
// Prints "end of main", then "freeing second", then "freeing first":
// locals are dropped in reverse order of creation.
```

**Rules to remember:** every value has exactly one owner; when the owner’s scope ends the value is dropped; locals drop in reverse order, struct fields in declaration order.

#### The full technical detail


**Low-Level Mechanics & Internals**
- Memory layout of a Rust process: text segment, read-only data, initialized/uninitialized data (BSS), heap, and stack segments
- Stack allocation mechanics: LIFO discipline, fixed-size frames, pointer-bump allocation, zero-cost deallocation on frame pop
- Stack frame anatomy: return address, saved base pointer, local variables, spill slots, red zone (on x86-64 System V ABI)
- Heap allocation mechanics: global allocator interface (`std::alloc::GlobalAlloc`), `malloc`/`free` vs. jemalloc vs. mimalloc vs. system allocator
- `Box<T>` as the heap primitive: `Box::new` allocation path, `Drop` deallocation, double indirection semantics
- Value size determinism: `std::mem::size_of`, `size_of_val`, `align_of`, `Layout` struct and its `size`/`align` fields
- Zero-sized types (ZSTs): `()` as a ZST, `PhantomData<T>`, why ZSTs consume no memory but carry type information
- Dynamically sized types (DSTs): slices `[T]`, trait objects `dyn Trait`, fat pointers (data pointer + length or vtable pointer)
- Struct layout and reprs: default Rust repr (non-deterministic field ordering, reordering for padding optimization), `#[repr(C)]`, `#[repr(packed)]`, `#[repr(align(N))]`
- Padding, alignment requirements, and cache-line effects (64-byte alignment, false sharing adjacent fields)
- Memory overhead of heap allocation: allocator metadata, alignment waste, fragmentation (external vs. internal)
- Copying vs. moving large values: memcpy cost of stack-to-stack moves for big structs, when to box large values
- Escape analysis absence in Rust: no JIT, allocation is explicit; allocation happens at the `Box::new`/`Vec::push`/etc. call site
- Allocator APIs: `GlobalAlloc` trait contract (`alloc`, `dealloc`, `realloc`, `alloc_zeroed`), implementing a custom allocator, `#[global_allocator]` attribute
- Stack overflow mechanics: guard pages, `ulimit -s`, recursion depth limits, stacker/coroutine-based workarounds

**Theoretical Rules & Contracts**
- Stack rule: every value has exactly one owner, and the owner lives in a scope; deallocation is deterministic at scope exit (RAII)
- Heap rule: heap memory is owned indirectly; when the owning stack value drops, the heap allocation is freed exactly once
- `Drop` trait contract: deterministic destructor semantics, drop order of struct fields (declaration order), drop order of local variables (reverse declaration order)
- `ManuallyDrop<T>`: suppressing automatic drop, taking responsibility for deallocation
- `mem::forget`: intentionally leaking memory, when leaking is a valid design decision
- Deterministic destruction guarantee: no garbage collector, no finalizers, no non-deterministic collection pauses

**Production Edge Cases & Bugs**
- Holding a large struct by value in async blocks causing state machines to balloon in size; boxing select fields of a future to shrink it
- Accidentally cloning multi-gigabyte buffers per request due to implicit `Vec<T>: Clone` on hot paths
- Stack overflow from unbounded recursion on attacker-controlled input depth (e.g., deeply nested JSON) — mitigation via iterative parsers or recursion limits
- Memory bloat from `Vec::with_capacity` over-reservation vs. repeated reallocation of `push` loops — profiling with capacity growth doubling strategy
- Leaking via `mem::forget` in FFI boundaries (passing ownership to C) and forgetting to document the contract
- `#[repr(packed)]` causing unaligned access UB when taking references to packed fields — the compiler error and the safe workaround (`addr_of!` + `read_unaligned`)

**Interview Trivia & Idiomatic Patterns**
- Q: "Why does Rust not need a garbage collector?" — Ownership + RAII give deterministic, compile-time-verified memory management with zero runtime cost.
- Q: "What is the overhead of `Box<T>` vs `T` on the stack?" — One pointer indirection (8 bytes) plus heap allocator bookkeeping; the value itself is identical.
- Idiomatic: prefer borrowing (`&T`) over cloning in function signatures; take `&[T]` or `&str` instead of `Vec<T>`/`String` when only reading
- Idiomatic: `Vec::with_capacity(n)` when size is known; `String::with_capacity` for building strings
- Unidiomatic anti-pattern: returning `String` from functions that compute into an owned buffer when a caller-provided `&mut String` or `fmt::Write` sink would avoid allocation
- Pattern: object pool and arena allocation (`bumpalo`) for high-throughput services to eliminate allocator contention under multithreading

### Chapter 1.2: Ownership & Move Semantics

#### In plain English

**The problem:** If two variables both think they own the same heap data, both will try to free it, and the second free corrupts memory (a “double free”). **The fix:** Rust lets only one variable own a value at a time. Writing `let b = a;` does not copy a heavy value: it hands it over, and `a` can no longer be used. **The twist:** small simple values such as numbers are cheap, so they are copied instead and both variables keep working. If you really want a second heavy copy you ask for it by name with `.clone()`.

> **Imagine:** A house key. If you give your only key to a friend, you cannot open the door any more. If you want both of you to have a key, you must have a copy cut, which costs money. That is `clone()`.

```diagram
{"n":"A:let a = String::from hi:0:0|B:let b = a  move:1:0|C:a is now unusable:2:0|D:b owns the text:1:1|E:!b leaves scope and text is freed once:2:1","e":"A>B:ownership moves|B>C:compile error if used|B>D:same heap data|D>E:one single free"}
```

| Idea | What happens | Example types | Cost |
| --- | --- | --- | --- |
| **Move** | Ownership is handed over, the old name dies | `String`, `Vec`, `Box` | Almost free (copies a few bytes) |
| **Copy** | A bitwise copy, both names stay valid | `i32`, `f64`, `bool`, `char` | Free |
| **Clone** | You ask for a deep copy explicitly | `String`, `Vec` | Allocates and copies all data |
| **Borrow** | Lend it without giving it away | `&String`, `&[i32]` | Free (next chapter) |

```rust
fn consume(s: String) { println!("got {s}"); }

fn main() {
    let a = String::from("hi");
    let b = a.clone();      // an explicit second copy
    consume(a);             // `a` is moved into the function
    println!("{b}");        // fine: b is its own String
    // println!("{a}");     // error: borrow of moved value: `a`
}
```

**Rules to remember:** assignment and function calls move non-`Copy` values. After a move the old name is off limits. Use `&` to lend, `.clone()` to duplicate, and `mem::take` or `mem::replace` to move something out of a place and leave a valid stand-in behind.

#### The full technical detail


**Low-Level Mechanics & Internals**
- Ownership as a compile-time static analysis: the borrow checker (NLL — Non-Lexical Lifetimes, and Polonius-era extensions) tracking loans through the MIR (Mid-level IR)
- Move semantics: bitwise copy of the value + invalidation of the source; no runtime "move" occurs — it's a copy plus a compiler-enforced unusability of the source
- Types that are `Copy`: all scalar primitives, tuples/arrays/structs of `Copy` types; `Copy` as a marker trait with no methods
- Why `String` is not `Copy`: heap buffer indirection — copying would imply either double-free (shallow) or expensive allocation (deep); ownership forbids the shallow copy
- `Clone` trait vs `Copy`: explicit deep-clone protocol, `Clone::clone` contract, `#[derive(Clone)]` codegen
- Moves out of collections: `Vec::into_iter` vs `drain`, `mem::take`, `mem::replace`, `mem::swap` — leaving valid placeholders
- Moves in control flow: partial moves out of structs, moving out of enums via match bindings, conditional move analysis
- `Copy` elision and implicit copies on use — when the compiler copies vs. moves
- Moves and panics: `catch_unwind` semantics, poisoning effects on Mutex state
- `Pin<P>` and structural pinning: why moves are forbidden for self-referential structs (async state machines), `Unpin` auto-trait, pinned projections

**Theoretical Rules & Contracts**
- Ownership rules (the three laws): each value has one owner; only one owner at a time; owner leaves scope → value dropped
- Move rule: a value can be moved only if it is not borrowed; moves invalidate the source binding (unless `Copy`)
- NLL: borrows end at last use, not end of scope; flow-sensitive analysis through control-flow graphs
- Borrow rule for moves: cannot move while an outstanding reference exists; two-phase borrows for method-call desugaring
- Drop glue: automatically generated recursive drop of fields; drop-check (`dropck`) ensuring no lifetime-dependent field outlives its data
- `#[may_dangle]` and `dropck_eyepatch`: advanced soundness for generic containers

**Production Edge Cases & Bugs**
- Partial-move compile errors when refactoring struct-heavy domain code; resolving via restructuring, borrowing, or `mem::take`
- Holding a guard type (e.g., `MutexGuard`) across `.await` points causing future non-`Send` errors — the classic async trap
- Accidental moves of `Arc` clones into closures defeating reference-count sharing semantics
- Panic-safety: destructors observing broken invariants after a mid-function panic (e.g., half-moved vector) — `catch_unwind` at FFI/`spawn` boundaries
- `Pin` misuse: moving out of a `Pin<Box<T>>` where `T: !Unpin` — soundness hazard, `unsafe` projection requirements

**Interview Trivia & Idiomatic Patterns**
- Q: "Is a move a memcpy?" — Yes at runtime for the value; the semantic difference (invalidation) exists only in the compiler's model.
- Q: "Why can't I move out of a `Vec` by index?" — Because the vector would have a hole; use `swap_remove`, `drain`, or `into_iter`.
- Idiomatic: implement `Copy` for small plain-data types; never implement `Copy` for heap-owning types
- Idiomatic: accept `impl Into<String>`/`impl Into<PathBuf>` in public APIs to give callers flexibility
- Anti-pattern: clone-heavy code to appease the borrow checker without re-examining ownership flow (sign of architectural debt)
- Pattern: "newtype + move" API design consuming the builder by-value in terminal methods

### Chapter 1.3: Borrowing & References

#### In plain English

**The problem:** Often you only want to look at data, or change it briefly, without taking ownership. But if two parts of a program change the same thing at the same time, or one reads while another changes it, you get bugs that are very hard to find (data races, crashes while looping over a list that is changing). **The fix:** borrowing with one simple rule. At any moment you may have **either many readers or exactly one writer, never both**. **The twist:** the compiler checks this before running, so these bugs are impossible in safe Rust.

> **Imagine:** A shared whiteboard. Any number of people may stand and read it. But when someone picks up the marker to edit, everybody else must step back until they put it down.

```diagram
{"n":"A:You need the data:0:0|B:Only read it:1:0|C:Change it:1:1|D:!Take &T - many allowed at once:2:0|E:!Take &mut T - only one at a time:2:1","e":"A>B|A>C|B>D:shared borrow|C>E:exclusive borrow"}
```

| | `&T` (shared borrow) | `&mut T` (exclusive borrow) |
| --- | --- | --- |
| Plain meaning | Read-only view | Permission to change |
| How many at once | As many as you like | Exactly one, and no `&T` at the same time |
| Can change the value | No | Yes |
| Compare with | Reading a document | Holding the only editing pen |

```rust
fn total(items: &[i32]) -> i32 { items.iter().sum() }   // only reads
fn add_one(items: &mut Vec<i32>) { items.push(1); }     // changes it

fn main() {
    let mut v = vec![1, 2, 3];
    println!("{}", total(&v));   // lend for reading
    add_one(&mut v);             // lend for changing
    let first = &v[0];           // a reader...
    // v.push(4);                // error: cannot borrow `v` as mutable while `first` is in use
    println!("{first}");
}
```

**Good habit:** accept `&str` instead of `&String` and `&[T]` instead of `&Vec<T>` in function arguments. Callers can pass more kinds of values, and nothing is copied.

#### The full technical detail


**Low-Level Mechanics & Internals**
- `&T` immutable reference: a fat-or-thin pointer with provenance metadata; no runtime cost over raw pointers
- `&mut T` mutable reference: exclusive access guarantee, aliasing model (Stacked Borrows / Tree Borrows as operational semantics for Miri)
- Reference validity invariants: aligned, non-null, dereferenceable for the pointee size for the reference's lifetime
- Reborrowing: implicit reborrow `&mut *r` in function calls, why `&mut x` passed to a function doesn't move the original
- Deref coercion: `&String` → `&str`, `&Vec<T>` → `&[T]`, `&Box<T>` → `&T`; the `Deref` trait and coercion sites (function args, method receivers)
- `DerefMut` and mutable coercion chains; `DerefPure` (future) considerations
- Interior mutability concept: mutating through `&T` — the safe escape hatch from exclusivity, implemented via `UnsafeCell`
- `UnsafeCell<T>` as the primitive: opt-out of immutability guarantees, foundation of `Cell`, `RefCell`, `Mutex`, atomics
- `Cell<T>`: move-in/move-out of values without references, only for `Copy` types via `get`, runtime-free (no checks, no overhead)
- `RefCell<T>`: borrow flag runtime checking (`BorrowError`/`BorrowMutError`), `borrow()`/`borrow_mut()`, `try_borrow` variants
- `Ref` and `RefMut` guard types: dynamic borrowing with drop-flag release, `map` and `filter_map` for splitting
- Borrowing patterns in APIs: slice splitting (`split_at_mut`), iterator borrow inversions, the "clone-on-write with borrowing" hybrid (`Cow`)
- Raw pointers `*const T`/`*mut T`: no guarantees, casting from references, `addr_of!`/`addr_of_mut!` macros to avoid creating invalid intermediate references

**Theoretical Rules & Contracts**
- The aliasing rule (core borrowing contract): any number of `&T` OR exactly one `&mut T`, never both, never more than one `&mut`
- References must always be valid: no dangling references, no null references (unlike raw pointers or C++ references to temporaries)
- Exclusivity of `&mut`: the foundation for optimization (no-alias assumption enabling LLVM optimizations)
- Lifetime parameterization: every reference carries an inferred or explicit lifetime
- Variance: `&'a T` covariant in `'a` and `T`; `&'a mut T` covariant in `'a` but invariant in `T` — implications for subtyping
- Invariance of interior mutability wrappers: `Cell<T>`/`RefCell<T>`/`Mutex<T>` invariant in `T`
- Higher-ranked trait bounds: `for<'a> fn(&'a T)` — universally quantified lifetimes in trait bounds

**Production Edge Cases & Bugs**
- `RefCell` double-borrow panics in observer/callback patterns — using `try_borrow` and re-entrancy queues
- Holding `RefCell` borrows across closures that re-enter the same cell (graph algorithms, UI trees)
- Sending `&mut` into a spawned thread scoped with `std::thread::scope` — ensuring join before return
- `Deref` abuse anti-pattern: implementing `Deref` to fake inheritance chains, confusing API consumers
- Borrow-checker fights when storing references in structs that live longer than the data — the cue to switch to owned data or indices (ECS pattern, arena + handle pattern)
- Temporary lifetime extension pitfalls: `let x = &String::new();` — temporaries dropped at end of statement; rvalue static promotion rules for constants

**Interview Trivia & Idiomatic Patterns**
- Q: "Why is `&mut` exclusive?" — Enables aliasing-based optimizations and data-race freedom; guarantees no concurrent mutation observation.
- Q: "`Cell` vs `RefCell`?" — `Cell` moves values in/out (for `Copy` or with `replace`), zero overhead; `RefCell` hands out references with runtime borrow tracking. Neither is thread-safe; `Send` but not `Sync`.
- Idiomatic: prefer `&str`/`&[T]` in function signatures over `String`/`Vec`
- Idiomatic: use `Cow<'_, str>` when a function usually borrows but sometimes must own
- Pattern: splitting borrows with `split_at_mut`, field-level disjoint borrowing, `iter_mut().zip()`
- Anti-pattern: `unsafe { &mut *(r as *mut T) }` to "fix" borrow errors — almost always hides UB

### Chapter 1.4: Lifetimes

#### In plain English

**The problem:** A reference points at data owned by somebody else. If the owner goes away first, the reference points at nothing (a “dangling pointer”), a classic cause of crashes and exploits. **The fix:** every reference has a lifetime: the stretch of the program during which the data it points to is guaranteed to still exist. The compiler checks that no reference outlives its data. **The twist:** most of the time you never write lifetimes. The compiler works them out. You only add a small label like `'a` when a function takes several references and returns one, so the compiler needs to be told which input the answer comes from.

> **Imagine:** A library book with a due date. A note that quotes the book must be thrown away before the book is returned. A note that outlives the book would quote something that no longer exists.

```diagram
{"n":"A:Book data created:0:0|B:Reference taken:1:0|C:Reference used:2:0|D:Data dropped:2:1|E:!OK reference is gone first:3:0|F:Reference used again:1:1|G:!Compile error - dangling:0:1","e":"A>B|B>C|C>E:last use before drop|C>D:data goes out of scope|D>F|F>G:rejected"}
```

| Situation | Do you write a lifetime? | Why |
| --- | --- | --- |
| One reference in, one reference out | No | The output must come from that input |
| A method with `&self` returning a reference | No | The output is tied to `self` |
| Two references in, one reference out | Yes, `'a` | The compiler must be told which one |
| A struct that stores a reference | Yes, `struct S<'a>` | The struct cannot outlive what it borrows |
| `'static` | Rarely | Data that lives for the whole program, such as string literals |

```rust
// 'a says: the answer lives no longer than BOTH inputs.
fn longest<'a>(a: &'a str, b: &'a str) -> &'a str {
    if a.len() > b.len() { a } else { b }
}

fn main() {
    let x = String::from("hello");
    let y = String::from("hi");
    println!("{}", longest(&x, &y));
}
```

**Rule of thumb:** when the compiler says “missing lifetime specifier”, ask “which input does my returned reference come from?” and name it. If a lifetime gets painful, return an owned value (`String`) instead; a small copy is often better than a complicated borrow.

#### The full technical detail


**Low-Level Mechanics & Internals**
- Lifetimes as compile-time static analysis regions: not scopes in the source, but sets of points in the control-flow graph (NLL)
- Lifetime parameter syntax: `'a`, `'static`, higher-ranked `for<'a>`, lifetime bounds `'a: 'b` (outlives)
- Lifetime elision rules (the three rules): each elided input gets its own lifetime; if exactly one input, output gets that lifetime; if `&self`/`&mut self`, output gets self's lifetime
- Where elision fails and explicit annotation is required: multiple input references with related outputs, `fn foo<'a, 'b>(x: &'a str, y: &'b str) -> &'a str`
- Struct lifetime parameters: storing references in structs, invariant vs. covariant positions
- Lifetime subtyping and coercion: `'a: 'b` meaning "'a outlives 'b", coercion of `&'a T` to `&'b T` when `'a: 'b`
- Variance table: `&T` covariant, `&mut T` invariant-in-T, `Box<T>`/`Vec<T>` covariant, `Cell<T>`/`RefCell<T>`/`Mutex<T>` invariant, `fn(T)` contravariant in args/covariant in return
- The `'static` bound: meaning "lives for the whole program" when on data; meaning "contains no non-`'static` references" when as a bound on `T: 'static` — critical distinction for `std::thread::spawn` and `tokio::spawn` requirements
- Higher-ranked lifetimes and trait objects: `Box<dyn Fn(&str) + 'static>` vs `Box<dyn for<'a> Fn(&'a str)>`; why closures over references need HRTB for trait objects
- Lifetime desugaring of `impl` blocks and associated types
- The borrow checker's error taxonomy: "does not live long enough", "cannot return reference to local", "cannot borrow as mutable more than once"

**Theoretical Rules & Contracts**
- The fundamental contract: a reference cannot outlive its referent; every use of a reference must be dominated by the referent's live range
- Outlives relation: `'a: 'b` — `'a` is valid at least everywhere `'b` is
- Drop-check rule: when dropping `T`, all data `T` may access must still be alive — motivates `#[may_dangle]`
- Lifetime bounds on type parameters: `T: 'a` (T's references live at least as long as `'a`), `T: 'static` (T contains only 'static-referencing data)
- The "no dangling" invariant as a soundness requirement enforced before codegen

**Production Edge Cases & Bugs**
- The classic self-referential struct problem (holding a `&` to one's own field) — motivating `Pin`, rental-esque crates, or arena/index designs
- `tokio::spawn` requiring `T: 'static`: moving borrowed data into tasks; the `async move` + `Arc` escape patterns
- Lifetime puzzles in iterator combinators returning closures — using HRTB or boxing
- Deserializing borrowed data from `serde`: `&'a str` from input buffers vs. owned `String` — lifetime coupling of the deserialized struct to the input buffer
- Struct fields with references forcing lifetime contagion across the whole type graph — refactoring to IDs/handles
- Accidentally over-constraining APIs with `T: 'static` blocking legitimate uses of scoped data

**Interview Trivia & Idiomatic Patterns**
- Q: "What does `T: 'static` mean?" — T contains no references (other than `'static` ones); it does NOT mean the value lives forever (allocation can be dropped anytime).
- Q: "Explain lifetime elision." — Three deterministic rules the compiler applies to function signatures so explicit annotations are only needed when ambiguity exists.
- Idiomatic: annotate lifetimes only when the compiler asks; use descriptive lifetime names in public APIs (`'input`, `'cfg`, `'de`)
- Pattern: the "lifetime of the input" deserialization pattern with `serde` borrowed deserialization
- Anti-pattern: sprinkling `'static` to silence the borrow checker — it almost always signals an ownership design error

### Chapter 1.5: Smart Pointers: Box, Rc, Arc, RefCell, Weak

#### In plain English

**The problem:** Ownership with one owner is strict. Real programs sometimes need the heap on purpose, shared ownership (many parts own one value), or change inside something that looks read-only. **The fix:** a small toolbox of “smart pointers”, each with a clear job and a clear price. **The twist:** the price of each is visible in its name and type, so you always know what you are paying for.

> **Imagine:** `Box` is a single locker with one key. `Rc` is a shared streaming account with a counter of how many people use it; the account closes when the last person leaves. `Arc` is the same account made safe for many people using it at the same time. `RefCell` is a door where the rules are checked when you walk through, not before. `Weak` is a bookmark that does not stop the page being thrown away.

```diagram
{"n":"A:Need heap storage or one owner:0:0|F:!Box:1:0|B:Many owners on one thread:0:1|G:!Rc:1:1|C:Many owners across threads:0:2|H:!Arc:1:2|D:Change data behind a shared view:0:3|I:!RefCell or Mutex:1:3|E:Avoid a reference cycle:0:4|J:!Weak:1:4","e":"A>F:use|B>G:use|C>H:use|D>I:use|E>J:use"}
```

| Type | Owners | Works across threads? | Can change inside? | Cost |
| --- | --- | --- | --- | --- |
| `Box<T>` | One | Yes, if `T` can | If you own it | One heap allocation |
| `Rc<T>` | Many | **No** | No, unless combined with `RefCell` | A counter that is updated |
| `Arc<T>` | Many | **Yes** | No, unless combined with `Mutex` | An atomic counter, slightly slower |
| `RefCell<T>` | One | No | Yes, rules checked at run time | A flag check, panics if misused |
| `Weak<T>` | None (a non-owning link) | `Weak` for `Rc` or `Arc` | – | Must upgrade before use |

```rust
use std::cell::RefCell;
use std::rc::Rc;

fn main() {
    let shared = Rc::new(RefCell::new(vec![1, 2]));
    let other = Rc::clone(&shared);          // a second owner, not a copy
    other.borrow_mut().push(3);              // change through either owner
    println!("{:?}, owners = {}", shared.borrow(), Rc::strong_count(&shared));
}
```

**Warnings:** two `Rc`s pointing at each other never free (a leak), so make one direction a `Weak`. `Rc<RefCell<T>>` everywhere is usually a sign the design should be reorganised around clear ownership.

#### The full technical detail


**Low-Level Mechanics & Internals**
- `Box<T>`: single ownership heap pointer; `Deref`/`DerefMut` impls; `Box<dyn Trait>` trait objects; `Box<[T]>` slices; `Box::leak` for `'static` references; `Box::into_raw`/`from_raw` for FFI
- `Rc<T>`: non-atomic reference counting for single-threaded shared ownership; strong count + weak count words; `Rc::clone` cost = increment; `Rc::make_mut` clone-on-write semantics
- `Arc<T>`: atomic reference counting (`AtomicUsize` with `Relaxed` increments, acquire/release ordering on decrement/drop); `Arc<T>: Send + Sync if T: Send + Sync`; `Arc::get_mut`, `Arc::make_mut`, `Arc::from`/`Arc::new`
- `Weak<T>`/`Weak<T>` upgrade: breaking reference cycles; weak count mechanics; `upgrade` returning `Option<Rc<T>>` after the strong count hits zero
- `RefCell<T>`: interior mutability via borrow flag; `RefCell<T>: Send if T: Send`, never `Sync`
- `Mutex<T>`/`RwLock<T>` in `std`: poisoning semantics (lock poisoning on panic — `PoisonError`), `lock()` returning `LockResult`, ignoring vs. propagating poison
- `OnceLock<T>`/`OnceCell<T>`: single-initialization synchronization primitive
- `Cow<'a, B>`: clone-on-write — borrowed until mutation forces ownership
- `Pin<Box<T>>`: owning pinned pointer; `pin!` macro for stack pinning
- Memory overhead summary: `Box` = 8 bytes pointer; `Rc`/`Arc` = 16–32 bytes of count overhead (strong+weak) plus pointee; `RefCell` = 1 pointer of borrow flag; double indirection through `Rc<RefCell<T>>` (pointer to pointer)
- Counting layout: `Rc` header layout (counts stored before the pointee), `Arc` with `#[repr(C)]` guarantees for FFI
- `Arc` downgrade/upgrade protocols in concurrent graphs and caches

**Theoretical Rules & Contracts**
- `Rc<T>`: `Clone` shares ownership (count++); drop decrements; deallocation when strong count = 0 and weak count = 0
- Thread-safety contract: `Rc<T>` is `!Send` and `!Sync` (non-atomic counts); `Arc<T>` is `Send + Sync where T: Send + Sync`
- Interior mutability contract: the programmer guarantees at runtime the aliasing rules — compiler verifies nothing inside
- `Send`/`Sync` recap for smart pointers: `Rc<T>: Send` never; `Arc<Mutex<T>>` as the canonical shared-mutable pattern
- Drop order contract for nested smart pointers: dropping `Arc<Mutex<Vec<T>>>` — lock drop before inner vec deallocation

**Production Edge Cases & Bugs**
- Reference cycles with `Rc<T>`/`Arc<T>`: parent-child bidirectional references leaking entire object graphs — fix with `Weak` for the back-pointer
- `Arc<RefCell<T>>` anti-pattern: `RefCell` is not thread-safe; compiles only in single-threaded contexts and is a smell in async services — use `Arc<Mutex<T>>`
- `RwLock` writer starvation on read-heavy workloads; prefer `Mutex` when reads are brief (mutex is often faster than RwLock)
- Lock poisoning propagation strategy: recovering via `into_inner`/`ignore_poison` vs. crashing the service
- Holding `MutexGuard` across `.await`: future becomes `!Send`, breaking Tokio task requirements; fix with `tokio::sync::Mutex` (async-aware) or scoped lock drops
- `Arc::make_mut` unexpectedly deep-cloning under contention — clone cost surprise in hot paths
- Circular drops with destructors: two `Drop` impls referencing each other causing panics in destructors

**Interview Trivia & Idiomatic Patterns**
- Q: "`Rc` vs `Arc`?" — Same API, different counter atomicity; `Rc` is cheaper but single-threaded only.
- Q: "`Arc<Mutex<T>>` vs `Mutex<Arc<T>>`?" — Sharing ownership of the lock vs. sharing the data under one lock; different granularity semantics.
- Q: "How do you leak memory with `Rc`?" — Reference cycles; break with `Weak`.
- Idiomatic: `Arc<Mutex<T>>` for shared mutable state across threads/tasks; `Arc<RwLock<T>>` only with measured read:write ratios
- Idiomatic: `Rc<RefCell<T>>` is fine for single-threaded UI/graph structures; `Arc<Mutex<T>>` in server code
- Pattern: `Weak` for caches (expiring entries), parent-child trees, observer lists
- Pattern: arena + generational indices instead of pointer graphs for entity systems


## Module 2: Structs, Enums, Pattern Matching & Error Handling

### Overview – Describing the real world in Rust

**The problem:** Real programs describe things (a user, an order), choices (paid or unpaid), missing values (no phone number) and failures (the file is not there). Many languages handle these with tricks that are easy to forget: `null`, exceptions, or a pile of true/false flags. **The fix:** Rust gives each job a proper tool: `struct` for “things with several parts”, `enum` for “one of several options”, `Option` for “maybe a value” and `Result` for “maybe a failure”. **The twist:** the compiler forces you to deal with every option, so a forgotten case is a build error rather than a midnight outage.

> **Imagine:** A hospital form. Some boxes must all be filled in (struct). Some questions have you tick exactly one answer (enum). Some boxes may be left blank on purpose (Option). And a rejected form always comes back with a stated reason (Result).

```diagram
{"n":"A:Call a function that can fail:0:0|B:It returns a Result:1:0|C:Ok holds the value:2:0|D:Err holds the reason:2:1|E:!Carry on with the value:3:0|F:!Handle it or pass it up with a question mark:3:1","e":"A>B|B>C:success|B>D:failure|C>E|D>F"}
```

| Other languages | Rust | Why it is safer |
| --- | --- | --- |
| `null` | `Option<T>` | You cannot use the value without checking it is there |
| Exceptions | `Result<T, E>` | The possible failure is part of the function’s signature |
| Class with many flags | `enum` with data | Impossible combinations cannot be written |
| `if / else if` chain | `match` | The compiler checks that every case is covered |

### Chapter 2.1: Structs & Algebraic Data Types

#### In plain English

**The problem:** You need to group related facts (a user has a name, an age and an email) and also stop yourself mixing up values that look alike (a user id and an order id are both just numbers). **The fix:** a `struct` groups fields under one name, and a one-field “newtype” wraps a plain number so different kinds of ids become different types. **The twist:** wrapping costs nothing at run time, yet the compiler now refuses to pass an order id where a user id is expected.

> **Imagine:** A struct is a form with labelled boxes: every box exists at once. A newtype is putting each kind of key on its own coloured keyring so you cannot unlock the wrong door by accident.

```diagram
{"n":"A:What are you modelling:0:0|B:Several facts at once:1:0|C:One of several options:1:1|D:A plain number needing meaning:1:2|E:!struct with named fields:2:0|F:!enum with variants:2:1|G:!newtype wrapper:2:2","e":"A>B|A>C|A>D|B>E:AND|C>F:OR|D>G:wrap it"}
```

| Kind | Looks like | Use it for |
| --- | --- | --- |
| Named struct | `struct User { name: String, age: u8 }` | Most data |
| Tuple struct | `struct Point(i32, i32);` | Short, obvious groups |
| Newtype | `struct UserId(u64);` | Giving a primitive its own identity |
| Unit struct | `struct Marker;` | A type with no data, only meaning |

| `derive` | What you get for free |
| --- | --- |
| `Debug` | Printing with `{:?}` for logs and tests |
| `Clone` / `Copy` | Explicit duplicate / automatic cheap duplicate |
| `PartialEq`, `Eq` | Comparing with `==` |
| `Hash` | Use as a `HashMap` key |
| `Default` | A sensible empty value with `Default::default()` |
| `PartialOrd`, `Ord` | Sorting and comparing with `<` |

```rust
#[derive(Debug, Clone, Copy, PartialEq)]
struct UserId(u64);
#[derive(Debug, Clone, Copy, PartialEq)]
struct OrderId(u64);

#[derive(Debug, Default)]
struct User { name: String, age: u8 }

fn load_user(id: UserId) -> User {
    User { name: format!("user-{}", id.0), ..Default::default() }
}

fn main() {
    let u = UserId(7);
    let _o = OrderId(7);
    println!("{:?}", load_user(u));
    // load_user(_o);   // error: expected `UserId`, found `OrderId`
}
```

#### The full technical detail


**Low-Level Mechanics & Internals**
- Product types: structs as cartesian products of their field types; memory = sum of field sizes (+ padding)
- Tuple structs vs named-field structs vs unit structs — same layout semantics, different nominal identity
- Newtype pattern: `struct UserId(u64)` — zero-cost wrapper giving type safety and new trait impls; `#[derive(...)]` delegation cost (none at runtime)
- Struct field layout optimization: Rust's default repr reordering fields to minimize padding; `#[repr(C)]` disabling reordering for FFI
- Bitflags, packed structs, and manual bit-packing techniques for protocol implementations
- Struct update syntax `..base`: move semantics of remaining fields, use in config/default patterns
- Associated functions vs methods: `impl` blocks, `Self` type, method resolution order (inherent methods before trait methods), autoderef in method calls
- `#[non_exhaustive]` attribute: forbidding downstream exhaustive matching/struct literal construction — semver tooling for library authors
- Privacy and encapsulation: private fields enforcing invariants at type level; constructor functions validating invariants
- Zero-cost abstraction validation: newtype, generics, and static dispatch compile down to identical code as hand-written specialized versions (monomorphization)

**Theoretical Rules & Contracts**
- Nominal typing: struct identity is by name, not structure — `struct Meters(f64)` vs `struct Seconds(f64)` are incompatible
- Invariant enforcement: private fields + validated constructors; `pub` field trade-off between ergonomics and invariant safety
- Trait coherence and orphan rule: `impl Trait for Type` allowed only if trait or type is local to the crate — prevents overlapping impls across crates
- Auto-derive contracts: `#[derive(Eq)]` requires `PartialEq`; `Hash`/`Eq` consistency requirement for hash-map correctness

**Production Edge Cases & Bugs**
- Deriving `PartialEq` on floats (`NaN != NaN`) — never put `f32`/`f64` in `Eq`-requiring collections or match on float equality
- Forgetting `#[non_exhaustive]` on public enums/structs, then a semver-breaking change when adding variants/fields
- Public struct fields enabling invariant violation (e.g., `struct User { age: i32 }` set to `-5`)
- Deriving `Hash` on types containing floats — `Hash` requires `Eq` consistency which floats violate
- Accidental semver break: adding a field without `#[non_exhaustive]` breaks downstream struct literal construction

**Interview Trivia & Idiomatic Patterns**
- Q: "Newtype pattern benefits?" — Type safety, custom trait impls (e.g., different `Display`), zero runtime cost.
- Q: "Why `#[non_exhaustive]`?" — Allows library evolution without breaking downstream exhaustive matches.
- Idiomatic: builder pattern for multi-parameter construction; consuming builders for terminal `build()`
- Idiomatic: type-state pattern (phantom type parameters) to encode protocol states in the type system
- Anti-pattern: public fields everywhere "for convenience" — leaks invariants

### Chapter 2.2: Enums & Sum Types

#### In plain English

**The problem:** A thing is often in exactly one of several states, and each state carries different details. A payment is unpaid, or paid (with a date), or refunded (with an amount). With a pile of boolean flags you can write nonsense like “paid and refunded and unpaid”. **The fix:** an `enum` lists the possible states, and each variant carries only its own data. **The twist:** an invalid combination simply cannot be expressed, so you never need a defensive check for it.

> **Imagine:** A parcel tracker. The parcel is in one stage at a time: packed, on the road (with a driver name), delivered (with a signature). It can never be “delivered” and “packed” together.

```diagram
{"n":"A:Created:0:0|B:Paid:1:0|C:Shipped:2:0|D:!Delivered:3:0|E:!Cancelled:1:1","e":"A>B:pay|B>C:ship|C>D:arrive|A>E:cancel"}
```

| Instead of this | Write this | What improves |
| --- | --- | --- |
| `is_paid: bool` plus `paid_at: Option<Date>` | `enum Payment { Unpaid, Paid(Date) }` | A paid order always has a date |
| A `String` such as `"shipped"` | `enum Status { Shipped }` | No typos, the compiler lists every case |
| Many `Option` fields where only some combinations are valid | One enum with data per variant | Illegal states are unrepresentable |

```rust
#[derive(Debug)]
enum Order {
    Created,
    Paid { amount: u32 },
    Shipped { tracking: String },
    Delivered,
    Cancelled,
}

fn next(o: Order) -> Order {
    match o {
        Order::Created => Order::Paid { amount: 499 },
        Order::Paid { .. } => Order::Shipped { tracking: "TRK1".to_string() },
        Order::Shipped { .. } => Order::Delivered,
        other => other,   // Delivered and Cancelled stay as they are
    }
}

fn main() {
    let mut o = Order::Created;
    for _ in 0..3 { o = next(o); println!("{:?}", o); }
}
```

**Remember:** `Option<T>` and `Result<T, E>` are just enums in the standard library: `Some(T)` or `None`, `Ok(T)` or `Err(E)`. There is no null in safe Rust.

#### The full technical detail


**Low-Level Mechanics & Internals**
- Sum types: enum memory = discriminant (tag) + size of largest variant; niche optimization (e.g., `Option<Box<T>>` pointer-sized, `Option<&T>` using null niche)
- `Option<T>` and `Result<T, E>` as the canonical sum types; layout niches making `Option<NonNull>`/`Option<&T>`/`Option<Box<T>>` pointer-sized — the billion-dollar mistake avoided at zero cost
- Discriminant elision: `Option<Box<T>>` stores no explicit tag — the null pointer encodes `None`
- `std::mem::discriminant` for comparing variants without payloads
- Enums with data: `enum Message { Quit, Move { x: i64, y: i64 }, Write(String), ChangeColor(i32, i32, i32) }`
- `#[repr(u8)]`/`#[repr(C)]` on enums for FFI-safe discriminants
- Exhaustiveness checking: the compiler proves all variants are handled — refactors that add variants produce compile errors at all match sites
- `MaybeUninit<T>`: handling possibly-uninitialized enum payloads in unsafe code
- Enum size inspection: `size_of::<Option<u8>>()` == 2 (tag + payload), vs. pointer niche examples at 8 bytes

**Theoretical Rules & Contracts**
- Exhaustiveness contract: match must cover all variants (or include a wildcard); compiler error otherwise
- `!` (never type) as the empty enum — uninhabited type used for `Result<T, Infallible>`
- Variant payload binding rules: by-value (moves), by-reference, by-ref-mut in patterns
- Enum discriminants and casting: `self as u8` for fieldless enums

**Production Edge Cases & Bugs**
- Adding a variant to a public enum = breaking change unless `#[non_exhaustive]` — matching downstream code fails to compile
- Match with wildcard arm silently swallowing new variants during refactors — prefer exhausting matches with explicit arms, or compile with `-W unreachable_patterns` audits
- Large enum variants inflating every value's size (size of largest variant + tag) — boxing infrequent variants (`enum E { Common(u32), Rare(Box<BigStruct>) }`)
- Serialization of enums with Serde: externally vs internally tagged representations, and the pitfalls of internally-tagged enums with untagged payloads

**Interview Trivia & Idiomatic Patterns**
- Q: "Why is `Option<&T>` the same size as `&T`?" — Niche optimization: null pointer representation reused as the `None` discriminant.
- Q: "What is the billion-dollar mistake Rust avoids?" — Null references; `Option` makes absence explicit and type-checked.
- Idiomatic: make illegal states unrepresentable — encode state machines as enums with data (e.g., `enum Connection { Connecting, Connected(TcpStream), Failed(Error) }`)
- Pattern: exhaustive matching over library enums; wildcard arm only as an intentional catch-all with logging

### Chapter 2.3: Pattern Matching

#### In plain English

**The problem:** After you have a value that can be one of many shapes, you must look inside it and act differently for each shape. Long chains of `if/else` get messy, and it is easy to forget a case. **The fix:** `match` compares a value against a list of patterns from top to bottom and runs the first one that fits, pulling out the pieces you need as it goes. **The twist:** the compiler checks that the list is complete. If you add a new variant to an enum later, every `match` that forgot it stops compiling, which is exactly the reminder you want.

> **Imagine:** A mail sorting machine. Each letter slides past a row of slots, drops into the first slot it fits, and the machine will not start unless every kind of letter has a slot.

```diagram
{"n":"A:A value arrives:0:0|B:Try the first pattern:1:0|C:Try the next pattern:2:0|D:!Run that arm:1:1|E:No pattern left:3:0|F:!Compile error if not exhaustive:3:1","e":"A>B|B>C:no match|B>D:match|C>D:match|C>E:no match|E>F:caught early"}
```

| Pattern | Written as | Means |
| --- | --- | --- |
| Literal | `0` | Exactly this value |
| Range | `1..=9` | Any value in the range |
| Several options | `1 \| 2` | Either one |
| Binding | `n` | Whatever it is, call it `n` |
| Destructure | `Point { x, y }` | Pull a struct apart |
| Guard | `n if n > 100` | Only when the extra test is true |
| Name and test | `n @ 1..=9` | Keep the value and check its range |
| Ignore | `_` or `..` | I do not care about this part |

```rust
enum Shape { Circle(f64), Rect { w: f64, h: f64 } }

fn describe(n: i32) -> &'static str {
    match n {
        0 => "zero",
        x if x < 0 => "negative",
        1..=9 => "small",
        _ => "large",
    }
}

fn area(s: &Shape) -> f64 {
    match s {
        Shape::Circle(r) => 3.14159 * r * r,
        Shape::Rect { w, h } => w * h,
    }
}

fn main() {
    println!("{} {} {}", describe(-4), describe(5), describe(50));
    println!("{:.1}", area(&Shape::Rect { w: 2.0, h: 3.0 }));
    let maybe = Some(3);
    if let Some(n) = maybe { println!("got {n}"); }          // one case only
    let Some(n) = maybe else { return };                      // leave early if not
    println!("{}", matches!(maybe, Some(x) if x > 1) && n == 3);
}
```

**Tip:** use `if let` when you care about one case, `let ... else` for “give up early if it is not this shape”, and avoid a lazy `_ =>` on your own enums because it hides new variants you later add.

#### The full technical detail


**Low-Level Mechanics & Internals**
- Match as a decision tree compiled to efficient jump tables / comparisons (LLVM lowering)
- Pattern forms: literal, identifier (binding), wildcard `_`, `..` rest patterns, tuple/struct/enum destructuring, slice patterns `[first, .., last]`, or-patterns `A | B`, reference patterns `&x`, `ref`/`ref mut` bindings, guard clauses `if condition`, `@` bindings (`name @ pattern`), range patterns `1..=5`, box patterns (unstable `box_patterns`), deref patterns (edition 2024)
- Match ergonomics: default binding modes — matching a reference auto-binds by reference; `match &opt { Some(x) => ... }` binds `x: &T`
- Binding modes interaction: when `ref` is implied, when moves are attempted from behind references (compile error)
- `if let`, `while let`, `let-else` (Rust 1.65+): irrefutable/refutable patterns in statement position; `let Some(x) = opt else { return; }` as early-return pattern
- Destructuring in function parameters, closures, `for` loops, `let` bindings
- Refutability: irrefutable patterns (always match) vs refutable; where each is allowed (`let` requires irrefutable)
- Exhaustiveness and usefulness checking algorithm: the compiler's pattern matrix algorithm proving coverage
- Matching on slices and strings: slice patterns with fixed/rest splits, string literal patterns
- `matches!` macro for predicate-style matching

**Theoretical Rules & Contracts**
- Pattern binding ownership: by-value binding moves (if `Copy`, copies); `ref`/`ref mut` borrow; reference patterns match through indirection
- Exhaustiveness + usefulness: every match is proven total; unreachable arms produce warnings (with `-W unreachable-patterns` enforced)
- Match ergonomics rules: when the scrutinee is a reference, bindings default to reference mode, dereferencing as needed through nested patterns

**Production Edge Cases & Bugs**
- Guard clauses preventing exhaustiveness proofs — moving conditions out of guards into patterns or explicit arms
- `ref mut` binding then mutating through it, conflicting with later borrows of the same data
- Match ergonomics confusion when nesting `&` and `&mut` — explicit type annotations clarifying binding modes
- Forgetting `_` on intentionally-partial matches when new enum variants are added — prefer full matches in domain logic
- `let-else` divergence requirement: the `else` block must diverge (return/break/continue/panic)

**Interview Trivia & Idiomatic Patterns**
- Q: "Match vs. if-else chains?" — Match is exhaustive-checked, compiles to jump tables, supports complex destructuring; if-chains silently miss cases.
- Idiomatic: use `let-else` for early returns on `Option`/`Result` in async handlers
- Idiomatic: avoid deep nesting of `if let Some(...)` — prefer `let-else` or `?`
- Anti-pattern: boolean parameter soup — replace with two-variant enums for call-site clarity (`enum Mode { Recursive, Iterative }`)
- Pattern: state-machine-as-enum with `match` as the transition function, `mem::replace` for taking states out

### Chapter 2.4: Option & Result Combinators

#### In plain English

**The problem:** Values that may be missing (`Option`) or may fail (`Result`) are everywhere. Checking each one with a full `match` makes code long and noisy. **The fix:** small helper methods, called combinators, transform the value if it is there and skip everything if it is not. The `?` operator goes further: it unwraps a success, or returns the failure to the caller immediately. **The twist:** the happy path reads like a straight line, and no error is silently dropped.

> **Imagine:** A factory conveyor belt with stations. A good item passes each station and is transformed. If an item is faulty, it is pulled off the belt and skips all remaining stations, carrying its fault note with it.

```diagram
{"n":"A:Some 5:0:0|B:map times 2:1:0|C:and_then check limit:2:0|D:unwrap_or 0:3:0|E:!Final value:3:1|F:None:1:1","e":"A>B|B>C:Some 10|C>D|D>E|F>C:skips the work"}
```

| Method | Plain meaning | Example |
| --- | --- | --- |
| `map` | Change the inside if present | `Some(2).map(\|x\| x * 2)` gives `Some(4)` |
| `and_then` | Next step that may also fail | `s.parse().ok().and_then(check)` |
| `unwrap_or(d)` | The value, or a default | `None.unwrap_or(0)` gives `0` |
| `unwrap_or_else(f)` | Default computed only if needed | `opt.unwrap_or_else(make_default)` |
| `ok_or(e)` | Turn a missing value into an error | `opt.ok_or(MyError::Missing)` |
| `map_err(f)` | Change the error type or message | `res.map_err(AppError::from)` |
| `?` | Return early on failure, unwrap on success | `let n = text.parse::<i32>()?;` |
| `filter` | Keep only if a test passes | `Some(5).filter(\|x\| *x > 9)` gives `None` |

```rust
use std::num::ParseIntError;

fn double_text(text: &str) -> Result<i32, ParseIntError> {
    let n: i32 = text.trim().parse()?;   // returns the error early
    Ok(n * 2)
}

fn first_even(v: &[i32]) -> Option<i32> {
    v.iter().copied().find(|x| x % 2 == 0)
}

fn main() {
    println!("{:?} {:?}", double_text(" 21 "), double_text("abc").is_err());
    let r: Result<i32, &str> = first_even(&[1, 3, 6]).ok_or("no even number");
    println!("{:?} {}", r, first_even(&[1]).map_or(-1, |x| x));
}
```

**Safety rule:** `unwrap()` and `expect()` crash the program when the value is missing. Use them in tests and for “this truly cannot happen” cases, never on input you do not control (user data, files, the network).

#### The full technical detail


**Low-Level Mechanics & Internals**
- `Option<T>` combinators: `map`, `and_then`, `or`, `or_else`, `filter`, `map_or`, `map_or_else`, `ok_or`, `ok_or_else`, `transpose` (Option<Result> ↔ Result<Option>), `flatten` (Option<Option<T>> → Option<T>), `zip`, `take`, `replace`, `get_or_insert_with`, `as_deref`, `as_ref`/`as_mut`
- `Result<T, E>` combinators: `map`, `map_err`, `and_then`, `or_else`, `map_or`, `map_or_else`, `ok`, `err`, `transpose`, `as_ref`/`as_mut`
- Iterator bridging: `Option::iter`, `Result::iter` (0-or-1 iterators), `collect::<Result<Vec<_>, _>>()` — the "try collect" idiom
- `?` operator desugaring: `match expr { Ok(v) => v, Err(e) => return Err(From::from(e)) }` — the `From` conversion step, `Try` trait (unstable generalization), `try` blocks (unstable)
- `?` in `Option`-returning functions and in `main() -> Result<(), E>` for error-exit codes
- `FromIterator` for `Result`/`Option` collections: short-circuiting collection over iterators of Results
- Performance of combinators vs. explicit match: zero-cost; combinator chains compile to the same branch structure as hand-written matches

**Theoretical Rules & Contracts**
- `?` contract: only in functions returning `Result`/`Option` (or types implementing `Try`); error conversion via `From<E> for F` must exist
- Combinator laziness: `_or_else`/`map_or_else` take closures (lazy); `or`/`map_or` take values (eager) — semantic + performance difference
- `transpose` laws and when nested types invert
- Short-circuit semantics: `?` returns immediately; combinators preserve this; no implicit logging or recovery

**Production Edge Cases & Bugs**
- Using `unwrap()` in library code / request paths — the panic risk; policy: `unwrap`/`expect` only for invariants, with `expect("invariant: ...")` messages
- Double-wrapping errors: `Err(anyhow!("{}", e))` destroying the error chain — use `?` and `From` or `.context()`
- `.ok()` swallowing errors silently — anti-pattern in services; at minimum log
- `collect::<Result<Vec<_>,_>>()` partial failure semantics — all-or-nothing; use `filter_map` + partition for partial success
- `map_err` closures capturing environment — borrow issues in async chains; clone-before-capture
- `?` in closures returning non-Result types — closure return type must match; refactoring to `and_then` or explicit match

**Interview Trivia & Idiomatic Patterns**
- Q: "`unwrap` vs `expect`?" — Same panic, but `expect` carries a message; neither belongs in production request paths.
- Q: "`ok_or` vs `ok_or_else`?" — Lazy closure avoids error construction cost on success paths.
- Idiomatic: `?` everywhere; `.context()` at layer boundaries (route handlers, repository methods)
- Idiomatic: `let-else` for guard clauses; combinators for transformation chains
- Anti-pattern: nested `.map().unwrap_or_else()` pyramids — restructure with `and_then` or early returns
- Pattern: `#[from]` with thiserror for automatic `?` conversions; `map_err` for foreign error types lacking impls

### Chapter 2.5: Custom Error Types, thiserror & anyhow

#### In plain English

**The problem:** When something goes wrong, the caller needs to know what, and sometimes needs to react differently to different failures (file missing versus no permission). A plain text message is not enough, and a crash is too harsh. **The fix:** make your own error type, usually an `enum` with one variant per kind of failure, and let `?` convert lower-level errors into it automatically. Two popular crates remove the boilerplate: `thiserror` for libraries and `anyhow` for applications. **The twist:** the failure path is part of each function’s signature, so nobody can ignore it by accident.

> **Imagine:** A triage form at a hospital. A good form records the type of problem and what led to it. A library hands back precise forms the caller can read (`thiserror`). An application at the front desk mostly needs a readable report with context (`anyhow`).

```sequence
{"p":"H:Handler|S:Service|D:Database","m":"H>S:create_user|S>D:INSERT row|D>S:~Err duplicate key|S>H:~Err AppError Conflict|H>H:turn it into HTTP 409"}
```

1. The handler calls the service.
2. The service asks the database to insert a row.
3. The database reports a low-level error: the key already exists.
4. The service converts it with `?` and `From` into its own `AppError::Conflict`.
5. The handler maps that error to an HTTP 409 response. A bug would map to 500 instead.

| Tool | Use for | Strength | Watch out |
| --- | --- | --- | --- |
| `panic!`, `unwrap` | Bugs that must never happen, tests | Stops at once | Takes down the thread or service |
| Own `enum` + `impl Error` | Public APIs of libraries | Callers can match on kinds | A little boilerplate |
| `thiserror` | Same, with less typing | Derives `Display` and `From` | Another dependency |
| `anyhow::Result` | Applications and `main` | Easy context with `.context("...")` | Callers cannot match on the type |
| `Box<dyn Error>` | Quick tools and prototypes | No extra crate | Loses precise type |

```rust
use std::fmt;
use std::num::ParseIntError;

#[derive(Debug)]
enum AppError { BadNumber(ParseIntError), TooBig(i32) }

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            AppError::BadNumber(e) => write!(f, "not a number: {e}"),
            AppError::TooBig(n) => write!(f, "{n} is too big"),
        }
    }
}
impl std::error::Error for AppError {}
impl From<ParseIntError> for AppError {
    fn from(e: ParseIntError) -> Self { AppError::BadNumber(e) }
}

fn read(text: &str) -> Result<i32, AppError> {
    let n: i32 = text.parse()?;          // ParseIntError becomes AppError
    if n > 100 { return Err(AppError::TooBig(n)); }
    Ok(n)
}

fn main() {
    for t in ["42", "x", "500"] {
        match read(t) { Ok(n) => println!("ok {n}"), Err(e) => println!("error: {e}") }
    }
}
```

The same enum with the `thiserror` crate (add `thiserror = "1"` to `Cargo.toml`) is much shorter:

```text
#[derive(Debug, thiserror::Error)]
enum AppError {
    #[error("not a number: {0}")]
    BadNumber(#[from] std::num::ParseIntError),
    #[error("{0} is too big")]
    TooBig(i32),
}
```

#### The full technical detail


**Low-Level Mechanics & Internals**
- `std::error::Error` trait contract: `Display` + `Debug` supertraits; `source()` returning `Option<&(dyn Error + 'static)>` — the error chain walking mechanism (`Error::sources()` for backtrace-of-causes)
- Error trait objects: `Box<dyn Error + Send + Sync>` — the object-safe, thread-safe error type; why `Send + Sync` bounds matter for `?` through thread boundaries
- `thiserror` derive macro: `#[derive(Error)]`, `#[error("...")]` display strings with field interpolation, `#[from]` generating `From` impls, `#[source]`/`#[transparent]` for delegation, `#[error(ignore)]`, `#[backtrace]` support, `provide` API (nightly)
- `anyhow::Error`: type-erased error with context chain (not a trait object directly — an internal vtable design), `anyhow::Context` trait providing `.context()`/`.with_context()` for `Result` and `Option`
- anyhow vs. thiserror: application vs. library boundary rule — libraries return concrete/thiserror errors; applications type-erase with anyhow
- `eyre` as an alternative to anyhow (custom report handlers, `color-eyre` for pretty diagnostics)
- `std::backtrace::Backtrace` capture semantics: lazily captured, requires `RUST_BACKTRACE=1` env (or forced capture)
- Error conversion taxonomy: `From` impls (infallible), `map_err` (fallible/contextual), `Box<dyn Error>` upcasting (unstable)
- Error enums with variants per failure mode: structured errors enabling programmatic handling by callers (`match err { Error::NotFound(..) => 404, .. }`)
- HTTP mapping of errors: implementing `IntoResponse` for app error types in Axum; status-code preserving error design

**Theoretical Rules & Contracts**
- Library error contract: expose structured, matchable error types; never `anyhow` in public library APIs (it prevents callers from handling errors programmatically)
- `Error::source()` chain contract: each error points to its cause; tools (tracing, logs) walk the chain
- Semver contract: adding a variant to a public error enum is breaking; use `#[non_exhaustive]`
- Context contract: `.context()` attaches location-specific metadata without destroying the underlying error (via `source()`)
- `Send + Sync + 'static` bound rule: spawned tasks, `anyhow::Error` defaults — errors must be thread-safe to cross task boundaries

**Production Edge Cases & Bugs**
- anyhow in library crates forcing callers into stringly-typed handling
- Losing error kinds when mapping to HTTP: collapsing `NotFound` vs `Forbidden` into generic 500s by over-erasing with anyhow at the wrong layer
- `Box<dyn Error>` without `Send + Sync` failing to compile across `tokio::spawn`
- Backtrace cost in hot paths: capturing backtraces on every error is expensive; gate behind configuration
- thiserror + generics: `#[error(transparent)]` forwarding for wrapper types; lifetime parameters in error types (borrowing from input — e.g., validation errors borrowing the invalid string)
- Error accumulation: multiple validation failures — `Vec<Error>` aggregation patterns, `itertools::process_results`, `validify`/`garcon` style crates

**Interview Trivia & Idiomatic Patterns**
- Q: "anyhow or thiserror?" — thiserror for libraries (typed errors), anyhow for applications (ergonomic erasure + context).
- Q: "How do you preserve cause chains?" — Implement `source()` (thiserror does it via `#[from]`), capture `Backtrace` when needed.
- Idiomatic: one error enum per module/crate layer; `#[from]` only for errors you never need to inspect (else keep them as typed variants)
- Idiomatic: error messages lowercase without trailing punctuation (convention), actionable, including relevant identifiers
- Pattern: HTTP layer mapping via a single `IntoResponse for AppError` impl; structured problem-details (RFC 7807) responses
- Anti-pattern: `format!("{}", e)` and losing structure — keep typed errors until the presentation boundary


## Module 3: Concurrency, Multithreading & Fearless Concurrency

### Overview – Doing many things at once, safely

**The problem:** Modern computers have many cores, so programs run several things at the same time. When two of those things touch the same data, strange bugs appear that only show up some of the time: lost updates, crashes, and programs that freeze waiting for each other. **The fix:** Rust applies its ownership rules to threads. Data may be shared between threads only if it is read-only, or if it sits behind a lock or an atomic. **The twist:** the compiler refuses to build code that could have a data race, so the hardest class of concurrency bugs is turned into compile errors. Rust calls this fearless concurrency.

> **Imagine:** A busy kitchen with several cooks. Rust’s rule is: either everyone only reads the recipe, or exactly one cook holds the pen to change it. If cooks need to share ingredients, they pass them through a hatch (a channel) or take a numbered turn at the stove (a lock).

```diagram
{"n":"A:Several threads need the same data:0:0|B:Read only:1:0|C:Need to change it:1:1|D:Pass messages instead:1:2|E:!Share with Arc:2:0|F:!Lock with Mutex or RwLock:2:1|G:!Tiny counter or flag - atomics:3:1|H:!Channel:2:2","e":"A>B|A>C|A>D|B>E|C>F:general data|F>G:just a number|D>H"}
```

| Tool | Plain meaning | Best for |
| --- | --- | --- |
| Thread | A worker that runs alongside others | Independent jobs, CPU work |
| `Arc<T>` | Shared read-only access | Configuration, caches that never change |
| `Mutex<T>` | One at a time, take a turn | Shared data that must change |
| `RwLock<T>` | Many readers or one writer | Read-heavy data |
| Atomic | One tiny value changed in a single indivisible step | Counters, flags |
| Channel | A conveyor belt of messages | Pipelines, worker pools |

### Chapter 3.1: Threads, the OS Scheduler & Send/Sync

#### In plain English

**The problem:** To use many CPU cores you start extra threads. But the operating system, not you, decides when each thread runs, and a thread might touch data another thread is using. **The fix:** `thread::spawn` starts a worker. Rust only lets data move into it if the type is marked `Send`, and only lets data be shared between threads if it is marked `Sync`. You never write these marks yourself: the compiler works them out from the contents of your types. **The twist:** types that are not safe across threads, such as `Rc`, are rejected at compile time with a clear error.

> **Imagine:** A manager (the OS scheduler) handing out turns on a limited number of desks (CPU cores). `Send` means a tool can be handed to another worker. `Sync` means a tool can be used by several workers at once through a shared glass window.

```sequence
{"p":"M:Main thread|W:Worker thread","m":"M>W:spawn with a moved value|W>W:does the work|M>W:join waits for it|W>M:~returns the result"}
```

1. The main thread starts a worker and gives it the data it needs (moved in).
2. The worker runs independently; the OS decides the timing.
3. `join()` makes the main thread wait for the worker to finish.
4. The worker’s result comes back as the value of `join()`.

| Type | `Send` | `Sync` | In plain words |
| --- | --- | --- | --- |
| `i32`, `String`, `Vec<T>` | Yes | Yes | Ordinary data is fine |
| `Rc<T>` | **No** | **No** | Its counter is not safe across threads |
| `Arc<T>` | Yes if `T` is both | Yes if `T` is both | The thread-safe `Rc` |
| `Cell<T>`, `RefCell<T>` | Yes | **No** | Changes without a lock, so cannot be shared |
| `Mutex<T>` | Yes if `T: Send` | Yes if `T: Send` | The lock makes sharing safe |
| `MutexGuard<T>` | **No** | Yes | A held lock must be released on the same thread |

```rust
use std::thread;

fn main() {
    let name = String::from("worker");
    let handle = thread::spawn(move || {           // `move` hands name to the thread
        format!("hello from {name}")
    });
    println!("{}", handle.join().unwrap());

    let mut numbers = vec![1, 2, 3];
    thread::scope(|s| {                            // scoped threads may borrow locals
        s.spawn(|| println!("sum = {}", numbers.iter().sum::<i32>()));
    });
    numbers.push(4);
    println!("{:?}", numbers);
}
```

**Remember:** `thread::spawn` needs `'static` data (owned or `move`d). `thread::scope` lets threads borrow, because it guarantees they all finish before it returns.

#### The full technical detail


**Low-Level Mechanics & Internals**
- OS threads on Linux: `clone()` syscalls, 1:1 threading model, scheduler preemption, context-switch cost (~1–10μs), per-thread stack (default 8MB, configurable)
- `std::thread::spawn`: requires `F: Send + 'static`, `JoinHandle<T>` for waiting and value retrieval, `thread::scope` for scoped threads (borrowing stack data safely — lifetime-proving via the scope API)
- `thread::current`, naming threads for diagnostics (`Thread::name`), `park`/`unpark` cooperative blocking
- Data races as UB in Rust's memory model; races impossible in safe Rust (`Send`/`Sync` enforcement)
- `Send` marker trait: type can be transferred across thread boundaries; `Sync`: `&T` can be shared across threads (T's references are Send)
- Auto-impl rules: compiler auto-implements Send/Sync for types composed entirely of Send/Sync members; negative reasoning via `PhantomData<*const T>`
- `!Send`/`!Sync` examples: `Rc<T>`, `RefCell<T>` (not Sync), raw pointers, `MutexGuard` on some platforms (lifetime-bound guards)
- Thread parking, condvars (`Condvar`), and why `Mutex`+`Condvar` pairs build higher-level synchronization (channels, semaphores)
- CPU topology awareness: core counts via `std::thread::available_parallelism`, NUMA considerations
- Green threads history: why Rust abandoned them (runtime cost, FFI impedance, C interop) in favor of 1:1 OS threads + async/await

**Theoretical Rules & Contracts**
- The fearless concurrency contract: the type system guarantees absence of data races at compile time — no shared mutable state without synchronization
- `Send`/`Sync` as the safety boundary: `unsafe impl Send`/`Sync` is a soundness contract — the implementer guarantees thread-safe behavior manually
- Scoped thread contract: `thread::scope` guarantees all spawned threads join before scope exit, enabling borrowing local data
- `'static` bound on spawn: spawned threads may outlive the spawning function — no borrowed data unless scoped

**Production Edge Cases & Bugs**
- Spawning threads per request — unbounded thread creation exhausting memory; use pools (or async runtimes)
- `unsafe impl Send` on a type wrapping raw pointers without proper synchronization — classic UB
- Blocking a shared worker thread with `thread::sleep` in latency-sensitive systems
- `JoinHandle` detachment: dropping a handle detaches the thread; losing the ability to retrieve panics/results
- Scoped-thread panics: a panicking scoped thread poisons the scope — deciding between propagate vs. catch (`catch_unwind` + `AssertUnwindSafe`)

**Interview Trivia & Idiomatic Patterns**
- Q: "What guarantees fearless concurrency?" — Compile-time `Send`/`Sync` enforcement: no data races without `unsafe`.
- Q: "`Send` vs `Sync`?" — Send = ownership can move across threads; Sync = references can be shared. `T: Sync` iff `&T: Send`.
- Idiomatic: `std::thread::scope` over `Arc`-cloning for bounded parallelism with borrowed data
- Pattern: `Arc` + scoped threads for parallel iterators via `rayon` (work-stealing) for CPU-bound workloads
- Anti-pattern: sharing via global mutable state (`static mut`, lazy_static + Mutex) instead of explicit dependency injection

### Chapter 3.2: Mutex, RwLock & Synchronization Primitives

#### In plain English

**The problem:** Sometimes several threads truly must change the same value, such as a shared counter or a cache. Without coordination their updates overwrite each other. **The fix:** a `Mutex` allows one thread in at a time. You lock it, change the data, and the lock is released automatically when the guard goes out of scope. `RwLock` allows many readers or one writer. **The twist:** in Rust the data lives inside the lock, so you literally cannot touch it without locking first.

> **Imagine:** A bathroom with one key. Whoever holds the key goes in, everybody else waits, and the key returns to its hook when the person leaves. A `RwLock` is a reading room: many people may read quietly together, but cleaning needs the room empty.

```sequence
{"p":"A:Thread A|L:Mutex|B:Thread B","m":"A>L:lock|L>A:~guard granted|B>L:lock|L>B:~wait|A>L:drop guard|L>B:~guard granted"}
```

1. Thread A locks the mutex and gets a guard.
2. Thread B asks for the lock and has to wait.
3. Thread A finishes; the guard is dropped and the lock opens.
4. Thread B is let in.

| Tool | Many readers? | Many writers? | Pick it when |
| --- | --- | --- | --- |
| `Mutex<T>` | One at a time | One at a time | Default choice, simple and fair enough |
| `RwLock<T>` | Yes | One, exclusive | Reads far outnumber writes |
| Atomic | Yes | Yes, for a single value | Just a counter or flag |
| Channel | – | – | Passing work instead of sharing data |

| Danger | What happens | The cure |
| --- | --- | --- |
| Deadlock | Two threads each wait for the other’s lock forever | Always lock in the same order; hold locks briefly |
| Poisoning | A thread panicked while holding the lock | Handle the `Err` from `lock()`, or recover the guard |
| Holding a lock too long | Other threads queue up and slow down | Copy what you need out, drop the guard early |
| Holding a `std` guard across `.await` | Can stall other tasks | Use `tokio::sync::Mutex`, or release the guard first |

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];
    for _ in 0..8 {
        let c = Arc::clone(&counter);
        handles.push(thread::spawn(move || {
            for _ in 0..1000 {
                *c.lock().unwrap() += 1;   // lock, change, unlock at the end of the statement
            }
        }));
    }
    for h in handles { h.join().unwrap(); }
    println!("total = {}", *counter.lock().unwrap());   // always 8000
}
```

#### The full technical detail


**Low-Level Mechanics & Interns**
- `Mutex<T>` internals: OS futex (Linux) based locking, fast-path atomic compare-exchange, slow-path syscall on contention; guard-based RAII unlock (`MutexGuard<T>` releases on drop)
- Lock poisoning: panic while holding a lock → poison flag set; subsequent `lock()` returns `Err(PoisonError)`; rationale (broken invariants) vs. pragmatism (recovering)
- `RwLock<T>`: multiple readers OR single writer; Linux implementation trade-offs (writer starvation possible); upgrade/downgrade absence in `std`
- `std::sync::OnceLock`/`OnceCell`: one-time initialization with blocking or non-blocking (`get_or_try_init`) access
- `parking_lot` crate ecosystem: smaller/faster mutexes (no poisoning — poisoning deemed low-value), deadlock detection feature, `RwLock` variants, `ReentrantMutex`
- `tokio::sync::Mutex`: async-aware mutex (`lock().await`), fairness (FIFO), no poisoning, holding guard across `.await` is safe because guard is `Send` when T is Send — when to use vs std Mutex (short critical sections: std Mutex; long or await-containing: Tokio Mutex)
- `tokio::sync::RwLock` with read/write `.await` acquisition; `tokio::sync::Semaphore` for rate limiting and concurrency limiting (permit API)
- `Mutex<T>` vs atomics decision tree: single-word data → atomics; compound invariants → mutex
- Critical section sizing: lock hold time directly proportional to contention; measuring contention

**Theoretical Rules & Contracts**
- Mutex contract: mutual exclusion — one holder at a time; guard must unlock exactly once (RAII guarantees)
- Sync requirement: `Mutex<T>: Sync` when `T: Send` — the shared reference allows sending the *guard* (which enables T access) to another thread
- Poisoning contract: the flag alerts waiters that invariants may be broken; `ignore_poison`/`into_inner` bypass is an explicit acceptance of risk
- Lock ordering discipline: acquire multiple locks in a fixed global order, or deadlock

**Production Edge Cases & Bugs**
- Deadlocks from inconsistent lock ordering across two code paths (A→B vs B→A); `parking_lot::deadlock` detection in dev builds
- Holding std `MutexGuard` across `.await` → future `!Send` → `tokio::spawn` compile error; solutions: drop guard before await, `tokio::sync::Mutex`, or restructure
- Lock in a `Drop` impl → potential deadlock if drop occurs while the same thread holds the lock
- Overly coarse locking (one big `Mutex<AppState>`) serializing all requests; splitting into per-entity locks or sharded locks
- RwLock read-heavy fairness: writer starvation; mitigation with `parking_lot::RwLock` fairness or mutex swap
- Poison propagation crashes in long-running services; choosing poison recovery with logging and metric alerting

**Interview Trivia & Idiomatic Patterns**
- Q: "Mutex poisoning — agree with it?" — Debated; `parking_lot` drops poisoning (most real bugs aren't memory-safety invariant violations). Production choice: recover with metrics.
- Q: "std::Mutex or tokio::Mutex?" — std for short sync sections; Tokio for across-await holds (otherwise you block/blocking-misuse the executor).
- Idiomatic: keep critical sections minimal; never do I/O or `.await` inside a std mutex guard
- Pattern: sharded state (256 shards, hash by key) to reduce contention at high core counts
- Pattern: `Arc<Mutex<T>>` shared state in Axum via `Extension`/state extractors

### Chapter 3.3: Atomic Types & Lock-Free Programming

#### In plain English

**The problem:** A lock is overkill if all you need is one shared number, such as a request counter or a “please stop” flag. Locks cost time and can deadlock. **The fix:** atomic types (`AtomicUsize`, `AtomicBool`, and friends) change a single value in one indivisible step with no lock. **The twist:** besides the value itself, atomics also control the **order** in which other threads see your changes, and that is the hard part. When in doubt use `SeqCst`; use weaker orderings only with measurements and a clear reason.

> **Imagine:** A scoreboard where pressing the +1 button is one single click that nobody can interrupt. The “ordering” setting is how loudly you announce the change: a whisper (`Relaxed`) tells nobody anything about other work you did, while a full announcement (`Release` then `Acquire`) guarantees the listener also sees everything you finished before the click.

```sequence
{"p":"W:Writer thread|F:Shared flag|R:Reader thread","m":"W>W:write the data|W>F:store ready with Release|R>F:load with Acquire|F>R:~ready is true|R>R:the data is now safe to read"}
```

1. The writer prepares the data first.
2. It then sets the flag using `Release`: all earlier writes are published.
3. The reader loads the flag using `Acquire`.
4. If it sees the flag, it is guaranteed to also see the data.

| Ordering | Plain meaning | Typical use |
| --- | --- | --- |
| `Relaxed` | The change is atomic, nothing else is promised | Simple counters and statistics |
| `Release` | Publish everything I did before this store | Setting a “ready” flag |
| `Acquire` | See everything published by the matching release | Reading that flag |
| `AcqRel` | Both at once, for read-modify-write | Reference counting, locks |
| `SeqCst` | One single global order everyone agrees on | The safe default when unsure |

```rust
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Arc;
use std::thread;

fn main() {
    let hits = Arc::new(AtomicUsize::new(0));
    let stop = Arc::new(AtomicBool::new(false));
    let workers: Vec<_> = (0..4).map(|_| {
        let hits = Arc::clone(&hits);
        thread::spawn(move || { for _ in 0..500 { hits.fetch_add(1, Ordering::Relaxed); } })
    }).collect();
    for w in workers { w.join().unwrap(); }
    stop.store(true, Ordering::Release);
    println!("hits = {}, stop = {}", hits.load(Ordering::Relaxed), stop.load(Ordering::Acquire));
}
```

**Warning:** lock-free code is easy to get subtly wrong. Prefer a `Mutex` or a channel first, and reach for atomics when profiling shows you need them (see the full detail for loom and the ABA problem).

#### The full technical detail


**Low-Level Mechanics & Internals**
- `std::sync::atomic` types: `AtomicBool`, `AtomicIsize`/`AtomicUsize`, `AtomicI32`/`AtomicU32`/`AtomicI64`/`AtomicU64`, `AtomicPtr<T>`, `AtomicU8..AtomicU64`, `AtomicI8..AtomicI64`
- Memory orderings: `Relaxed` (no ordering), `Acquire` (no reads/writes move before this load), `Release` (no reads/writes move after this store), `AcqRel` (both), `SeqCst` (total order across all SeqCst ops)
- Happens-before relations: how Acquire/Release pairs establish synchronization (message-passing pattern)
- Compare-and-swap loops: `compare_exchange(weak/strong)` semantics, expected value update on failure, ABA problem discussion
- Fetch-and-update ops: `fetch_add`, `fetch_or`, `fetch_update` — when a single RMW suffices vs CAS loops
- Cache coherence protocols (MESI) at the hardware level; false sharing (two atomics/fields on one cache line ping-ponging between cores); `#[repr(align(64))]` padding to separate hot counters
- Atomics vs. locks performance: uncontended atomic RMW ~10–40 cycles vs. futex mutex uncontended ~20ns; contention behavior differences
- `AtomicPtr<T>` and pointer provenance; atomic loads/stores on raw pointers (unstable `atomic_ptr` extras)
- `portable-atomic` crate for platforms lacking 64-bit atomics
- Lock-free data structure basics: Michael-Scott queue conceptually, hazard pointers/epoch-based reclamation problem (why lock-free is hard in Rust: memory reclamation) — crates: `crossbeam-epoch`, `arc-swap` for lock-free swapping of `Arc`
- `arc_swap::ArcSwap<T>`: RCU-style read-mostly sharing — readers pay atomic load only
- `once_cell`/`OnceLock` internally built on atomics

**Theoretical Rules & Contracts**
- Ordering correctness contract: getting orderings wrong = data races/UB even with atomics (the compiler and CPU may reorder); rule of thumb: release store after writing shared data, acquire load before reading it, relaxed only for counters where staleness is acceptable
- `SeqCst` default — audit to weaker orderings only with proofs
- Atomicity scope: operations on atomics are atomic; compound multi-field invariants require locks or careful ordering proofs

**Production Edge Cases & Bugs**
- `Relaxed` ordering bugs: counters fine, flags wrong — the classic "flag published with relaxed" message-passing failure
- CAS retry loops burning CPU under contention vs. `Mutex` backing off to futex; benchmark before lock-free claims
- False sharing destroying scalability of a sharded counter array — measure with `perf c2c`
- ABA problem in CAS-based freelists when reusing node memory — tag pointers or use epoch reclamation
- Signals/handlers: `AtomicBool` as async-signal-safe communication (signal handlers can't lock)

**Interview Trivia & Idiomatic Patterns**
- Q: "Explain Acquire/Release with a message-passing example." — Writer stores data then `store(true, Release)`; reader `load(Acquire)` sees true → data visible.
- Q: "When is `SeqCst` needed?" — Rarely; single total order requirements (e.g., Dekker-style mutual exclusion). Start SeqCst, relax with proof.
- Idiomatic: use `AtomicUsize` counters with `Relaxed`; use acquire/release for shutdown flags and handoffs
- Pattern: `arc_swap` for configuration hot-reload (read config without locks)
- Anti-pattern: hand-rolled spinlocks in userspace services (waste CPU, priority inversion)

### Chapter 3.4: Channels & Message Passing

#### In plain English

**The problem:** Sharing data behind locks makes threads depend on each other. **The fix:** let threads talk by sending messages instead. One side puts a message on a channel, the other takes it off, and ownership of the message travels with it. **The twist:** after you send a value you can no longer touch it, so there is nothing left to race on. The slogan: share memory by communicating, not communicate by sharing memory.

> **Imagine:** A conveyor belt in a factory. Several workers put boxes on one end, one worker takes them off the other end. If the belt is full, the people loading must wait: that waiting is called back-pressure and it stops the factory drowning in boxes.

```diagram
{"n":"A:Producer 1:0:0|B:Producer 2:0:1|C:Channel queue:1:0|D:Consumer:2:0|E:!Back-pressure when a bounded queue is full:1:1","e":"A>C:send|B>C:send|C>D:recv|C>E:full|E>A:producer waits"}
```

| Channel | Producers / consumers | Bounded? | Use when |
| --- | --- | --- | --- |
| `std::sync::mpsc::channel` | Many / one | No | Simple threaded programs |
| `std::sync::mpsc::sync_channel(n)` | Many / one | Yes | You want back-pressure |
| `crossbeam` channels | Many / many | Either | High-performance thread pools |
| `tokio::sync::mpsc` | Many / one | Yes (bounded) | Async tasks |
| `tokio::sync::oneshot` | One / one, once | – | A single reply to a request |
| `tokio::sync::broadcast` / `watch` | One or many / many | Yes | Fan-out and “latest value” updates |

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::sync_channel::<String>(2);   // room for 2 waiting messages
    let mut producers = vec![];
    for id in 0..3 {
        let tx = tx.clone();                           // one sender per producer
        producers.push(thread::spawn(move || {
            tx.send(format!("job from producer {id}")).unwrap();
        }));
    }
    drop(tx);                                          // close the original sender
    let mut got = vec![];
    for msg in rx { got.push(msg); }                   // ends when all senders are gone
    for p in producers { p.join().unwrap(); }
    got.sort();
    println!("{:?}", got);
}
```

**Rule:** always bound your queues in services. An unbounded channel is a memory leak waiting for a traffic spike.

#### The full technical detail


**Low-Level Mechanics & Internals**
- `std::sync::mpsc`: multi-producer single-consumer; `Sender`/`Receiver` split, `send` (sync, blocks if disconnected→err), `try_send`, `recv` blocking, `try_recv`, `iter()` and `into_iter()` semantics; channel disconnect semantics (send fails when all receivers dropped)
- `std::sync::mpsc` bounded variants: `sync_channel(capacity)` — rendezvous (0) and bounded channels; backpressure by construction
- `crossbeam-channel`: MPMC support, bounded/unbounded, `select!` macro for multiplexing multiple channel operations, `select` timeouts, faster implementation than std
- `tokio::sync::mpsc`/`broadcast`/`watch`/`oneshot`: async channel family — `mpsc::channel(cap)` bounded with backpressure; `broadcast` for pub/sub (lagging receiver error semantics: `Lagged(n)`); `watch` for single-value broadcast with change notifications; `oneshot` for single value (task result return channels)
- `select!` in async: biased vs. randomized polling order (`select!` is biased — first ready branch wins deterministically; use `tokio::select!` with random order via ` biased;` suppression)
- Channel capacity design: unbounded queues as latency bombs (memory growth under load); Little's law intuition for sizing
- `flume` as a bounded channel with sync+async `send`/`recv` APIs
- Actor-model patterns on top of channels: task owns state, receives messages (the "share state by communicating" philosophy vs. "communicate by sharing state")

**Theoretical Rules & Contracts**
- Ownership transfer through channels: sending moves ownership — channels are Send-based, integrating with the type system (send a `Box<T>`, receiver owns it)
- Backpressure contract: bounded channels push back to senders (block/timeout/try); unbounded channels hide overload until OOM
- Disconnection semantics: receivers get `Err(RecvError)` when senders drop (and vice versa) — graceful shutdown detection
- `select!` cancellation safety of each branch's operations (Tokio's documented cancellation-safety per method)

**Production Edge Cases & Bugs**
- Unbounded channel + slow consumer = OOM; the production incident pattern: always bound queues, monitor depth metrics
- `select!` bias: high-traffic branch starving others — randomized polling, or separate tasks per branch
- Sending on a channel from a `Drop` impl panicking on disconnect — handle `SendError` explicitly in shutdown paths
- `tokio::sync::mpsc` `Permit` APIs for reserving capacity before expensive work; `try_send` lossy patterns for telemetry
- Watch channel: only latest value matters (config, metrics) — receivers always get current or `Changed` error
- Graceful shutdown: close channel (drop sender), workers drain, join handles awaited — the full shutdown choreography

**Interview Trivia & Idiomatic Patterns**
- Q: "Bounded vs unbounded channels?" — Bounded applies backpressure; unbounded queues absorb load until memory exhaustion.
- Q: "mpsc vs broadcast vs watch?" — mpsc: work distribution; broadcast: fan-out with per-consumer lag tracking; watch: always-latest state.
- Idiomatic: share-nothing tasks connected by bounded mpsc; `Arc<Mutex>` only for truly shared aggregates
- Pattern: request/response over channels with oneshot reply slots; actor-per-entity with mailbox
- Anti-pattern: global `lazy_static` unbounded channels for request paths


## Module 4: Async Rust & Runtime Internals

### Overview – Async: waiting without wasting a worker

**The problem:** A web server spends most of its time waiting: for the network, the database, a file. If every waiting request holds a whole thread, ten thousand visitors need ten thousand threads, and the machine drowns in memory and switching. **The fix:** async Rust lets one thread juggle many jobs. When a job has to wait, it says “wake me later” and the thread moves on to another job. **The twist:** Rust has no async engine built in. You pick a runtime (almost everybody picks Tokio), and the compiler turns every `async` function into a small state machine that the runtime can pause and resume.

> **Imagine:** A waiter who serves many tables. A bad waiter stands at one table until the food is cooked. A good waiter takes the order, goes to the next table, and returns when the kitchen rings the bell.

```diagram
{"n":"A:What is your job mostly doing:0:0|B:Waiting on network or disk:1:0|C:Heavy calculation:1:1|D:!async tasks on Tokio:2:0|E:!Threads or a rayon pool:2:1","e":"A>B|A>C|B>D:thousands of connections|C>E:uses every core"}
```

| | Threads | Async tasks |
| --- | --- | --- |
| Cost of one | Megabytes of reserved stack, OS bookkeeping | Often only hundreds of bytes to a few KB |
| How many you can have | Thousands | Hundreds of thousands |
| Best at | CPU-heavy work | Waiting-heavy work (I/O) |
| Who switches between jobs | The operating system | Your code, at each `.await` |
| Main danger | Memory and context switching | Blocking the thread by accident |

### Chapter 4.1: Futures & the Poll Model

#### In plain English

**The problem:** A function that needs to wait normally freezes its thread until the answer arrives. **The fix:** an async function does not run to the end immediately. It returns a **Future**: a value that stands for “work not finished yet”. A runtime repeatedly asks the future “are you done?” by calling `poll`. The answer is either `Ready(value)` or `Pending`. **The twist:** a future that says `Pending` also promises to ring a bell (the **Waker**) when it can make progress, so the runtime does not need to keep asking.

> **Imagine:** A restaurant buzzer. You order, you are handed a buzzer (the future) and you sit down. The kitchen presses the buzzer (wake) when your food is ready, and only then does the waiter bring it. Until someone polls it, a future does nothing at all: futures are lazy.

```sequence
{"p":"E:Executor|F:Your future|O:OS or timer","m":"E>F:poll|F>O:register the waker|F>E:~Pending|O>E:wake up the task|E>F:poll again|F>E:~Ready with the value"}
```

1. The executor polls the future for the first time.
2. The future cannot finish, so it tells the OS or a timer: “wake me through this waker”.
3. It returns `Pending` and the executor moves on to other tasks.
4. Later the OS signals that the data arrived, and the waker puts the task back in the queue.
5. The executor polls again and the future returns `Ready` with the result.

| Word | Plain meaning |
| --- | --- |
| `Future` | A value that will produce a result later |
| `poll` | “Can you make progress now?” |
| `Poll::Pending` | “Not yet, I will wake you” |
| `Poll::Ready(v)` | “Done, here is the value” |
| `Waker` | The bell the future rings when it is worth polling again |
| Executor | The loop that polls futures (Tokio is one) |
| Reactor | The part that listens to the OS for I/O events |

Here is a complete future written by hand, so you can see that there is no magic. It counts down, asking to be polled again each time, and a tiny executor drives it:

```rust
use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll, RawWaker, RawWakerVTable, Waker};

struct Countdown(u32);

impl Future for Countdown {
    type Output = &'static str;
    fn poll(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        if self.0 == 0 {
            Poll::Ready("liftoff")
        } else {
            println!("T-minus {}", self.0);
            self.0 -= 1;
            cx.waker().wake_by_ref();   // "poll me again soon"
            Poll::Pending
        }
    }
}

fn noop_waker() -> Waker {
    fn clone(_: *const ()) -> RawWaker { RawWaker::new(std::ptr::null(), &VTABLE) }
    fn nothing(_: *const ()) {}
    static VTABLE: RawWakerVTable = RawWakerVTable::new(clone, nothing, nothing, nothing);
    unsafe { Waker::from_raw(RawWaker::new(std::ptr::null(), &VTABLE)) }
}

fn block_on<F: Future>(fut: F) -> F::Output {
    let mut fut = Box::pin(fut);
    let waker = noop_waker();
    let mut cx = Context::from_waker(&waker);
    loop {
        if let Poll::Ready(v) = fut.as_mut().poll(&mut cx) { return v; }
    }
}

fn main() {
    println!("{}", block_on(Countdown(3)));
}
```

Real runtimes do the same job far more cleverly: they sleep until the OS reports an event instead of polling in a loop.

#### The full technical detail


**Low-Level Mechanics & Internals**
- `Future` trait: `type Output`, `poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output>` — the core abstraction; futures are inert state machines until polled
- `Poll<T>`: `Ready(v)` / `Pending`; the `Waker` contract: if `Pending`, the future must arrange for `wake()` when progress is possible
- `Context` and `Waker`: `RawWaker` vtable mechanics (`clone`, `wake`, `wake_by_ref`, `drop`) — how runtimes implement wakers (task entry refcounting, thread-pool notification)
- Futures as state machines: `async fn` desugars to an anonymous `impl Future` enum; each `.await` a state; captured variables become struct fields; size = max variant footprint; pinning guarantees the state machine isn't moved while self-referential
- `Pin<P>` mechanics revisited for futures: `poll` requires `Pin<&mut Self>` because the state machine may hold pointers into itself across yields
- Manual `Future` implementations: implementing `poll` for timers, streams; the `poll_fn` helper; `FusedFuture`/`FusedStream` (poll_after_ready contract) from `futures` crate
- Stream trait (futures-rs): `poll_next` — async iterator protocol; `StreamExt` combinators (`next()`, `map`, `filter`, `fold`, `buffer_unordered` for concurrency control)
- `AsyncRead`/`AsyncWrite` (futures + tokio versions) — the I/O readiness model
- `FutureExt`/`TryFutureExt` combinators: `map`, `then`, `and_then`, `or_else`, `inspect`, `boxed()`/`boxed_local()` — heap-allocating futures for type-erasure in trait objects
- `join!`, `try_join!`, `select!`, `race!` combinators semantics; ` FuturesUnordered` set for dynamic fan-out

**Theoretical Rules & Contracts**
- Inertness contract: a future does nothing until polled; polling drives progress; never poll after `Ready` (panic or UB per `FusedFuture` contract)
- Waker contract: spurious wakes allowed; lost wakeups forbidden; `wake()` consuming vs. `wake_by_ref()`
- Cancellation contract: dropping a future cancels it at its next suspension point — drop = cancellation; `Drop` of in-flight futures runs cleanup (guard types), but no further progress occurs
- Pin contract: after first poll, future must not move; `Unpin` futures may be moved freely
- Cooperative scheduling contract: `poll` must be fast and non-blocking; a long `poll` blocks the executor

**Production Edge Cases & Bugs**
- Pin projection errors in hand-written combinators — using `pin-project`/`pin-project-lite` crates for sound field projections
- Lost wakeups from custom `Future` impls forgetting to store the waker — hangs under specific timing
- Polling futures after completion (type-eraser bugs) — use `FusedFuture` guards
- Cancellation mid-flight: connection pools, transactions — use drop guards (`scopeguard`) or explicit cancellation tokens
- `select!` in loops recreating futures each iteration (losing state) — pattern-bind outside the loop or use `pin_mut!`
- `async` blocks capturing environment by reference unexpectedly — `async move` semantics

**Interview Trivia & Idiomatic Patterns**
- Q: "What does `.await` desugar to?" — A state machine poll loop: `loop { match fut.poll(cx) { Ready(v) => break v, Pending => yield } }` roughly, within the outer future.
- Q: "How does cancellation work?" — Drop the future; destructors run, no resumption. Design cleanup with drop guards.
- Idiomatic: implement `Future` manually only at framework boundaries; use combinators elsewhere
- Pattern: `FuturesUnordered` + `buffer_unordered(n)` for bounded concurrent I/O fan-out
- Anti-pattern: blocking calls (`std::thread::sleep`, sync I/O, `reqwest::blocking`) inside async contexts — blocking the executor thread

### Chapter 4.2: async/await Desugaring & Pinning in Practice

#### In plain English

**The problem:** A function that can pause in the middle has to remember where it was and what its local variables held. **The fix:** the compiler rewrites each `async fn` into a state machine, an enum with one variant per `.await` point, holding exactly the variables needed across the pause. `.await` means “if the thing is not ready, pause here and give the thread back”. **The twist:** that state machine can contain references into itself, so once it starts it must not be moved in memory. `Pin` is the promise that it will stay put. Most of the time you meet it only as `Box::pin(...)`.

> **Imagine:** A bookmark inside a book. The bookmark is only meaningful if the book stays where it is; if you copied the pages somewhere else while the bookmark still pointed at the old pages, you would be lost. `Pin` nails the book to the table.

```diagram
{"n":"A:Start:0:0|B:Waiting at first await:1:0|C:Waiting at second await:2:0|D:!Done with result:3:0","e":"A>B:run until await|B>C:data arrived|C>D:data arrived"}
```

| You write | The compiler builds | What to watch |
| --- | --- | --- |
| `async fn f()` | A hidden type that implements `Future` | Nothing runs until it is awaited or spawned |
| `.await` | A pause point in the state machine | Every `.await` is a place the task may switch |
| Local variables used after an `.await` | Fields of the state machine | The future gets bigger, and must be `Send` to cross threads |
| A recursive `async fn` | An infinitely sized type | Box it: `Box::pin(f(n - 1))` |
| `Pin<Box<dyn Future>>` | A future you can store or return without naming its type | Small heap allocation |

```rust
use std::time::Duration;

async fn price(item: &str) -> u32 {
    tokio::time::sleep(Duration::from_millis(50)).await;   // pause, not block
    item.len() as u32
}

#[tokio::main]
async fn main() {
    let f = price("apple");          // nothing has run yet: futures are lazy
    println!("created");
    println!("{}", f.await);         // now it runs
}
```

(The examples that use `tokio` need `tokio = { version = "1", features = ["full"] }` in `Cargo.toml`.)

**Common compile error:** “future cannot be sent between threads safely”. It usually means a non-`Send` value (such as an `Rc` or a `std` mutex guard) is still alive across an `.await`. Finish with it in a smaller block before the await.

#### The full technical detail


**Low-Level Mechanics & Internals**
- Full desugaring walkthrough: `async fn f(x: u8) -> u8` → `fn f(x: u8) -> impl Future<Output = u8>` returning a generated enum state machine; `.await` points as discriminant variants; variables live across awaits stored as fields
- `async move` vs `async`: capture mode differences (borrows vs moves)
- State machine size analysis: `size_of_val(&future)` implications for stack/heap; `Box::pin` for large futures; `#[inline(never)]` effects
- `pin_mut!`/`tokio::pin!` macros for stack pinning; `Box::pin(future)` for heap pinning
- `impl Future` in traits (stable since 1.75) and `async fn` in traits — desugaring to `impl Future`, and the associated-type-impl-trait mechanics
- `async_trait` crate legacy: boxing trait futures (`Pin<Box<dyn Future + Send + 'async_trait>>`) vs. native async fn in traits (static dispatch, no boxing); `Send` bounds implications
- Pin projections: structural pinning rules (pin-project crate), why `#[repr(packed)]`-style moving of pinned data is UB
- `Unpin` auto-trait: almost everything is `Unpin` except self-referential generators; explicit `impl !Unpin` via `PhantomPinned`

**Theoretical Rules & Contracts**
- Auto-trait leakage rule: `impl Future` hides auto-traits; explicit bounds needed (`+ Send`) when required — the classic "future is not Send" debugging workflow
- Capture rules (edition 2021+): disjoint capture in closures; `async` capture of individual fields
- Drop order in state machines: fields drop in declaration order when future is dropped at an await point

**Production Edge Cases & Bugs**
- Future not `Send` diagnostics: holding `Rc`, `RefCell` guard, or `MutexGuard` (std) across `.await` — fix by restructuring or `tokio::sync::Mutex`
- Trait objects with async methods: native vs `async_trait` decision; `dyn` compatibility requires boxing (native async-in-trait isn't object-safe without boxing)
- Large futures in trait objects: `BoxFuture<'static, T>` = `Pin<Box<dyn Future<Output=T> + Send + 'static>>`
- Accidentally requiring `Send` by spawning when a local pool (e.g., `futures::executor::block_on` in tests) would do — over-constraining design
- Dropping the wrong side of a select/race — loser cancellation semantics

**Interview Trivia & Idiomatic Patterns**
- Q: "Why do async fns return impl Future and not dyn?" — Monomorphization: static dispatch, inlining, no boxing; `impl Trait` preserves concrete type while hiding it.
- Q: "Why is Pin needed?" — Self-referential state machines would dangle if moved between polls.
- Idiomatic: `#[allow(clippy::large_futures)]` — actually address large futures by boxing hot async fns
- Pattern: `async fn` in traits for repository/service interfaces in app code; `#[async_trait]` only for `dyn` needs

### Chapter 4.3: Tokio Runtime Internals

#### In plain English

**The problem:** Having futures is not enough; something must run them, and the way it does so decides how fast and how fair your service is. **The fix:** the Tokio runtime owns a small set of worker threads, usually one per CPU core. Spawned tasks wait in queues. An idle worker **steals** tasks from a busy worker’s queue. A separate reactor listens to the operating system (epoll, kqueue, IOCP) and wakes tasks when their I/O is ready. A separate pool of extra threads exists for work that must block. **The twist:** a task only gives up its thread at an `.await`. A task that does a long calculation or a blocking call without awaiting holds its worker hostage, and everything queued on that worker stalls.

> **Imagine:** A restaurant with a few waiters and a pile of order tickets. Waiters with nothing to do take tickets from busy colleagues. If one waiter stops to chat with a customer for ten minutes (blocking), all the tickets on that waiter’s list wait.

```diagram
{"n":"A:Tasks spawned:0:0|B:Worker threads with work stealing:1:0|C:Reactor listens to the OS:2:0|D:Blocking pool for slow chores:1:1|E:!Results sent back:2:1","e":"A>B:queue|B>C:wait for I/O|C>B:wake task|B>D:spawn_blocking|D>E|B>E"}
```

| Tool | Use it for | Do not use it for |
| --- | --- | --- |
| `tokio::spawn` | Running an async task concurrently | Heavy CPU loops |
| `tokio::task::spawn_blocking` | Blocking calls, file work, heavy CPU, hashing | Short async work |
| `tokio::time::sleep` | Waiting inside async code | – |
| `std::thread::sleep` | Never inside a task | It freezes the worker thread |
| `std::sync::Mutex` | Short locks that never cross an `.await` | Locks held while awaiting |
| `tokio::sync::Mutex` | A lock that must be held across `.await` | Quick counters (use atomics) |
| `#[tokio::main(flavor = "current_thread")]` | Tests, simple tools | High-throughput servers |

```rust
use std::time::Duration;

#[tokio::main]
async fn main() {
    // Good: heavy or blocking work moves to the blocking pool.
    let hashed = tokio::task::spawn_blocking(|| {
        (0..5_000_000u64).fold(0u64, |a, b| a.wrapping_add(b * b))
    });

    // Meanwhile async tasks keep running on the workers.
    let ticker = tokio::spawn(async {
        for i in 0..3 {
            tokio::time::sleep(Duration::from_millis(10)).await;
            println!("tick {i}");
        }
    });

    ticker.await.unwrap();
    println!("hash = {}", hashed.await.unwrap());
}
```

**Symptoms of blocking the runtime:** latency spikes on all endpoints at once, health checks timing out, and tokio-console showing tasks with very long “busy” times (Module 7).

#### The full technical detail


**Low-Level Mechanics & Internals**
- Tokio architecture: multi-threaded work-stealing scheduler (`runtime::Builder::new_multi_thread`); worker threads, local run queues (FIFO) + global injection queue; work-stealing mechanics (steal half the local queue)
- Current-thread scheduler (`new_current_thread`) — single-threaded, `LocalSet` for `!Send` tasks, lower latency for I/O-bound small services
- Task system: `tokio::spawn` requirements (`Future + Send + 'static`, `Sized` — hence boxing for big futures); task budget (cooperative scheduling via `poll_budget` / task yielding); task-local storage (`tokio::task_local!`)
- I/O driver: epoll (Linux) / kqueue (BSD/macOS) / IOCP (Windows) reactor; how `AsyncFd`/`PollEvented` register interest; readiness vs. completion models (IOCP's completion-based model abstraction)
- Timer system: hierarchical timer wheel implementation (Tokio's time wheel), `sleep`, `interval`, `timeout`; timer resolution and drift; `interval` burst behavior (`MissedTickBehavior`)
- `spawn_blocking`: separate blocking thread pool (default 512 threads, grows) for CPU-heavy or blocking syscalls; semaphore-guarded; queue depth monitoring (`num_blocking_threads`, queue metrics)
- Runtime handles: `Handle::current`, `spawn` from non-runtime contexts; `Runtime::block_on` as entry; `enter` semantics (thread-local runtime context)
- `LocalSet`/`spawn_local`: `!Send` tasks on current-thread runtime; `!Send` futures like `Rc` state
- Cooperative scheduling: `tokio::task::consume_budget`, `yield_now`, automatic preemption points (` coop` module) preventing a single task from starving the reactor; blocking detection (Tokio's `blocking` thread warnings)
- `tokio::time` pause/advance for tests (`start_paused`)
- Feature flags: `rt-multi-thread`, `macros`, `time`, `net`, `sync`, `parking_lot` etc. — compile-time surface reduction
- Comparison: `async-std` (spawned-thread model), `smol` (minimal composable), `monoio` (thread-per-core io_uring), `glommio`; Tokio's maturity and ecosystem gravity

**Theoretical Rules & Contracts**
- Executor contract: poll futures until Pending, park thread when no work; wake → schedule; never block inside `poll`
- `spawn` contract: tasks must be `Send + 'static` (multi-thread); detached on spawn (no join handle unless requested via `JoinSet`)
- Blocking contract: blocking operations (sync file I/O before io_uring, CPU compute > ~100μs, `thread::sleep`) must go to `spawn_blocking` — the runtime cannot preempt a running `poll`
- Timer contract: `sleep` is not precise at sub-millisecond on multi-thread (default 1ms granularity current-thread, ~50ms-1s drift multi-thread without `--cfg tokio_unstable` time source tuning)

**Production Edge Cases & Bugs**
- **Blocking the event loop** — the #1 production async bug: `std::fs::read`, `reqwest::blocking`, heavy JSON parsing, or a tight compute loop inside an async fn stalls all tasks on that worker; detection via tokio-console (tasks stuck in running state), p99 latency spikes, CPU profiles; fix via `spawn_blocking`, `rayon`, or offloading
- Holding `std::sync::MutexGuard` across `.await` → compile error (good); but `parking_lot::MutexGuard` is `Send` under some configs — accidentally moving lock to another thread = logic races
- `tokio::spawn`ing tasks that must complete before response (fire-and-forget request-scoped work lost on shutdown) — use `JoinSet`, spawn in scope, or track handles
- Blocking thread pool exhaustion: 512 `spawn_blocking` tasks queued → semaphore stall; monitor `tokio::runtime::Handle` metrics; cap with own semaphore
- Timer overload: thousands of `sleep`s — timer wheel handles it, but `interval` with `MissedTickBehavior::Burst` causes catch-up storms; use `Delay`/`Skip`
- Runtime in library code: libraries must not build runtimes; accept `&Handle` or use `Handle::try_current`
- `block_on` inside `block_on` (nested runtime enter) → panic; `Handle::block_on` misuse in `spawn_blocking` contexts

**Interview Trivia & Idiomatic Patterns**
- Q: "Tokio multi-thread scheduler mechanics?" — N worker threads, per-worker run queues, work-stealing from the global queue (steal-half), epoll reactor waking idle workers via wakers/parking.
- Q: "Task vs thread?" — Task = lightweight future scheduled on threads; thousands of tasks per thread; context switch via poll, no kernel involvement.
- Q: "Why is `spawn_blocking` needed?" — The executor can't preempt a blocking `poll`; blocking starves the shared worker.
- Idiomatic: one runtime per process (main), `Handle` propagation; `JoinSet` for structured task management and await-all semantics
- Idiomatic: timeouts on every external call (`tokio::time::timeout`); `#[tokio::main(flavor = "current_thread")]` for lean binaries
- Pattern: `JoinSet` fan-out with bounded concurrency; `CancellationToken` (tokio-util) for coordinated shutdown

### Chapter 4.4: Tasks vs Threads, Async Traits & Structured Concurrency

#### In plain English

**The problem:** Real services run many things at once, must cope with cancellation (a client hangs up), must stop cleanly when told to, and want to describe async work in traits. **The fix:** tasks are tiny, cheap units of work spawned with `tokio::spawn`; tools such as `join!`, `select!`, `JoinSet` and `timeout` combine them; a `CancellationToken` tells groups of tasks to stop; and since Rust 1.75 traits can contain `async fn` directly. **The twist:** cancelling is just dropping a future. Whatever it was in the middle of is abandoned at its last `.await`, so every await point must leave your data in a valid state (“cancel safety”).

> **Imagine:** A project manager (the parent task) hands tasks to helpers. If the project is cancelled, everyone must put their tools down at a safe point, and the manager waits until they have all stopped before closing the office. That is structured concurrency.

```sequence
{"p":"O:Operating system|M:Main task|T:Worker tasks|S:Server","m":"O>M:SIGTERM arrives|M>S:stop accepting new requests|M>T:cancel token fired|T>M:~in-flight work finished|M>M:close the database pool|M>O:~exit cleanly"}
```

1. The platform (Kubernetes, systemd) asks the program to stop.
2. The main task stops accepting new connections.
3. It fires a cancellation token; workers finish the current job and stop.
4. Once everything has drained, resources such as database pools are closed.
5. The process exits with success, and nobody lost a request.

| Tool | Plain meaning |
| --- | --- |
| `tokio::join!(a, b)` | Run both together, wait for both |
| `tokio::select!` | Run several, continue with the first to finish, drop the rest |
| `tokio::time::timeout(d, fut)` | Give up if it takes too long |
| `JoinSet` | A group of tasks you can wait for and cancel together |
| `CancellationToken` | A shared “please stop” signal |
| `async fn` in a trait | Native since Rust 1.75; for `dyn Trait` use the `async-trait` crate |
| `Send` bound | A spawned future must be `Send`, so values held across `.await` must be too |

| | OS thread | Tokio task |
| --- | --- | --- |
| Created by | `std::thread::spawn` | `tokio::spawn` |
| Memory | Large reserved stack | Just the state machine |
| Switching | By the OS, anywhere | Only at `.await` |
| Good for | CPU work, blocking libraries | Many waiting connections |

```rust
use std::time::Duration;
use tokio::time::{sleep, timeout};

async fn slow_lookup() -> &'static str {
    sleep(Duration::from_millis(200)).await;
    "found"
}

#[tokio::main]
async fn main() {
    // join!: both run at the same time, total time is the longest one
    let (a, b) = tokio::join!(slow_lookup(), slow_lookup());
    println!("{a} {b}");

    // timeout: stop waiting after 50 ms (the future is dropped = cancelled)
    match timeout(Duration::from_millis(50), slow_lookup()).await {
        Ok(v) => println!("{v}"),
        Err(_) => println!("too slow"),
    }
}
```

#### The full technical detail


**Low-Level Mechanics & Internals**
- Task model: `tokio::task::JoinHandle<T>` — abortable (`abort()`), `await`able for result; `JoinError` on panic/abort/cancellation detection; detached tasks by default
- `JoinSet<T>`: dynamic task collection, `join_next()` semantics, abort-all on drop, driving many tasks to completion
- `JoinHandle::abort` semantics: cancellation at next yield point; aborted task's destructors run; no `Output` produced
- Structured concurrency primitives: `tokio::task::JoinSet`, `FuturesUnordered`, scopes via crates (`async-scoped` unsafe API) or the `tokio::task::JoinSet` + manual join patterns; cancellation tokens (`tokio_util::sync::CancellationToken`) — child tokens, `cancelled().await`, drop-tree cancellation
- Async traits in depth: native `async fn` in traits (1.75+), `impl Trait` in trait methods (RPITIT), auto-trait leakage (`Send` issues) — explicit `+ Send` bounds on trait method futures; object-safety: async methods not object-safe → `async_trait` boxing or generic dispatch; static vs. dynamic dispatch trade-offs for repositories/handlers
- `async closures` (1.85+): `async |x| ...` closures and higher-ranked lifetimes
- `async` iterators (unstable `async_iter`/`AsyncIterator` trait) vs. streams today
- `async move` in trait impls capturing self; lifetime of returned futures from trait methods
- `Stream` ecosystem completeness: `tokio-stream` for converting channels/timers to streams, `async-stream` crate for `stream!`/`try_stream!` macros
- Spawn-per-connection vs. multiplexed task architectures; request-scoped task spawning and `JoinHandle` retention (leak-on-drop-detach)

**Theoretical Rules & Contracts**
- Structured concurrency principle: spawned work must outlive-completable by parent — no leaked tasks; `JoinSet` drop aborts children
- `JoinError` contract: `is_cancelled()`, `is_panic()`; panics in tasks are caught by runtime, surfaced through JoinHandle
- Cancellation token contract: cooperative — checks at explicit points; never forceful (compare thread interruption)
- Object safety of async traits: `dyn` requires boxing futures (`async_trait`); or use generics (static dispatch, code bloat vs. performance)

**Production Edge Cases & Bugs**
- Leaked detached tasks holding DB connections/sockets after client disconnect — track JoinHandles or use cancellation tokens
- Abort vs cancellation confusion: `abort()` then awaiting handle returns `JoinError::cancelled` — distinguishing from panics in telemetry
- Async trait + `Send` debugging: trait used across `.await` in spawned tasks requires `Future + Send` — bound explosion and `#[async_trait(?Send)]` accidental footguns
- Holding `JoinSet` results when tasks panic: a panicked task in `join_next` yields `Err` — policy: propagate, log, restart
- Cancellation-safety of `select!`ed operations: `tokio::sync::mpsc::recv` is cancellation-safe; `AsyncReadExt::read_exact` partially fills buffers on cancel — document per-op safety

**Interview Trivia & Idiomatic Patterns**
- Q: "How do you do structured concurrency in Tokio?" — `JoinSet` + cancellation tokens; no standard scope (yet), unlike structured concurrency crates.
- Q: "When is `async_trait` still needed?" — `dyn Trait` dispatch; native async-in-trait is static-dispatch only (and not object-safe).
- Idiomatic: pass `CancellationToken` into long-running services; check `token.cancelled()` between work units
- Pattern: trait objects with boxed futures: `type BoxFuture<'a, T> = Pin<Box<dyn Future<Output = T> + Send + 'a>>`
- Anti-pattern: `tokio::spawn` without retaining handle in request scope (invisible task leaks)


## Module 5: Web Ecosystem & API Development

### Overview – What happens when a request reaches your server

**The problem:** A web service has to do many small jobs for every request: read the URL, check who is calling, decode the data, run the business logic, talk to the database and write the answer. Mixing all that in one place becomes unmaintainable. **The fix:** Rust web services are built in layers. Tokio runs the work, Hyper speaks HTTP, Tower provides the middleware chain, Axum maps URLs to your functions, and Serde translates between JSON and Rust types. **The twist:** each layer is a small, typed building block, so mistakes such as a missing field or a wrongly ordered middleware are found at compile time or in a test, not in production.

> **Imagine:** A hotel. The front door (Hyper) lets guests in, security and reception (Tower middleware) check them, the concierge (Axum router) sends each guest to the right department (your handler), a translator (Serde) converts their language, and the back office (database) keeps the records.

```sequence
{"p":"C:Client|M:Middleware|R:Router|H:Handler|D:Database","m":"C>M:HTTP request|M>R:checked and logged|R>H:matched route and extracted data|H>D:query|D>H:~rows|H>R:~response value|R>C:~HTTP response"}
```

| Layer | Crate | Its job in one line |
| --- | --- | --- |
| Runtime | `tokio` | Runs async tasks and I/O |
| HTTP | `hyper` | Reads and writes HTTP messages |
| Middleware | `tower`, `tower-http` | Reusable steps around every request |
| Framework | `axum` | Routes, extractors, responses |
| JSON | `serde`, `serde_json` | Convert between text and Rust types |
| Database | `sqlx` | Talk to the database (Module 6) |

### Chapter 5.1: Axum Fundamentals (and Actix-web Comparison)

#### In plain English

**The problem:** Each request carries information in different places: the URL path, the query string, headers, a JSON body. Your function wants clean, typed values. **The fix:** in Axum a handler is just an `async fn`. Its parameters are **extractors**: types such as `Path`, `Query`, `Json` and `State` that Axum fills in from the request. Its return value is anything that can become a response. **The twist:** if an extractor cannot be built (bad JSON, wrong id type), Axum answers with a 4xx error before your code even runs, so the handler only sees valid data.

> **Imagine:** A reception desk. The receptionist reads the form, pulls out the name, the appointment number and the notes, and only then hands you a tidy folder. You never deal with a form that was filled in wrongly.

```diagram
{"n":"A:Request arrives:0:0|B:Router matches path and method:1:0|C:Extractors build typed values:2:0|D:Your handler runs:2:1|E:!IntoResponse becomes the HTTP reply:1:1|F:!Rejection gives 400 or 422:3:0","e":"A>B|B>C|C>D:valid|D>E|C>F:invalid"}
```

| Extractor | Reads from | Example |
| --- | --- | --- |
| `Path<T>` | The URL path | `/users/42` gives `42` |
| `Query<T>` | After the question mark | `?page=2&size=10` |
| `Json<T>` | The request body | `{"name":"Asha"}` |
| `State<T>` | Shared app data | Database pool, settings |
| `HeaderMap` | Headers | `Authorization` |

| | Axum | Actix-web |
| --- | --- | --- |
| Built on | Tokio, Hyper, Tower | Its own actor-influenced core on Tokio |
| Middleware | Tower layers, shared with the wider ecosystem | Its own middleware system |
| Style | Plain async functions and extractors | Similar, with its own macros |
| Choose when | You like Tower and want fewer special concepts | Your team already knows it |

```rust
use axum::{extract::{Path, State}, routing::get, Json, Router};
use serde::Serialize;
use std::sync::Arc;

#[derive(Clone)]
struct AppState { app_name: Arc<String> }

#[derive(Serialize)]
struct Greeting { message: String }

// Extractors in the parameters; Json<T> is the response.
async fn hello(State(s): State<AppState>, Path(name): Path<String>) -> Json<Greeting> {
    Json(Greeting { message: format!("Hello {name} from {}", s.app_name) })
}

#[tokio::main]
async fn main() {
    let state = AppState { app_name: Arc::new("demo".into()) };
    let app = Router::new().route("/hello/:name", get(hello)).with_state(state);
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();   // axum 0.7 style
}
```

**Rule:** the extractor that reads the body (`Json`, `Bytes`, `Form`) must be the **last** parameter, because the body can only be read once. Keep handlers thin: extract, call a service function, map the result.

#### The full technical detail


**Low-Level Mechanics & Internals**
- Axum architecture: built on Hyper/HTTP crate foundations and Tower's `Service` abstraction; the `Router` → route → handler model; handlers as async fns whose parameters are extractors and whose return implements `IntoResponse`
- Handler trait: `Handler<T, S>` — tuples of extractors up to arity limits (16 extractors, via macro-generated impls); argument extraction order matters (body-consuming extractors must be last)
- Extractor taxonomy: `Path<T>`, `Query<T>`, `State<S>`, `Extension<T>`/request extensions, `HeaderMap` extractors, `Json<T>` (with `JsonRejection` typed errors), `Bytes`, `Form<T>`, `Request` (full request), custom extractors via `FromRequestParts`/`FromRequest`
- `State<S>` design: app-state sharing via generics; `Router::with_state`, state inheritance in nested routers (`merge`/`nest` state semantics), `FromRef` for splitting state (e.g., `AppState` → extract `DbPool` separately)
- Responses: `IntoResponse` trait; `(StatusCode, Json<T>)` tuple responses; `Response` type; `Html`, `Redirect`, streaming bodies (`Body::from_stream`, SSE via `axum::response::sse`)
- Routing: `route`, `nest`, `merge`, fallback handlers, route layers, path params syntax (`/:id`, `/*rest`), trailing slashes, 404/405 handling
- Error handling: handler errors via `Result<T, E: IntoResponse>`; centralized error mapping via enum with `IntoResponse`; rejection types and `JsonRejection` matching
- Actix-web comparison: actor-model heritage (though actix actors optional), `web::Data` app state (Arc-based), service/request lifecycle, extractor differences (`FromRequest` async), performance characteristics; when to choose which (team familiarity, ecosystem, middleware model)
- HTTP/1.1 vs HTTP/2 support via Hyper; TLS termination (rustls via `tokio-rustls`, `axum-server`)

**Theoretical Rules & Contracts**
- Extractor contract: `FromRequestParts` runs before body read; `FromRequest` may consume body; failures produce rejections (400-class) unless typed
- State contract: state must be `Clone` (cheaply — Arc inside); extractors requiring state use `State<S>` + `FromRef` decomposition
- `IntoResponse` contract: any handler error type must convert; final safety net: custom fallback + `catch_unwind` boundary
- Content-type negotiation: `Json<T>` requires `application/json`; typed rejections map to 400/422

**Production Edge Cases & Bugs**
- Extractor ordering: `Bytes`/`Json` before `State` consumes the body — remaining extractors fail; put body extractors last
- State type mismatch after `nest`: nested router requiring different state type — compile error; design single `AppState` with `FromRef`
- Leaking connections on client disconnect: streaming responses must handle aborted streams (check `is_end_stream`, use `CancellationToken` in SSE loops)
- Request size limits: default body limits (axum default 2MB `DefaultBodyLimit`) — 413 errors; tuning per-route
- Panic in handler: hyper catches and closes connection; prefer `Result` + `IntoResponse`; `tower-http::catch_panic` for HTTP 500 conversion
- Graceful shutdown choreography: `axum::serve(...).with_graceful_shutdown(signal)` — in-flight request draining, connection close semantics, `Connection: close` handling

**Interview Trivia & Idiomatic Patterns**
- Q: "Axum vs Actix-web?" — Both production-grade; Axum = Tower-native, type-driven extractors, Tokio-idiomatic; Actix = mature, higher-level conveniences, historically better raw benchmarks (micro), both fine at macro level.
- Q: "How does State avoid global singletons?" — Explicit dependency injection via router generics; testability without mocking frameworks.
- Idiomatic: thin handlers — delegate to service layer; handlers only do extraction + mapping
- Idiomatic: `thiserror`-based `AppError` with `IntoResponse` producing RFC 7807 problem details
- Pattern: `#[derive(Clone)] struct AppState { db: PgPool, cfg: Arc<Config> }` + `FromRef` impls for sub-extraction

### Chapter 5.2: Tower Middleware & the Service Model

#### In plain English

**The problem:** Some work applies to every request: logging, timeouts, authentication, rate limiting, compression. Copying it into every handler is error-prone. **The fix:** Tower models everything as a `Service` (request in, response out) and a **layer** wraps one service in another. Stacking layers builds a chain. **The twist:** order is everything. The first layer you list is the outermost, so it sees every request first and every response last. Putting rate limiting after expensive authentication, or tracing inside authentication, quietly changes what your service does.

> **Imagine:** Airport security. Ticket check, then ID check, then baggage scan, then the gate. A request passes the checkpoints in order and the response walks back through the same checkpoints in reverse.

```diagram
{"n":"A:Request in:0:0|B:Trace:1:0|C:Auth:2:0|D:Rate limit:3:0|E:Timeout:4:0|F:!Handler:5:0","e":"A>B|B>C:logged|C>D:identified|D>E:allowed|E>F:time limited"}
```

| Layer | What it does | Why this position |
| --- | --- | --- |
| Trace | Logs every request and response | Outermost so rejected requests are logged too |
| Auth | Checks who the caller is | Before spending effort on the request |
| Rate limit | Rejects callers that send too much | After auth so limits are per user |
| Timeout | Stops slow requests | Closest to the handler to bound its work |
| Compression, CORS | Adjust responses and browser rules | Usually near the outside |

| Tower word | Plain meaning |
| --- | --- |
| `Service` | Something that takes a request and returns a future response |
| `poll_ready` | “Are you ready for another request?” (this is how back-pressure travels) |
| `call` | “Handle this request” |
| `Layer` | A wrapper that turns one service into another |
| `ServiceBuilder` | A tidy way to stack layers; the first listed is outermost |

```rust
use axum::{routing::get, Router};
use std::time::Duration;
use tower::ServiceBuilder;
use tower_http::{timeout::TimeoutLayer, trace::TraceLayer};

fn app() -> Router {
    Router::new()
        .route("/health", get(|| async { "ok" }))
        .layer(
            ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())                    // outermost
                .layer(TimeoutLayer::new(Duration::from_secs(10))),   // closest to the handler
        )
}
```

#### The full technical detail


**Low-Level Mechanics & Internals**
- Tower's `Service<Request>` trait: `type Response`, `type Error`, `type Future: Future`; `poll_ready` (backpressure readiness) vs `call` (request dispatch) — the two-phase service contract
- `Layer` trait: `Layer<S>` → `Service`; composability of layers; `ServiceBuilder` ordering semantics (layers applied in order — request passes first→last, response last→first)
- Tower HTTP middleware inventory (`tower-http`): `TraceLayer` (request logging with `Trace` make-span), `CompressionLayer`, `DecompressionLayer`, `CorsLayer`, `LimitLayer`, `TimeoutLayer`, `RateLimitLayer`, `RequestIdLayer`, `SensitiveHeadersLayer`, `NormalizePathLayer`, `ValidateRequestLayer` (auth), `CatchPanicLayer`, `SetStatusLayer`, `FollowRedirectLayer`, `MapRequestBody`/`MapResponseBody` utilities
- Writing custom middleware: the `middleware::from_fn` convenience vs. implementing `Layer`+`Service` manually (named structs for stateful middleware); futures in `call` and their Send bounds; `BoxError` = `Box<dyn Error + Send + Sync>` as the standard middleware error type
- Backpressure mechanics: `poll_ready` contract — must be called before `call`; buffer layer (channel-backed) decoupling; concurrency limit layer (semaphore-backed); load-shedding strategies
- Client side: `tower` for HTTP clients — retry policies (`RetryLayer` with backoff + budget-based hedging), balance (`Balance` with p2c — power of two choices), circuit breaking (custom or `tower-breaker`)
- Compatibility: axum routers are Services; mounting Tower services into axum via `Router::route_service`, `ServiceExt::oneshot` for testing services without a server
- `ServiceExt`/`ServiceBuilderExt` utilities: `map_request`, `map_response`, `map_err`, `and_then` combinators

**Theoretical Rules & Contracts**
- `poll_ready`/`call` contract: `call` panics or misbehaves if invoked before readiness; middleware must forward readiness correctly
- Layer ordering contract: first-added = outermost on request path; `TimeoutLayer` placement inside/outside `TraceLayer` changes what latency is logged
- Error contract: middleware errors short-circuit to response via `IntoResponse` mapping at the router boundary
- Cancellation contract: dropping the in-flight future cancels middleware processing (timeouts implement this)

**Production Edge Cases & Bugs**
- `poll_ready` misuse in custom middleware: calling `call` without driving readiness → panics under load ("ready=false but call made")
- Timeout placement errors: timeout outside retry = retry suppressed; timeout inside retry = each attempt timed — deliberate ordering
- Rate limiting global vs. per-IP: keyed rate limiters need keyed layers (custom keyed limiter or ` Governor` crates); global rate limit is a DoS amplifier (one abusive client starves all)
- Trace span leakage: span fields with unbounded cardinality (raw URLs with IDs) exploding tracing backends — sanitize span fields
- Compression + SSE conflicts: `CompressionLayer` buffering streaming responses — exclude streaming routes from compression or use per-response headers
- Middleware panic propagation: catch_panic placement outermost; sensitive data exposure in panic messages

**Interview Trivia & Idiomatic Patterns**
- Q: "Why two-phase `poll_ready`/`call`?" — Backpressure: the service can decline work (buffer full, limit reached) without consuming the request.
- Q: "Layer vs Service?" — Layer = factory transforming a Service; Service = request processor. Layers compose; Services execute.
- Idiomatic: `ServiceBuilder` tower stack order: `Trace → Cors → Compression → Timeout → RateLimit → routes` (outer→inner); timeout inside rate limit (don't charge dead time against the limiter)
- Pattern: custom auth middleware as `from_fn` reading `Extension` state, returning 401/403 via `IntoResponse`
- Anti-pattern: middleware doing heavy work per request (crypto verify per request — cache keys, batch, offload)

### Chapter 5.3: Serde, Serialization & State Management

#### In plain English

**The problem:** The outside world speaks text (JSON); your code speaks typed structs. Also, handlers need access to shared things such as the database pool and settings. **The fix:** Serde converts automatically in both directions, guided by a few attributes on your struct. For shared things, put them in one `AppState` struct, wrap the heavy parts in `Arc`, and let Axum hand it to handlers through the `State` extractor. **The twist:** a missing or wrongly typed field is rejected with a clear 4xx error before your code runs, and sharing state needs no global variables, which also makes testing easy.

> **Imagine:** A translator at a meeting. Visitors speak JSON, your team speaks Rust. The translator follows a style guide (the Serde attributes): rename fields, skip empty ones, fill in defaults.

```sequence
{"p":"C:Client|A:Axum|S:Serde|H:Handler","m":"C>A:POST with JSON body|A>S:deserialize into CreateUser|S>A:~typed struct or error|A>H:call handler with the struct|H>A:~Json response value|A>C:~serialized JSON"}
```

| Attribute | Effect | Example |
| --- | --- | --- |
| `#[serde(rename_all = "camelCase")]` | Fields appear as `firstName` in JSON | Matches front-end style |
| `#[serde(default)]` | Missing field gets its default | Optional settings |
| `#[serde(skip_serializing_if = "Option::is_none")]` | Leave out empty fields | Smaller responses |
| `#[serde(deny_unknown_fields)]` | Reject unexpected keys | Strict input |
| `#[serde(flatten)]` | Merge a nested struct’s fields | Shared pieces |
| `#[serde(tag = "type")]` | Choose the enum variant by a field | Event payloads |

| State pattern | Good or risky | Why |
| --- | --- | --- |
| `Arc<AppState>` or a `Clone` struct holding pools | Good | Cheap to clone per request |
| `Arc<Mutex<HashMap<..>>>` as a database | Risky | One lock serialises all requests |
| Global `static mut` | Avoid | Unsafe, untestable |

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CreateUser {
    first_name: String,           // JSON key: firstName
    #[serde(default)]
    nickname: Option<String>,     // may be missing
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct UserOut {
    id: u64,
    first_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    nickname: Option<String>,     // left out when None
}
```

#### The full technical detail


**Low-Level Mechanics & Internals**
- Serde architecture: data model (14 primitives: bools, ints, floats, char, str, bytes, option, unit, seq, map, struct, enum...); `Serialize`/`Deserialize` traits; the `Serializer`/`Deserializer` plugin pattern — format-agnostic core
- Derive expansion: `#[derive(Serialize, Deserialize)]` codegen; `#[serde(rename, rename_all, tag, content, default, skip_serializing_if, with, flatten, transparent, bound, remote)]` attribute inventory
- JSON via `serde_json`: zero-copy borrowing deserialization (`&'a str` fields tied to input buffer lifetime); `from_slice`/`from_str`/`to_vec`/`to_writer` (streaming serialization without intermediate buffer — `to_writer` into a `TcpStream`)
- Streaming/efficient parsing: `serde_json::from_reader` buffered reads; `simd-json` (SIMD-accelerated, borrowed-vs-owned semantics, mutable input requirement); `sonic-rs`
- Formats: `serde_yaml` (YAML 1.2 subset caveats), `toml` (config), `bincode` (binary, compact; schema-less versioning hazards), `msgpack`/`rmp-serde`, `prost` (protobuf codegen — not serde but schema-first), `postcard`, `rkyv` (zero-deserialization archives with archived types), `speedy`
- Zero-copy patterns: `&'a [u8]`/`&'a str` deserialization; `Cow` fields; `serde_bytes` for byte arrays; avoiding intermediate `Value` (DOM) parsing on hot paths — `serde_path_to_error` for diagnostics
- `serde_json::Value` vs. typed structs: flexibility vs. performance/validation; `RawValue` for pass-through fields
- Schema validation: JSON Schema via `schemars` (generate from types for OpenAPI), `jsonschema` crate for runtime validation; OpenAPI generation (`utoipa`, `aide`, `okapi`)
- State management: `AppState` decomposition patterns; request-scoped `Extension`s (inserted by middleware); `OnceCell`/`LazyLock` for process-global config; `arc_swap` for hot-reloadable config; connection pools held in state
- Config layering: `config` crate (files + env + CLI merge), `figment`, envy; secrets handling (env vars vs. files; never logging)

**Theoretical Rules & Contracts**
- Round-trip contract: `Serialize`+`Deserialize` symmetry expectations; forward/backward compatibility rules for stored formats (additive-only changes, never rename fields in persisted data without migrations)
- Borrowing contract: borrowed deserialization ties the output lifetime to the input — the input buffer must outlive all uses (classic serde lifetime error)
- Tagging contracts: externally-tagged (default), internally-tagged (adjacent `tag`/`content`), untagged (attempt-order matching hazards)
- Flattens contract: `flatten` + internally tagged enums have known edge-case bugs (duplicate keys, error location loss)

**Production Edge Cases & Bugs**
- `serde_json::Value` on hot paths — allocation-heavy DOM parsing; refactor to typed structs or streaming
- Untagged enums: wrong-variant errors on failure (first-match wins, no backtracking across all fields)
- Byte fields as `Vec<u8>` serializing as arrays of numbers in JSON — use `serde_bytes`/`base64` encoding
- Forward-compat break: renaming a field stored in DB/queue messages — dual-read during rollout (support both names), then cut over
- Logging PII in serialized bodies — scrubbing interceptors in TraceLayer
- Config hot-reload races: swapping config mid-request — use `arc_swap` load semantics (snapshot per request, never torn reads)
- bincode version drift: untagged binary formats break silently across versions — version your payloads

**Interview Trivia & Idiomatic Patterns**
- Q: "How does Serde achieve zero-copy?" — The `Deserialize<'de>` trait threads the input lifetime `'de` so borrowed strings/slices reference the original buffer directly.
- Q: "bincode vs JSON for internal RPC?" — bincode: compact/fast but self-describing-less and version-fragile; JSON: debuggable, schema-evolvable, slower. Choose per durability requirements.
- Idiomatic: typed request/response structs with `#[serde(default)]` for backward-compatible additions
- Pattern: `serde_path_to_error::deserialize` wrapping in validation layers for precise field-level errors
- Anti-pattern: `unwrap()` on deserialization of external input — map rejections to 400s with structured error bodies

### Chapter 5.4: Validation, AuthN/AuthZ & API Design

#### In plain English

**The problem:** A public API must refuse bad input, know who is calling, decide what they may do, and report problems in a way clients can understand. **The fix:** four separate jobs. **Validation** checks the data’s shape and limits. **Authentication** (authn) proves who you are. **Authorization** (authz) decides what you may do. **API design** gives consistent URLs, status codes and error bodies. **The twist:** keeping the four jobs separate prevents the classic mistake of checking identity but forgetting permission (so one user can read another user’s records).

> **Imagine:** A night club. The bouncer checks the guest list format (validation), looks at your ID (authentication), checks whether your wristband allows the VIP area (authorization), and when he says no, he tells you the reason clearly (good error response).

```sequence
{"p":"C:Client|A:Auth layer|H:Handler|D:Database","m":"C>A:request with Bearer token|A>A:verify signature and expiry|A>H:identity added to the request|H>D:load order for this user only|D>H:~order or not found|H>C:~200 or 403 or 404"}
```

| Question | Authentication | Authorization |
| --- | --- | --- |
| Asks | Who are you? | What may you do? |
| Failure code | **401** Unauthorized | **403** Forbidden |
| Typical tool | Password with Argon2, JWT, session cookie | Roles, ownership checks, policies |
| Where | Middleware, once per request | In the handler or service, per resource |

| Status | Use it for |
| --- | --- |
| 200 / 201 / 204 | OK / created a thing / done, nothing to return |
| 400 / 422 | Malformed request / well-formed but invalid data |
| 401 / 403 | Not logged in / not allowed |
| 404 / 409 | Not found / conflict (duplicate, version clash) |
| 429 | Too many requests, slow down |
| 500 / 503 | Our bug / temporarily unavailable |

**Good habits:** hash passwords with Argon2 (never store them in plain text), keep JWT lifetimes short, always check ownership of the record, support idempotency keys on payments, page long lists with `limit` and a cursor, and return one consistent error shape (for example RFC 7807 “problem details”).

```rust
use serde::Deserialize;
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
struct Signup {
    #[validate(email)]
    email: String,
    #[validate(length(min = 12, max = 128))]
    password: String,
    #[validate(range(min = 13, max = 120))]
    age: u8,
}
// signup.validate() returns Err with every failing field, which the handler
// turns into a 422 response with a readable list of problems.
```

#### The full technical detail


**Low-Level Mechanics & Internals**
- Validation crates: `validator` (derive-based: `#[validate(length, email, credit_card, custom)]`), `garcon`/`validify` (including error accumulation + payload transformation), manual validation with `thiserror` enums
- Request validation flow: extractor-level validation (`Json<T>` + `T: Validate` — implement `FromRequest` wrapper `ValidatedJson<T>`), handler-level, service-level — where errors map to which status codes
- Newtype value objects: `struct Email(String)` with validation at construction; parse-don't-validate philosophy; `nutype` crate for zero-boilerplate validated newtypes
- Authentication patterns: JWT verification (`jsonwebtoken` crate — HS256/RS256/EdDSA, `decode` with `Validation` struct, leeway, audience/issuer checks); OAuth2/OIDC via `openidconnect`/`oauth2` crates; session auth (cookies, `tower-sessions`); API keys with constant-time comparison (`subtle` crate)
- Authorization models: role-based (RBAC) middleware checking claims; resource-based checks (user owns record — query-level enforcement); policy engines (OPA via `wasm` policies, Cedar)
- Password hashing: `argon2` crate (Argon2id, parameter tuning: memory 64MB, time 3, parallelism 4 baseline), bcrypt, scrypt; timing safety
- Rate limiting & abuse: keyed rate limiting, token bucket (`governor` crate with axum integration)
- API versioning strategies: URI versioning (`/v1/`), header versioning, media-type versioning; deprecation policies; additive evolution
- Idempotency design: idempotency keys (header), request deduplication at the DB level (unique constraints), retry-safe operations; webhook receivers with signature verification + replay protection (timestamp windows)
- Pagination patterns: cursor-based (keyset) vs. offset — stability and index efficiency; `serde` transparent newtypes for cursors
- Error response standards: RFC 7807 `application/problem+json` — type, title, status, detail, instance, extension members

**Theoretical Rules & Contracts**
- Parse-don't-validate: a type's constructor proves its invariant; downstream code never re-validates
- Constant-time comparison contract: secrets/token comparisons via `subtle::ConstantTimeEq` to avoid timing oracles
- JWT contract: always validate `exp`, `aud`, `iss`, algorithm allow-list (alg confusion attacks — never accept `none`); key rotation via `kid` headers
- Idempotency contract: same key → same outcome (or replay of original), atomic key recording with the transaction

**Production Edge Cases & Bugs**
- Validation bypass via layered extractors: validate `Path`/`Query` too, not just body; `ValidatedJson` skipping `Content-Type` checks
- JWT alg confusion (accepting `HS256` with public key as HMAC secret) — pin allowed algorithms
- Clock skew rejecting valid tokens: `leeway` tuning; expiry bounds
- Rate limiter memory growth: keyed limits on attacker-controlled keys (IP rotation) — fixed-size key spaces, sharded stores, Redis-backed shared limits for multi-instance
- Idempotency race: concurrent duplicate requests both pass the check — unique constraint + upsert semantics; "response replay" vs. "request in progress (409)" distinction
- Mass assignment: binding ORM models directly to request structs — over-posting attacks; separate `CreateUserRequest` DTO from `User` model
- CORS misconfiguration: wildcard origins with credentials; preflight caching headers

**Interview Trivia & Idiomatic Patterns**
- Q: "Offset vs cursor pagination?" — Offset: O(offset) scan degradation, unstable under writes; cursor: stable, index-friendly, no total counts — better at scale.
- Q: "Parse don't validate?" — Encode invariants in types at the boundary; invalid states become unrepresentable inside the system.
- Idiomatic: DTO layer (`CreateUserRequest`/`UserResponse`) decoupled from domain models; `From` conversions with validation
- Pattern: auth middleware injecting `Extension<Claims>`; handlers require the extension (compile-time-ish enforcement of authenticated routes)
- Pattern: RFC 7807 error envelope company-wide; `problem` links to docs


## Module 6: Persistence, Databases & SQLx

### Overview – Keeping data safe and fast in a database

**The problem:** Your service forgets everything when it restarts, so important data must live in a database. Talking to a database brings its own dangers: queries that are wrong only at run time, too many connections, and changes to the table layout that break a running system. **The fix:** Rust’s main database toolkit, SQLx, checks your SQL against the real database while compiling; a connection pool shares a limited number of connections between requests; and migrations change the table layout in small, tracked, reversible steps. **The twist:** a typo in a column name becomes a compile error instead of a 500 error in production.

> **Imagine:** A library with a filing room. The librarian (your code) asks the clerk (the database) for records. Only a few clerks are on duty (the connection pool), so people must not hold a clerk while they chat. When the room is re-organised (a migration), the old and new labels must both work until everybody has moved over.

```diagram
{"n":"A:Handler:0:0|B:Connection pool:1:0|C:Database:2:0|D:!Migrations change the table layout:2:1|E:!Compile-time query checks:1:1","e":"A>B:borrow a connection|B>C:run the query|D>C:versioned SQL files|E>A:wrong SQL does not compile"}
```

| Job | Tool | One-line meaning |
| --- | --- | --- |
| Ask questions | `sqlx::query!` and friends | Typed SQL checked at build time |
| Share connections | `PgPool` | A fixed set of reusable connections |
| Change the layout | `sqlx::migrate!` | Numbered SQL files applied in order |
| Hide the details | Repository layer | Handlers never see raw SQL |

### Chapter 6.1: SQLx & Compile-Time Checked Queries

#### In plain English

**The problem:** SQL is just text. A misspelled column or a wrong type is only discovered when that exact query runs, perhaps months later. Worse, building SQL by gluing strings together lets attackers inject their own commands (SQL injection). **The fix:** SQLx’s `query!` macros send your SQL to a real database while compiling and ask “what columns and types does this return?”. The answer becomes a Rust type. Values are always passed as **bound parameters** (`$1`, `$2`), never glued into the text. **The twist:** the build needs access to the database, which would be awkward in CI, so SQLx can save the answers into a `.sqlx` folder (`cargo sqlx prepare`) and then compile offline.

> **Imagine:** A spell-checker that consults the real dictionary while you type. If you write a word that does not exist, it is underlined before you send the email.

```diagram
{"n":"A:You write query! with SQL:0:0|B:Compiler asks the dev database:1:0|C:Types come back:2:0|D:!Build succeeds with typed rows:3:0|E:Unknown column:1:1|F:!Compile error now:2:1|G:cargo sqlx prepare saves answers:3:1|H:!CI builds offline from .sqlx:3:2","e":"A>B|B>C:columns and types|C>D|B>E:mismatch|E>F|C>G:save for later|G>H"}
```

| Function | Checked when | Use it for |
| --- | --- | --- |
| `query!` / `query_as!` | At compile time | Most queries, with literal SQL |
| `query` / `query_as` | At run time | Dynamic SQL you must build programmatically |
| `query_scalar!` | At compile time | One single value, such as a count |
| `QueryBuilder` | Run time | Safe dynamic lists, such as many `IN` values |

| | Gluing strings (dangerous) | Bound parameters (safe) |
| --- | --- | --- |
| Example | `format!("... WHERE name = '{name}'")` | `query!("... WHERE name = $1", name)` |
| Attacker types `x' OR '1'='1` | Returns every row | Treated as plain text |
| Placeholder style | – | `$1` for PostgreSQL, `?` for MySQL and SQLite |

```rust
#[derive(Debug)]
struct User { id: i64, email: String }

async fn find_user(pool: &sqlx::PgPool, email: &str) -> Result<Option<User>, sqlx::Error> {
    sqlx::query_as!(
        User,
        "SELECT id, email FROM users WHERE email = $1",   // checked at compile time
        email                                              // passed safely as a parameter
    )
    .fetch_optional(pool)                                  // None if no row, no panic
    .await
}
```

**Common gotcha:** nullable columns become `Option<T>`; you can force a non-null type with an alias such as `email AS "email!"` when you know it is never null.

#### The full technical detail


**Low-Level Mechanics & Internals**
- SQLx architecture: driver-based (PostgreSQL, MySQL, SQLite); pure-Rust protocol implementations (PG wire protocol: startup, simple/extended query flows, prepared statements, binary formats — avoiding C library dependencies)
- Two execution modes: compile-time verified (`query!()` macros requiring `DATABASE_URL` or `.sqlx/` offline cache) vs. runtime dynamic (`query`, `query_as`) with `FromRow` derivation
- `query!` macro mechanics: at compile time, connects to DB (or reads `.sqlx` cache from `cargo sqlx prepare`), prepares the statement, infers parameter types and result column types; generates an anonymous struct with correct Rust types (including `NULL` → `Option`)
- Type mapping table: PostgreSQL `BIGINT` ↔ `i64`, `TEXT` ↔ `String`, `VARCHAR` ↔ `String`, `TIMESTAMPTZ` ↔ `sqlx::types::time::OffsetDateTime` (feature-gated: `time` vs `chrono`), `NUMERIC` ↔ `sqlx::types::BigDecimal`/`Decimal`, `UUID` ↔ `uuid::Uuid`, `JSONB` ↔ `sqlx::types::Json<T>`/`serde_json::Value`, `BYTEA` ↔ `Vec<u8>`, arrays ↔ `Vec<T>`, `INET`/`CIDR` ↔ `std::net::IpAddr`
- `query_as!` with named structs; `FromRow` derive and manual `FromRow` for domain mapping; `Row::get` by index/name
- Bind parameter mechanics: positional `$1/$2` (PG) vs `?` (MySQL/SQLite); the macros map Rust types to PG type OIDs; `Encode`/`Decode` and `Type` traits — implementing custom type mappings (domain types ↔ PG types via `sqlx::Type`, e.g., newtype `UserId(u64)` over `BIGINT` with transparent mapping or custom codec)
- `QueryBuilder` for dynamic queries (conditional WHERE clauses) — escaping discipline: `QueryBuilder::push_bind` vs string interpolation (SQL injection surface)
- Transaction mechanics: `pool.begin()` → `Transaction` with `commit()`/`rollback()`; `Drop` rolls back by default (the abort-on-drop contract); savepoints for nested transactions (`begin_nested`); deferred constraint handling
- Advisory locks: `pg_advisory_xact_lock` for app-level mutexes (exactly-once jobs, idempotency keys)
- Connection lifecycle: `PgConnection` state (type cache, prepared statement cache — SQLx caches statements per connection), protocol flow of a query round-trip
- Offline mode: `cargo sqlx prepare` generating `.sqlx/*.json` query metadata for CI without a DB; `SQLX_OFFLINE=true`
- Alternative drivers: `tokio-postgres` (low-level, `deadpool-postgres` pooling), `rusqlite` (embedded), `cornucopia` (PG codegen from queries), `refinery` for migrations

**Theoretical Rules & Contracts**
- Compile-time contract: schema drift breaks the build (CI gate) — the defining advantage over ORMs for typed pipelines
- Type-mapping contract: mismatches between Rust type and column OID produce clear compile errors; `NULL`-ability mismatches (`Option` presence) are checked at compile time
- Transaction contract: `Drop` without commit = rollback; partial statements don't leak outside the transaction (visibility rules)
- Pool contract: `acquire()` waits when exhausted — configure `acquire_timeout` to fail fast rather than queue forever

**Production Edge Cases & Bugs**
- Schema out of sync in CI: forgetting `cargo sqlx prepare` after a migration — offline cache staleness; gate: `SQLX_OFFLINE=true cargo check` in CI + prepare-check job
- N+1 query storms: loop of single-row queries replacing a `IN` list or `JOIN` — detect via SQLx logging (`SQLX_LOG`/tracing statements + durations), `pg_stat_statements` on the DB side
- Connection pool exhaustion: default `max_connections` (10) too small for concurrency; sizing formula (roughly: core count × (1 + latency/CPU-time) from the queuing-theory estimate); symptoms: acquire timeouts under load while DB idle
- Long transactions: holding a transaction across `.await` of external HTTP calls — locks held, pool drained; keep transactions short and pure-DB
- Advisory lock deadlocks across multiple idempotency keys in one request; lock ordering
- `query!` with `IN` lists: binding dynamic-length slices (`query!(... ids = $1 ...)` with `Vec<i64>` — PG array binding caveats, `unnest` pattern for bulk ops)
- Type drift: `DECIMAL` precision loss via `f64` — use `rust_decimal`; `TIMESTAMP` (naive) vs `TIMESTAMPTZ` confusion — always `TIMESTAMPTZ` in services

**Interview Trivia & Idiomatic Patterns**
- Q: "SQLx macros vs runtime queries?" — Macros verify against a live (or cached) schema; runtime queries are dynamic but unchecked. Hybrid: macros for the known-hot paths, runtime for truly dynamic SQL.
- Q: "How does SQLx map NULL?" — Schema NULL → `Option<T>`; mismatches are compile errors in the macros.
- Idiomatic: repository pattern per aggregate; keep SQL in one module; transactions at service-layer boundaries
- Idiomatic: `Acquire<'_, Database = Postgres>` trait bounds (or `Executor`) so functions accept `&Pool`, `&mut Connection`, or `&mut Transaction` uniformly — testability with test transactions
- Pattern: `test_transactions` / `sqlx::test` attribute for DB-backed tests (per-test rollback)

### Chapter 6.2: Connection Pooling, Migrations & Schema Evolution

#### In plain English

**The problem:** Opening a database connection is slow, and a database only allows a limited number of them at once. If every request opens its own, the database runs out. And when you must change a table (rename a column, add a rule) while the old version of the app is still running, a careless change breaks it. **The fix:** a **pool** keeps a fixed number of connections open and lends them out. **Migrations** are numbered SQL files applied in order and recorded in the database. For risky changes, use **expand and contract**: add the new thing, move over slowly, and only then remove the old thing. **The twist:** during a rolling deployment, old and new code run together, so every migration step must work for both.

> **Imagine:** A bike-share station with ten bikes. Take one, ride it, return it. If you keep a bike all day while having lunch, other people queue for nothing. For migrations: when a shop renames a street, the old and new street signs both stay up until every delivery driver has updated their map.

```diagram
{"n":"A:Add the new column:0:0|B:Deploy code that writes both:1:0|C:Copy old data over:2:0|D:Switch reads to the new column:3:0|E:Stop writing the old column:3:1|F:!Drop the old column:2:1","e":"A>B:expand|B>C:backfill|C>D|D>E:contract|E>F"}
```

| Pool setting | Plain meaning | Tip |
| --- | --- | --- |
| `max_connections` | Most connections the pool will open | All app copies together must stay below the database limit |
| `min_connections` | Kept ready even when idle | Avoids slow first requests |
| `acquire_timeout` | How long a request waits for a free connection | Fail fast instead of hanging forever |
| `idle_timeout` | Close connections unused for a while | Frees database resources |
| `max_lifetime` | Replace old connections regularly | Survives load balancer and firewall resets |

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Requests hang and then time out | Pool exhausted: connections held too long | Release before slow non-database work |
| Works alone, fails under load | Too many app copies times pool size | Lower pool size or add a pooler such as PgBouncer |
| Deploy breaks old servers | Destructive migration in one step | Expand and contract |

```rust
use sqlx::postgres::PgPoolOptions;
use std::time::Duration;

async fn connect(url: &str) -> Result<sqlx::PgPool, sqlx::Error> {
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(Duration::from_secs(3))   // fail fast when busy
        .connect(url)
        .await?;
    sqlx::migrate!("./migrations").run(&pool).await?;   // apply any pending migrations
    Ok(pool)
}
```

#### The full technical detail


**Low-Level Mechanics & Internals**
- `sqlx::PgPool` internals: `deadpool`-style? No — SQLx's own `Pool` built on `crossbeam-queue`, lifecycle hooks (`before_acquire`, `after_connect`, `on_close`), idle timeout, max lifetime, test-before-acquire, minimum-idle maintenance; fairness: FIFO waiter queue (optionally LIFO for locality)
- Pool sizing theory: Little's Law (L = λW); the "Pool size = ((core_count * 2) + effective_spindle_count)" heuristic (PG experience: beyond ~CPU×2 connections hurts due to context switching in PG itself); Tokio concurrency vs pool concurrency relationship
- Health checks: `acquire` health-check overhead vs. idle-reaping trade-offs; `after_connect` session setup (statement timeouts: `SET statement_timeout`, timezone enforcement, `search_path`)
- Migrations: `sqlx migrate` — `.sqlx/migrations` directory convention vs `migrations/`; `sqlx::migrate!()` macro embedding migrations into the binary (at compile time — no external files in the shipped image); reversible migrations (`UP`/`DOWN` sections); checksum verification; migration locking (`sqlx` locks the `_sqlx_migrations` table)
- Migration strategy: expand-and-contract (parallel change pattern) for zero-downtime schema evolution — add new column (expand) → dual-write/read → backfill → switch reads → drop old (contract); backward-compatible-only forward migrations
- Schema versioning pitfalls: long-running migration locks (`ACCESS EXCLUSIVE` on `ALTER TABLE`), `CONCURRENTLY` index creation outside transactions, backfill batching (`UPDATE ... WHERE id > $last LIMIT n`) to avoid WAL explosions and replica lag
- PgBouncer / RDS Proxy considerations: transaction-mode pooling breaking session state (prepared statements, advisory locks, `SET` commands); prepared-statement cache interplay (`prepareThreshold`)
- Read replicas: routing reads to replicas; replication lag awareness (read-your-write consistency techniques: stick-to-primary for a window, LSN-based routing); SQLx has no built-in splitting — app-level routing
- CockroachDB/TiDB/Spanner-style distributed SQL from Rust: same PG wire compatibility notes

**Theoretical Rules & Contracts**
- Migration contract: migrations run once, in order, atomically recorded; never edit applied migration files (checksum mismatch = startup failure); only forward-compatible changes ship
- Pool contract: `acquire` returns `PoolConnection` — RAII return on drop; timeouts: `acquire_timeout`, `idle_timeout`, `max_lifetime`, `min_connections`
- Zero-downtime contract: each deploy must work with both old and new schema (N and N+1) — expand/contract is the enforcement mechanism

**Production Edge Cases & Bugs**
- Migration deadlock on deploy: new pods running migration while old pods hold incompatible locks — run migrations as a separate Job/step before rolling the deployment
- `ALTER TABLE ... ADD COLUMN` with default on a billion-row table (PG ≥11 fast; still rewrite on older versions) — version-aware migration writing
- Backfill locking tables: batch with `FOR UPDATE SKIP LOCKED` workers, commit per batch, sleep between batches
- Pool exhaustion cascading: services retrying acquire failures with tight loops amplifying load — backoff + circuit breaking
- Session-state surprises behind PgBouncer transaction pooling: `SET LOCAL` vs `SET`, advisory locks broken — pin to session pooling or avoid session features
- Replica lag reading stale data after write: user updates profile, reads replica → old data; mitigation: read-your-own-write via primary routing after mutations, or lag monitoring with fallbacks

**Interview Trivia & Idiomatic Patterns**
- Q: "Expand and contract?" — Never ship a schema change that breaks the previous app version; phase changes: additive first, removal last.
- Q: "Pool size formula?" — Start near `cores × 2` for PG (its own concurrency limits); measure p99 acquire wait, not guesswork.
- Idiomatic: `sqlx::migrate!()` embedded migrations in binaries; run as init container/Job in k8s
- Idiomatic: migrations are code — reviewed, tested against prod-like data volume in staging
- Pattern: `SKIP LOCKED` job queues in PG (dead-simple background jobs without a queue broker)

### Chapter 6.3: SQLx vs Diesel vs ORMs & Data Access Architecture

#### In plain English

**The problem:** There are several ways to reach a database from Rust and each has trade-offs. A second problem is structure: if SQL is scattered across every handler, changing it later is painful and testing is hard. **The fix:** choose the tool that fits your team, then hide it behind a **repository**, a small module that is the only place that knows about SQL. Handlers call a service, the service calls the repository. **The twist:** a clear layer lets you swap the database tool or fake it in tests without touching business logic.

> **Imagine:** Ordering food. Writing SQL (SQLx) is talking directly to the chef: precise and flexible. A query DSL (Diesel) is a typed menu: safer wording but you must order what the menu offers. A full ORM is a set meal service: convenient until you want something special.

```diagram
{"n":"A:HTTP handler:0:0|B:Service with business rules:1:0|C:Repository with SQL only:2:0|D:!Database:3:0","e":"A>B:validated input|B>C:domain types|C>D:queries|D>C:rows|C>B:domain types|B>A:result"}
```

| | SQLx | Diesel | SeaORM and similar |
| --- | --- | --- | --- |
| Style | Write real SQL | Typed query builder (DSL) | Entity based, ORM style |
| Async | Yes | Sync by default (async crate available) | Yes |
| Compile-time checks | SQL checked against a database | Checked by Rust types and schema | Mostly Rust types |
| Strength | Full SQL power, no hidden queries | Strong type safety | Fast to start, relations built in |
| Watch out | More SQL to write by hand | Learning the DSL | Hidden queries, such as the N+1 problem |

| Concept | Plain meaning |
| --- | --- |
| Transaction | A group of changes that all succeed or all vanish |
| N+1 queries | One query for a list, then one more per item: use a join or `IN` instead |
| Repository | The only module that talks to the database |
| Unit of work | One transaction wrapped around one business operation |

```rust
// A transaction: both updates happen, or neither does.
async fn transfer(pool: &sqlx::PgPool, from: i64, to: i64, cents: i64) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;
    sqlx::query!("UPDATE accounts SET balance = balance - $1 WHERE id = $2", cents, from)
        .execute(&mut *tx).await?;
    sqlx::query!("UPDATE accounts SET balance = balance + $1 WHERE id = $2", cents, to)
        .execute(&mut *tx).await?;
    tx.commit().await?;          // if we return early with `?`, the transaction rolls back
    Ok(())
}
```

#### The full technical detail


**Low-Level Mechanics & Internals**
- Diesel architecture: compile-time query builder with its own DSL (typed AST), schema inference from `table!` macros, connection per backend (`PgConnection` with its own prepared statement management), migrations via `diesel_cli`/`diesel_migrations`, strong typing of the whole query AST (type-checked joins, column existence)
- Diesel vs SQLx philosophy: query builder (composition, codegen-free checking at type level) vs. raw SQL with macro verification; Diesel's DSL learning curve vs SQLx's SQL-first approach; Diesel dynamic queries pain vs SQLx `QueryBuilder`
- Full ORMs on Rust: `SeaORM` (async, dynamic/entity pattern, `EntityTrait`/`ActiveModel`, ActiveRecord flavor), `Diesel` (sync — async via `deadpool-diesel`/spawn_blocking), `rbatis`, `ormx` (SQLx-powered, model-centric); when ORM is justified (CRUD-heavy admin surfaces) vs. when SQL-first wins (complex reporting, query-tuning control, DB-specific features: `JSONB` ops, `LATERAL` joins, window functions, full-text search)
- The async/sync mismatch: Diesel is synchronous — wrapping in `spawn_blocking` (correct: DB drivers block) or `deadpool-diesel`; SeaORM/SQLx natively async
- Repository pattern vs. active record vs. DAO: layering DTOs ↔ domain models ↔ row types; `FromRow` manual impls for decoupling (never expose `sqlx::Row` beyond the repository); query-module organization
- Read-model vs write-model (CQRS-flavored): separate optimized read schemas (denormalized tables, materialized views) from normalized writes; reporting queries bypassing domain types
- Testing data access: `sqlx::test` attribute (per-test transactions), testcontainers-rs for ephemeral PG in Docker (CI realism), migration-based fixtures vs. factory patterns (`fake` crate for seeding)
- Performance internals: prepared statement caching behavior per driver; binary protocol decoding cost; row streaming (`fetch` + `try_next` for large result sets vs. `fetch_all` memory blowup); `COPY` bulk ingest via `sqlx::postgres::PgCopyIn` / `copy_in`

**Theoretical Rules & Contracts**
- Repository contract: the only module importing SQLx types; domain code never sees SQL; transactions cross multiple repositories via service layer
- Diesel coherence rules: Diesel's query types are enormous (type-level encoding) — compile-time cost, long error messages; `BoxedQuery`/`diesel::dsl` type erasure for dynamic composition
- ORM impedance: relational models ≠ object graphs; ORMs hide SQL — losing the ability to reason about query plans; team skill alignment decides

**Production Edge Cases & Bugs**
- Diesel + async mismatch handled by naive `spawn_blocking` with pool-per-call connection churn — use `deadpool-diesel` instead
- SeaORM N+1 patterns via lazy relations — eager loading discipline, query log auditing
- Giant `fetch_all` on unbounded queries (no `LIMIT` + streaming) — OOM incidents; stream with backpressure or paginate
- Diesel schema drift: `table!` macros from `print-schema` stale in CI — regenerate in CI gate like `sqlx prepare`
- Repository leaking transactions: passing `&Pool` into repository methods that each self-acquire — breaking multi-step atomicity; the `Acquire` pattern prevents it
- Testcontainers in CI: startup cost, parallel test isolation per container, resource cleanup on CI runners; reuse strategies (singleton container pattern)

**Interview Trivia & Idiomatic Patterns**
- Q: "SQLx or Diesel or SeaORM?" — SQLx: SQL-first teams, verified raw SQL, async-native; Diesel: type-safe query DSL, sync, complex static queries; SeaORM: async ORM familiarity, CRUD-heavy apps, dynamic queries.
- Q: "Why is Diesel sync?" — Its query DSL and trait architecture predate async/await stabilization; wrapping costs are manageable but native async ORMs (SeaORM) exist.
- Idiomatic: repository per aggregate with `Acquire` bounds; transactions owned by services
- Pattern: CQRS read models for hot endpoints (precomputed tables) — bypass ORM entirely for reads
- Anti-pattern: ORM models used as request/response DTOs (tight coupling, over-posting exposure)


## Module 7: Production Operations, Diagnostics & Deployment

### Overview – Running your service for real

**The problem:** Once the service is live you cannot attach a debugger and watch. When it is slow or failing at 3 a.m., you need evidence. **The fix:** build observability in from the start, which means three kinds of evidence: **logs and traces** (what happened, in order), **metrics** (numbers over time) and **profiles** (where the time or memory goes). Then ship the program as a small, safe, reproducible container. **The twist:** Rust gives you very fast binaries, but fast code still fails in the real world, and the teams that sleep well are the ones that can see inside the running system.

> **Imagine:** A car. The dashboard gauges (metrics) tell you something is wrong, the trip recorder (logs and traces) tells you what happened, and the mechanic’s scanner (profilers and tokio-console) tells you which part is faulty.

```diagram
{"n":"A:Alert fires from metrics:0:0|B:Find the slow requests in traces:1:0|C:Read the logs of that request:2:0|D:Profile or inspect tasks:3:0|E:!Fix it and ship a new image:3:1","e":"A>B:which route|B>C:which request|C>D:why|D>E"}
```

| Question | Tool | Chapter |
| --- | --- | --- |
| What happened to this request? | Tracing and structured logs | 7.1 |
| Is the system healthy right now? | Metrics and dashboards | 7.2 |
| Why is it slow or stuck? | tokio-console, flamegraphs | 7.3 |
| How do we ship it safely? | Multi-stage Docker, static binary | 7.4 |

### Chapter 7.1: Tracing & Structured Logging

#### In plain English

**The problem:** A plain `println!` log is a pile of text lines. With thousands of requests running at once, the lines from different requests are mixed together and you cannot tell which belong to which. **The fix:** the `tracing` crate records **events** (single moments, like “user not found”) inside **spans** (periods of work, like “handling request 8f3a”). Every event inside a span automatically carries the span’s fields. Output as JSON so tools can search it. **The twist:** this works even though async tasks hop between threads, because spans follow the task and not the thread.

> **Imagine:** A parcel tracking number. Every scan along the journey is stamped with the same number, so you can reconstruct the whole trip even though thousands of parcels travel together.

```sequence
{"p":"C:Client|M:Middleware|H:Handler|D:Database","m":"C>M:request arrives|M>M:open span with request_id|M>H:call handler|H>D:query event carries request_id|D>H:~rows|H>M:~response|M>M:close span and log duration|M>C:~response"}
```

| Idea | Plain meaning |
| --- | --- |
| Event | A single log line, such as `info!("order saved")` |
| Span | A named period of work with fields attached |
| `#[instrument]` | Automatically wraps a function in a span |
| Subscriber | The part that decides how and where records are written |
| `RUST_LOG` / `EnvFilter` | Turn detail up or down per module without rebuilding |
| Structured logging | Fields as key and value (JSON), not free text |

| Level | Use for |
| --- | --- |
| `error` | Something failed and needs attention |
| `warn` | Odd but handled |
| `info` | Important business events |
| `debug` / `trace` | Developer detail, off in production |

**Never log:** passwords, tokens, full card numbers or other personal data. Use `skip(password)` in `#[instrument]` to leave fields out.

```rust
use tracing::{info, instrument, warn};

#[instrument(skip(db), fields(user_id = %user_id))]   // a span with user_id attached
async fn load_profile(db: &Db, user_id: u64) -> Option<Profile> {
    info!("loading profile");                          // carries user_id automatically
    let p = db.fetch(user_id).await;
    if p.is_none() { warn!("profile missing"); }
    p
}

fn init_logging() {
    tracing_subscriber::fmt()
        .json()                                        // machine readable
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();
}
```

#### The full technical detail


**Low-Level Mechanics & Internals**
- `tracing` crate architecture: spans (units of work with typed fields + timestamps) vs. events (point-in-time log records); the `Subscriber` (global) and per-thread/current-span context; `Subscriber::enabled` filtering pipeline
- Macros: `info!`, `debug!`, `trace!`, `warn!`, `error!` for events; `info_span!`, `in_current_span` etc.; field recording (`?` for Debug, `%` for Display, empty fields filled later via `Span::record`)
- Subscriber composition via layers: `tracing_subscriber::fmt()` (console), `tracing_subscriber::json()` (structured JSON for log aggregators), `EnvFilter` (directive syntax: `my_crate=debug,tower_http=info`), reloadable filters (`reload::Handle`), per-layer filtering (unstable feature `tracing_subscriber::filter::Filtered`)
- Span lifecycle mechanics: enter/exit guards, `Span::current()`, context propagation across threads/tasks (`.instrument(span)` combinator on futures — spans follow async work across threads; `in_current_span` for spawned tasks), span IDs, parent-child relationships constructing the trace tree
- Context propagation across service boundaries: OpenTelemetry bridge (`tracing-opentelemetry`), W3C TraceContext (`traceparent` header), baggage propagation
- Field design: low-cardinality vs. high-cardinality fields; `tracing::field::Empty` + deferred recording; `valuable` ecosystem for complex structured values
- Sampling: head-based vs. tail-based sampling (OTel collector configs); `tracing` has no built-in sampling — provided via OTel SDK or custom Layer
- Performance: event macro cost when disabled — static level filtering (`static_max_level_*` features / `release_max_level_info`), `callsite` registration, `interest` evaluation before field evaluation
- Log ecosystem interop: `tracing-log` capturing `log` crate events from dependencies into tracing; the `log` feature on tokio etc.
- Testing observability: `tracing_mock` for asserting spans/events in tests; log capture in integration tests

**Theoretical Rules & Contracts**
- Span context contract: `.instrument()` propagates context through `.await` points; forgetting it breaks child-parent linkage in traces
- Level discipline contract: ERROR = actionable operator alert; WARN = degraded but functioning; INFO = significant lifecycle/business events (request received, job completed — one per request max); DEBUG/TRACE for developers
- Structured fields contract: machine-parseable keys (snake_case), stable schemas, no format-string composition into messages
- Sampling contract: understand what head sampling drops (whole traces) vs. tail (keeps interesting traces, e.g., errors + slow)

**Production Edge Cases & Bugs**
- Missing `.instrument()` on `tokio::spawn`ed work — traces fragment into orphans; the #1 tracing bug in async services
- High-cardinality span attributes (user IDs, request bodies, raw SQL with literals) exploding Loki/Datadog costs — field hygiene, `fmt::Debug` truncation
- Blocking on logging: synchronous stdout/file appender stalls under load; use non-blocking writer (`tracing_appender::non_blocking`) with lossy behavior awareness
- Double-logging: HTTP access logs in TraceLayer + handler logs + framework logs — deduplication strategy per layer
- Panic hooks: `tracing-panic` capturing panics as ERROR events with backtraces; ensuring panics leave forensic traces before crash
- Secrets in spans: authorization headers, cookies logged by TraceLayer defaults — redaction via `MakeSpan` customization or `SensitiveHeadersLayer` (removal from requests)
- EnvFilter misconfiguration in prod (`RUST_LOG=debug` = 10x cost + PII) — config-gated filter levels

**Interview Trivia & Idiomatic Patterns**
- Q: "tracing vs log crate?" — tracing models spans + structured context propagation (async-aware); log is flat, context-free (MDC limited), sync-era design.
- Q: "How do spans cross await points?" — `.instrument(span)` wraps the future so entry/exit happens per-poll on whatever thread runs it.
- Idiomatic: one INFO span per request with route, method, status, latency, request_id; business events as events within
- Idiomatic: `#[tracing::instrument]` on service-layer functions (skip large args: `#[instrument(skip(self, payload))]`)
- Pattern: request-id injection middleware (`RequestIdLayer` + `MakeSpan`) enabling cross-service correlation
- Anti-pattern: string interpolation into messages instead of fields (`info!("user {} logged in", id)` → `info!(user_id = %id, "user logged in")`)

### Chapter 7.2: Metrics & Monitoring

#### In plain English

**The problem:** Logs tell you what happened to one request, but you also need the big picture: how many requests per second, how many fail, how slow is the slowest 1%. **The fix:** metrics are numbers sampled over time. A server exposes them at a `/metrics` address, Prometheus collects them every few seconds, Grafana draws graphs, and an alert rule rings when a number goes wrong. **The twist:** the number of different label values matters a great deal. A label such as `user_id` creates a new time series for every user and can crash the monitoring system (high cardinality).

> **Imagine:** The dashboard of a car. Speedometer (a gauge), trip counter (a counter that only goes up) and a histogram that shows how long each journey leg took. You glance at it constantly and an amber light comes on when something drifts.

```diagram
{"n":"A:Your service exposes /metrics:0:0|B:Prometheus scrapes it:1:0|C:Grafana draws dashboards:2:0|D:!Alert rule notifies the team:2:1","e":"A>B:every few seconds|B>C:query|B>D:rule is breached"}
```

| Metric type | Plain meaning | Example |
| --- | --- | --- |
| Counter | Only goes up | Total requests, total errors |
| Gauge | Goes up and down | Open connections, queue length |
| Histogram | Counts values into buckets | Request duration, to compute p50 and p99 |

| Method | What to track | Good for |
| --- | --- | --- |
| RED | **R**ate, **E**rrors, **D**uration of requests | Services and APIs |
| USE | **U**tilisation, **S**aturation, **E**rrors of resources | CPU, memory, pool, queues |

| Label | Good or bad | Why |
| --- | --- | --- |
| `route="/users/:id"` | Good | A small, bounded set |
| `status="200"` | Good | A few values |
| `user_id="8841"` | **Bad** | Unbounded: one series per user |
| Raw URL with ids | **Bad** | Unbounded |

**What is p99?** Sort all request times from fastest to slowest. The p99 is the time that 99 out of 100 requests beat. Averages hide the slow tail that real users feel, so always look at percentiles.

```rust
use metrics::{counter, histogram};
use std::time::Instant;

async fn handle(route: &'static str) {
    let start = Instant::now();
    // ... do the work ...
    counter!("http_requests_total", "route" => route, "status" => "200").increment(1);
    histogram!("http_request_seconds", "route" => route).record(start.elapsed().as_secs_f64());
}
```

#### The full technical detail


**Low-Level Mechanics & Internals**
- Metrics data models: counters (monotonic), gauges (point-in-time), histograms (distribution buckets — latencies, sizes), summaries (client-side quantiles — discouraged at scale), exemplars (linking metrics to traces)
- Crate options: `metrics` facade crate + exporters (`metrics-exporter-prometheus` pull endpoint or push gateway), `prometheus` crate (official client, pull model, process metrics), `opentelemetry` metrics SDK, `statsd` clients
- Prometheus fundamentals: exposition format, metric naming (`http_requests_total{route,method,status}`), label cardinality discipline (each unique label combo = new time series), scrape model, recording/alerting rules, PromQL basics (`rate()`, `histogram_quantile()`, `increase()`)
- Rust instrumentation points: Tower `TraceLayer` with custom `on_response` recording latency histograms; middleware for in-flight request gauges; pool metrics (SQLx pool size gauges via `PoolOptions` hooks/custom instrumentation); tokio runtime metrics (unstable `tokio_metrics` crate — poll counts, budget consumption, blocking queue depth)
- `tokio-metrics` RuntimeMonitor: per-worker metrics (poll count, poll time, min/max park, blocking depth, live tasks, budget) — the async-health dashboard
- RED method (Rate, Errors, Duration) for services; USE method (Utilization, Saturation, Errors) for resources; the four golden signals (latency, traffic, errors, saturation)
- Alert design: burn-rate alerting for SLOs (multi-window multi-burn-rate), alert fatigue avoidance; latency histogram bucket choice (native exponential histograms, Prometheus classic buckets `[0.005, 0.01, 0.025, ...]`)
- Push vs pull: Prometheus pull (k8s service discovery) vs. pushgateway for short-lived batch jobs; OTel collector as fan-out (Prometheus + Tempo/Jaeger + Loki)
- eBPF/continuous profiling: `pyroscope`/`parca` for continuous CPU profiling integration; `perf` sampling basics for Rust (frame pointers vs DWARF unwinding — build with `force-frame-pointers` or use `perf record --call-graph dwarf`, `debug = true` in release profile for symbols)
- eBPF with `aya` for custom kernel-level observability (advanced); `tokio-console` covered separately

**Theoretical Rules & Contracts**
- Cardinality contract: label values must be bounded (route templates not raw paths; status classes not full URLs) — unbounded labels crash metrics backends
- Counter naming contract: `_total` suffix, base units (seconds not ms), histogram `_bucket/_sum/_count`
- SLO contract: alerting on SLO burn rates, not individual thresholds

**Production Edge Cases & Bugs**
- Label cardinality explosion: `http_requests_total{path="/users/12345/..."}` — normalize to route templates; cardinality audits in CI (lint against raw path labels)
- Histogram bucket misalignment with SLOs: buckets too coarse to measure 99ms SLO — custom buckets per service
- Metrics lost on restart (counters reset): `rate()` handles it; dashboards noting resets
- Blocking the runtime on metric export: Prometheus scrape handler must be fast — buffered exposition, no lock contention with hot paths; `metrics-exporter-prometheus` internal buffering
- Global recorder registration conflicts (metrics facade + multiple exporters) — feature-gate, single exporter init in `main`
- Async SLO violations invisible to averages: mean latency fine while p99 explodes — always alert on histogram quantiles, never means
- `tokio_metrics` unstable flag: `tokio_unstable` cfg requires `--cfg tokio_unstable` build flags across the dependency graph — CI consistency

**Interview Trivia & Idiomatic Patterns**
- Q: "Counter, gauge, histogram — when?" — Counter: requests, errors (monotonic); gauge: pool size, in-flight requests; histogram: latencies/sizes (distributions, quantiles).
- Q: "Why not summaries?" — Client-side quantiles aren't aggregatable across instances; histograms aggregate in Prometheus.
- Idiomatic: business metrics alongside technical (orders_created_total, payment_latency_seconds)
- Pattern: SLO dashboards from four golden signals; burn-rate alerts wired to paging
- Anti-pattern: logging what metrics should capture (metric = cheap aggregate; log = forensic detail)

### Chapter 7.3: Tokio-Console, Profiling & Debugging Production

#### In plain English

**The problem:** The graphs say “slow”, but not why. In async programs the usual causes are invisible from the outside: a task blocking a worker thread, a starved connection pool, or a hot loop burning CPU. **The fix:** match the symptom to the tool. `tokio-console` shows live tasks and how long each has been busy or idle. A **flamegraph** shows which functions use the CPU. A heap profiler shows who owns the memory. **The twist:** the fix is often tiny (move one blocking call into `spawn_blocking`) once you can see it.

> **Imagine:** A doctor. First the symptom (“p99 latency doubled”), then the right scan: an X-ray for the bones (tasks), a blood test for the system (metrics), an ECG for the heartbeat (CPU profile).

```diagram
{"n":"A:p99 latency is high:0:0|B:All endpoints slow together:1:0|C:Only database endpoints slow:1:1|D:CPU stays high:1:2|E:!Blocked runtime - check tokio-console busy times:2:0|F:!Pool exhausted - check pool metrics:2:1|G:!Hot code - take a flamegraph:2:2","e":"A>B|A>C|A>D|B>E|C>F|D>G"}
```

| Symptom | Likely cause | Tool |
| --- | --- | --- |
| Everything slows down at once | A task blocks a worker thread | tokio-console (long busy time), move work to `spawn_blocking` |
| Slow only when the database is involved | Pool exhaustion or slow queries | Pool metrics, `EXPLAIN`, query timing |
| One core at 100% | A hot loop or heavy serialisation | `cargo flamegraph`, `perf` |
| Memory grows steadily | A leak, an unbounded queue or cache | Heap profiler (jemalloc profiling, heaptrack), queue length metric |
| Process crashes with no message | A panic or abort | Backtrace (`RUST_BACKTRACE=1`), core dump, panic hook |

To use tokio-console you add the `console-subscriber` crate and compile with an extra flag, then run the `tokio-console` viewer:

```text
# Cargo.toml:   console-subscriber = "0.2"
# main():       console_subscriber::init();
RUSTFLAGS="--cfg tokio_unstable" cargo run
tokio-console            # in another terminal
```

**Safety:** the console and profilers can slow the service and expose internals. Bind them to localhost or an internal network only.

#### The full technical detail


**Low-Level Mechanics & Internals**
- `tokio-console`: gRPC-based introspection — requires `--cfg tokio_unstack`/`tokio_unstable` build; instrumentation spans emitted by Tokio runtime; the console CLI views: tasks list (polls, busy/idle time, waker locations), resources view (semaphores, mutexes, timers), task details, warnings (tasks never yielding, long polls, lost wakers)
- Reading task state: `busy time` vs `idle time` (poll efficiency), `polls` count, waker chains (who woke this task — tracking down spurious wake storms), `waiting on` field (which resource)
- Warnings heuristics: "task never yields" (blocking poll detection — smoking gun for event-loop blockers), "long poll", "lost waker", "over 1000 polls"
- CPU profiling: `perf record -g`/`cargo flamegraph` (frame-pointer builds), DWARF unwinding (`debug = 1` + `force-frame-pointers = true` or dwarf call graphs); `samply` (cross-platform profiler UI); profiling under load in prod (low-overhead sampling)
- Heap profiling: `jemalloc` profiling (`malloc_conf`/`prof:true`, `jeprof` heap dumps — finding leak sites), `dhat` (DHAT-style), `valgrind massif` (slow but thorough); mimalloc heaps
- Memory leak hunting: reference-cycle detection (review Weak usage), `jemalloc` `stats.allocated` growth correlation with `pprof` dumps, `bloom`/`bytehound` (Linux memory profiler with flamegraphs)
- Async-specific debugging: `tokio::task::id`, `JoinHandle::id` correlation with console; stack dumps of async tasks (future state inspection via `tracing` task IDs); deadlock detection in `parking_lot` (`deadlock` feature backtraces)
- Core dumps & post-mortem: `systemd-coredump`, `gdb` on Rust binaries (`rust-gdb` pretty-printers for common types), symbolized release builds (`debug = "limited"`, `split-debuginfo`), `minidump`/`sentry` crash reporting for Rust services (sentry-rust integration: panic handler, release tracking, breadcrumbs)
- Reproducing prod issues locally: production traffic shadowing/mirroring, fault injection (latency injection via Tower layers), `toxiproxy`-style network partition testing for DB calls
- Structured panic handling: `std::panic::set_hook` (one global — coordination between sentry/tracing), `catch_unwind` boundaries at task spawns (`JoinSet` already catches: panics surface as `JoinError`), panic = process-abort policy (`panic = "abort"` in release for some services — crash-fast vs. unwind-recover trade-off)

**Theoretical Rules & Contracts**
- `tokio-console` contract: dev/staging tool primarily — the instrumentation overhead in prod (extra spans per task poll) is non-trivial; opt-in builds
- Blocking diagnosis contract: "task never yields" + high busy% ≈ blocking the executor; confirm with CPU flamegraph showing sync code on worker threads
- Debug-info contract: always ship symbols (`debug = 1`, split debuginfo) — you cannot profile or post-mortem stripped binaries effectively
- Panic boundary contract: decide per-service panic policy (unwind + sentry report + restart vs. abort); never silently swallow panics

**Production Edge Cases & Bugs**
- The classic "everything slow, CPU low" incident: tasks blocked on a sync call (DNS, file I/O, `serde_json` on huge payloads) — console shows few tasks polling, high per-poll times; flamegraph confirms; fix via `spawn_blocking` or optimization
- Waker storms: a task waking another in a tight loop (100k wakeups/sec) — console resource view shows waker churn; often a buggy `Future` impl or `notify` misuse
- Deadlock between two tasks via `tokio::sync::Mutex` held across awaits + circular acquisition — console tasks both "waiting on mutex"; mitigation design: lock ordering, `try_lock` with timeout, or state machine refactor
- Memory growth over days: leak via `HashMap` cache without eviction + `Arc` cycles; `jemalloc` `epoch` + `stats` polling dashboard, `jeprof` snapshots diffed
- `tokio-console` in prod accidentally: overhead + potential data exposure — guard behind feature flags
- Panic in a spawned task silently dropped (detached): the request succeeded but work lost — always `JoinSet`/handle retention for critical work
- Coredump analysis of stripped binaries — no function names; fix: keep split debuginfo artifacts per release (debuginfod or artifact storage)

**Interview Trivia & Idiomatic Patterns**
- Q: "How do you find an event-loop blocker?" — tokio-console (long polls, never-yield warnings), CPU flamegraph (`cargo flamegraph` under load), latency histograms by endpoint.
- Q: "Unwind vs abort for services?" — Unwind + catch boundaries (sentry) for recoverable services under supervisors; abort for tight correctness-critical sidecars; either way: crash and restart, never limp with poisoned state.
- Idiomatic: `#[tokio::main]` services ship with `console_subscriber` behind a feature; CI keeps a `tokio_unstable` job
- Pattern: sentry + tracing integration (breadcrumbs as tracing events), release health, per-release regressions
- Anti-pattern: `println!` debugging in production (unstructured, unlevelled, stdout pressure) — use tracing with dynamic levels

### Chapter 7.4: Docker Multi-Stage Builds & Static Binary Distribution

#### In plain English

**The problem:** A naive Docker image contains the whole Rust toolchain, the source code and gigabytes of build files. It is slow to ship and has a big attack surface. Building from scratch on every change is also slow. **The fix:** a **multi-stage build** compiles in one stage and copies only the finished program into a tiny final image. A tool such as `cargo-chef` caches the compiled dependencies as their own layer, so changing your code does not recompile the world. **The twist:** a Rust program can be built as a single static file, so the final image can be a few megabytes with no shell and no package manager for an attacker to use.

> **Imagine:** Packing a suitcase. You build the furniture in a workshop full of saws and glue, but you only put the finished chair in the delivery van, not the whole workshop.

```diagram
{"n":"A:Plan dependencies - recipe:0:0|B:Build dependencies once - cached:1:0|C:Build your code:2:0|D:!Copy the binary into a small runtime image:3:0","e":"A>B:cargo chef cook|B>C:only your code changed|C>D:release binary"}
```

| Final image base | Size | Pros | Cons |
| --- | --- | --- | --- |
| `scratch` | Smallest | Nothing extra to attack | No shell, needs a fully static binary |
| `distroless` | Small | No shell or package manager, includes basic libc | Harder to debug inside |
| `alpine` | Small | Has a shell and `apk` | Uses musl, which can behave differently from glibc |
| `debian-slim` | Medium | Familiar, easy debugging | Larger |

| Practice | Why |
| --- | --- |
| `cargo build --release --locked` | Use exactly the versions in `Cargo.lock` for reproducible builds |
| Run as a non-root user | Limits damage if the process is compromised |
| `cargo audit` and an SBOM | Know which dependencies you ship and whether any are vulnerable |
| musl target such as `x86_64-unknown-linux-musl` | Produces a fully static binary |
| `strip`, `lto`, `panic = "abort"` | Smaller, faster binary (understand the trade-offs) |

```text
FROM lukemathwalker/cargo-chef:latest-rust-1 AS chef
WORKDIR /app

FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json        # list the dependencies

FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json # cached until Cargo.toml changes
COPY . .
RUN cargo build --release --locked --bin app

FROM gcr.io/distroless/cc-debian12 AS runtime
COPY --from=builder /app/target/release/app /usr/local/bin/app
USER nonroot
ENTRYPOINT ["/usr/local/bin/app"]
```

#### The full technical detail


**Low-Level Mechanics & Internals**
- Rust target landscape: `x86_64-unknown-linux-gnu` (glibc), `x86_64-unknown-linux-musl` (static musl), `aarch64-unknown-linux-musl`, `x86_64-pc-windows-msvc`, cross-compilation toolchain (`cross` tool, zigbuild for glibc-version targeting — `cargo-zigbuild`)
- musl vs glibc static linking: fully static binaries (`ldd` shows "not a dynamic executable"), trade-offs (musl malloc slower for some workloads — link `jemalloc` with `tikv-jemallocator`; DNS resolution differences: musl uses its own resolver — no `/etc/resolv.conf` quirks but no NSS; glibc static is discouraged (NSS/dlopen issues))
- `*-alpine` base images + rustup targets; `gcr.io/distroless/cc` (glibc runtime) vs `scratch` with static binaries; image contents audit (`docker history`, dive)
- Multi-stage Dockerfile anatomy: builder stage (`rust:1.xx-slim` + `cargo-chef` or manual `Cargo.toml` dependency-caching trick — copy manifests, `cargo build --dependencies-only`/dummy main; `sccache`/`buildkit cache mounts` for registry caching), final stage (scratch/distroless, `USER nonroot`, `ENTRYPOINT`), `cargo build --release` flags
- Build-time optimization: `lto = "fat"` (or "thin"), `codegen-units = 1` (slower compile, faster/smaller binary), `panic = "abort"` (smaller, no unwinding tables), `opt-level = 3` vs `"s"`/`"z"` (size), `strip = "symbols"`/`strip = "debuginfo"` (symbols kept separately via `split-debuginfo = "packed"` + artifact storage)
- Cross-compilation pipeline: `cross` (Docker-based toolchains for awkward targets), `cargo-zigbuild` (glibc version pinning — targeting old prod glibc from new CI), QEMU user-mode emulation for aarch64 CI tests (slow — native ARM runners preferred), `cargo xwin` for Windows from Linux
- SBOM & supply chain: `cargo audit` (RustSec advisories), `cargo deny` (licenses, banned crates, duplicate detection, advisories, sources), `cargo vet` (Mozilla — supply-chain reviews), `cargo crev` (community reviews), `cargo semver-checks` (API-breaking-change detection for libraries), vendoring dependencies (`cargo vendor` for air-gapped/reproducible builds), `cargo build --locked` + committed `Cargo.lock` for binaries
- Reproducible builds: `SOURCE_DATE_EPOCH`, `--remap-path-prefix`, deterministic-ish builds (Rust near-reproducible; documented gaps), verification via `diffoscope`
- Runtime environment: distroless nonroot, read-only root filesystems, `RUST_LOG`/config via env (12-factor), graceful shutdown signals (`SIGTERM` handling in `axum::serve().with_graceful_shutdown`, `SIGINT` Ctrl-C crate, k8s termination lifecycle: preStop, `terminationGracePeriodSeconds` choreography), health checks (liveness/readiness endpoints semantics — liveness should NOT check DB; readiness gates traffic)
- Deployment patterns: k8s Deployment/rollout strategy (maxSurge/maxUnavailable), pod anti-affinity, HPA on the right metric (requests/sec or custom metrics — never CPU for I/O-bound), poddisruptionbudgets, canary deploys with metrics gates (Argo Rollouts/Flagger)
- Serverless/containers alternatives: AWS Lambda Rust runtime (`lambda_runtime`, `lambda_http` — Axum adapters), cold-start characteristics of Rust (excellent — small binaries, fast init), Fly.io/machines; edge (Cloudflare Workers via `worker-rs` — wasm32-unknown-unknown target)
- Observability in deployment: OTel collector sidecar/agent deployment, Prometheus scraping config (pod annotations), log shipping (vector/fluent-bit), trace sampling at ingress

**Theoretical Rules & Contracts**
- Static binary contract: musl static = single artifact, no base image runtime deps (except CA certs for TLS: mount `/etc/ssl/certs` or embed with `rustls-native-certs`/webpki-roots), zoneinfo for timezones (`TZ` data — musl needs `TZ` env handling; `iana-time-zone` caveats)
- Build cache contract: dependency layer caching broken by workspace-wide `COPY . .` — cargo-chef/manifest-first ordering preserves cache
- Security posture contract: non-root, read-only FS, dropped capabilities, no shell in the image (no debugging via `kubectl exec` shell — use ephemeral debug containers with the same image + tools)
- Shutdown contract: `SIGTERM` → stop accepting, drain in-flight (with deadline), close pools; `SIGKILL` at grace period — design idempotent handlers for hard-kill

**Production Edge Cases & Bugs**
- Musl DNS resolution differences breaking service discovery (NSS modules not honored; search domains handled differently) — test musl images in the real environment, or use glibc + distroless
- TLS failures in scratch images: missing CA certificates (`rustls` with webpki roots avoids; `native-tls` needs cert files) — the classic "works on my laptop (macOS), TLS error in container"
- Build cache invalidation: `cargo-chef` + workspace members changing frequently — profile/optimize cook order; BuildKit cache mounts (`--mount=type=cache,target=/usr/local/cargo/registry`)
- Cross-compiled jemalloc failures on musl aarch64 — feature-gate allocator per target in build config
- `panic = "abort"` + sentry: sentry-rust captures via panic hook (works pre-abort); but no unwinding across FFI — document; test abort behavior in staging
- Health check design errors: liveness checking DB → cascading restarts during DB outage (restart storms); readiness used for liveness purposes — splitting semantics correctly
- Graceful shutdown cut short: long-polling/SSE connections blocking drain; `terminationGracePeriodSeconds` too low; connection draining middleware in axum (`GracefulShutdown` future completion awaiting open connections), client-side retry budgets
- Cargo.lock discipline: libraries omit lock (correct), binaries commit it (correct) — CI `--locked` to catch drift; dependency update cadence + `cargo update -p` minimal updates

**Interview Trivia & Idiomatic Patterns**
- Q: "Static musl or glibc distroless?" — musl: max portability/scratch images (mind DNS + allocator); glibc+distroless: performance (jemalloc default on glibc via std), NSS behavior, larger attack surface managed.
- Q: "How do you make Docker builds fast?" — cargo-chef manifest caching, BuildKit cache mounts for registry + target dir, `sccache`, `debug = false` for deps, `cargo build --release` profile tuning, sparse registry protocol (default stable).
- Q: "Rust cold starts on Lambda?" — ~10-50ms range typically (vs hundreds for JVM/interpreted) — Rust is ideal for latency-sensitive serverless.
- Idiomatic: commit `Cargo.lock`; `cargo deny` + `cargo audit` in CI; SBOM generation (`cargo sbom` / syft) per release
- Idiomatic: `RUSTFLAGS` consistency between CI and release builds (`-C target-cpu=x86-64-v3` decision: portability vs SIMD gains)
- Pattern: release pipeline: build → test (nextest) → audit/deny → SBOM → image scan (trivy/grype — mostly clean for Rust) → sign (cosign) → deploy canary → promote
- Pattern: binary + symbols sidecar artifact; `RUST_BACKTRACE=1` default in container env; `RUST_LOG` externally configurable
- Anti-pattern: fat `ubuntu:latest` runtime images with the whole toolchain; `curl | sh` in Dockerfiles; unpinned base image tags (`:latest`); building as root in the container

### Capstone Assessment Checklist

#### In plain English

This checklist is the final exam. Each line is something a senior Rust engineer can do. Use the table to see what each line really means and which chapters prepare you for it.

```diagram
{"n":"A:Modules 1 to 3 - safe memory and concurrency:0:0|B:Modules 4 to 5 - async services and APIs:1:0|C:Module 6 - data:2:0|D:Module 7 - operations:3:0|E:!Production ready Rust engineer:3:1","e":"A>B:foundation|B>C:build|C>D:run|D>E"}
```

| You can… | In plain words | Prepared by |
| --- | --- | --- |
| Explain any panic or borrow error | Read the compiler’s message and say why it is right | 1.1 to 1.5, 2.5 |
| Diagnose a slow p99 | Tell a blocked runtime from an exhausted pool | 4.3, 6.2, 7.2, 7.3 |
| Run a zero-downtime schema change | Expand and contract without breaking old servers | 6.2 |
| Order middleware on purpose | Trace, auth, rate limit, timeout, then the handler | 5.2 |
| Shut down gracefully | Drain in-flight requests, cancel tasks, close pools | 4.4, 5.1 |
| Choose the right sharing tool | `Arc<Mutex>`, channel or async primitive, and justify it | 3.2 to 3.4, 4.4 |
| Ship a minimal, auditable image | Locked dependencies, small image, a list of what is inside | 7.4 |

#### The full checklist


Mastery is demonstrated when you can:

- Explain any panic or borrow-check error in production code without experimentation, and justify the fix
- Diagnose a p99 latency regression using tokio-console + flamegraphs, distinguishing event-loop blocking from pool exhaustion
- Design a zero-downtime schema migration with expand/contract phases and validate it against SQLx's compile-time checks
- Write a Tower middleware stack with deliberate ordering (trace → auth → rate limit → timeout → handler) and defend each decision
- Implement graceful shutdown with connection draining, cancellation tokens, and idempotent request handling
- Choose between `Arc<Mutex<T>>`, channels, and `tokio::sync` primitives for a given shared-state problem, with measured justification
- Produce a minimal, auditable container image with locked dependencies, SBOM, and reproducible build flags

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
