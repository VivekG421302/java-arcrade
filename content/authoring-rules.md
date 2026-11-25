# java-arcrade Module Authoring Rules
_These rules must be followed by any author (human or AI) adding or rewriting content for this repo._

---

## 1. Purpose of a lesson section
A section must teach everything a student needs to solve the IDE exercise that follows it, and nothing the student is never tested on should block understanding. If a concept appears in an exercise, it must be taught in its section. If it is not in an exercise, it may still be included but must not break the flow.

---

## 2. Visual-first writing: diagrams, sequences, Imagine, tables

### 2a. Every concept gets its own Imagine
Every sub-concept (not just the section opener) needs its own `> **Imagine:**` line. The story must:
- Compare the concept to something from everyday life (kitchen, relay race, hotel, parcel, laminated card, etc.)
- Be one to three sentences
- Not use jargon in the story itself (the technical word can follow immediately after)
- Directly map to the diagram or code that follows it

**Wrong:**
> **Imagine:** Generics are like a type-safe container.

**Right:**
> **Imagine:** A vending machine for a specific product. You put in a coin and get exactly a chocolate bar, not a random mystery item. `generics` are that vending machine: you tell it the type once, and it only accepts and returns that type, with no guessing and no casting.

### 2b. Every concept gets a diagram or sequence
- A **flow** (nodes and arrows between them): use ` ```diagram ` with the JSON spec `{"n":"...", "e":"..."}`.
- A **sequence** (who does what, in order, across actors): use ` ```sequence ` with `{"p":"...", "m":"..."}`.
- Choose a **sequence** when the concept is a conversation or a timeline across multiple actors (e.g. thread visibility, method call chain, exception propagation).
- Choose a **diagram** for structure, hierarchy, or state transitions.
- **Never** place two diagram/sequence blocks back-to-back without prose between them.
- **Validate** every diagram JSON before committing using `node --experimental-strip-types /tmp/m5/checkdiag.mjs <file>`. All problems must be 0.

**Diagram node spec:** `"n":"ID:Label:col:row|..."` — ID must be `\w+`; label text before `:col:row`; `!` prefix makes it a terminal/highlight node; `col` and `row` are integers (0-based). **Edge spec:** `"e":"A>B:label|..."` — ID must exist in `n`. All IDs in edges must exist in `n`. No duplicate IDs. No two nodes at the same `col,row`.

**Sequence spec:** `"p":"ID:Label|..."` for participants; `"m":"A>B:text|..."` for messages. All IDs in `m` must exist in `p`. Use `~` prefix on message text to show it as a return/response (dashed arrow).

### 2c. Tables for correlation and quick reference
Use a markdown table whenever:
- Two or more things are being compared (`==` vs `equals`, checked vs unchecked)
- A list of options each have a "when to use" answer
- There is a "which Java version?" question

Always include a **Which Java version? (quick reference)** table at the bottom of every section. Format:

```markdown
| Feature | Applies from |
| --- | --- |
| `keyword` | Java N |
```

If a feature exists since Java 1 / very early and is not interesting to call out, omit it rather than list "Java 1".

### 2d. Keyword highlighting
Every technical term that has a precise meaning must be wrapped in backticks on its **first use** in each sub-section (numbered heading). Repeat the backtick when the word appears in a diagram label, table cell or code comment if it helps. Do not over-backtick prose (not every occurrence, just the first in each sub-heading).

---

## 3. Structure of a section

```
<one-sentence intro: what this section is about>

> **Imagine:** <story for the main concept>

#### Lifecycle diagram: <Name> (or just: a plain #### heading for the diagram)

[diagram or sequence block]

[1-3 sentences connecting the diagram to real life]

#### N. Sub-concept name

> **Imagine:** <story>

[diagram or sequence if applicable]

[prose, 3-10 sentences]

[code block if the concept needs code]

[table if applicable]

...repeat for each sub-concept...

#### Common mistakes

| Mistake | Fix |
| --- | --- |
| ... | ... |

#### Which Java version? (quick reference)

| Feature | Applies from |
| --- | --- |
| ... | ... |
```

Rules:
- Sub-concept headings use `####` (H4). Do not use H2 or H3 inside a section.
- Number the sub-concept headings (`#### 1.`, `#### 2.`, ...).
- Finish with a **Common mistakes** table and the **Which Java version?** table, in that order, every time.
- Do not add a "Summary" or "Review" at the end; the tables are the summary.
- Do not use bullet-only walls of text. Each sub-concept is prose + diagram + table, not a list of bullets.

---

## 4. Code samples
- Every code sample must be compiled and run with `javac` + `java` (JDK 17) before the content is committed. Output must match what the comment says.
- Use `// comment` on the same line to show the expected output: `System.out.println(a + b); // 5`.
- Keep each sample short (under 30 lines). One sample per idea.
- Do not include `package` statements; the IDE runs `Main.java` as a single file.
- Prefer the simplest Java version that works (do not use Java 21 syntax when Java 8 syntax is clearer).
- After a code block, one sentence explaining **why** the output is what it is.

---

## 5. The exercise alignment rule
Before writing a section, read the exercise file that follows it (`content/exercises/java/`). The section **must teach**:
- Every method, keyword, exception type, operator and class used in the exercise starter or the solution.
- The exact error messages used in `throw new X("message")`.
- Every concept in the hint.
After writing the section, re-read the exercise hint. If the hint refers to something the section does not cover, add it to the section.

---

## 6. Exercise rewrite rules
An exercise must be rewritten if any of the following are true:
- The hint refers to a concept not in the matching section.
- The starter compiles but the student has no path from the starter to the solution using only what the section taught.
- A concept in the solution appears nowhere in the matching section.

When rewriting an exercise:
- Keep `id`, `module`, `after`, `title`, `level`, `expect`, and `solution` exactly as they are.
- Rewrite `task` to explain clearly what output is expected and why.
- Rewrite `hint` with three levels: (Hint 1) conceptual direction, (Hint 2) the method/keyword to look up, (Hint 3) the shape of the solution without giving away the solution.
- Rewrite `starter` with stepwise `// step N:` comments that guide without solving.
- Run `node --experimental-strip-types scripts/verify-exercises.mjs java <exercise-id>` and confirm: `solution:solves` and `starter:compiles, not solved`.

---

## 7. Commits
- One commit per section rewrite. Message format: `Module 5, <Section Title>: visual lesson (Imagine stories, N diagrams, tables, Java version tags)`.
- One commit per exercise rewrite. Message format: `Module 5 exercise '<title>': aligned starter, three-level hint`.
- Never commit a section and an exercise in the same commit.
- Always run `npm run content` and `npx tsc --noEmit` before committing. Both must succeed with no errors.
- Never commit content that changes the number of sections or their `id` values (checked with `python3 -c "import json; d=json.load(open('src/content.json'))['java']['phases'][4]; print(len(d['sections']), [s['id'] for s in d['sections']])"`)

---

## 8. The splice workflow
Use `/tmp/m5/splice.py "<Section Title>" <file.md>` to replace the body of a section in `content/roadmap.md` without touching any other section or any other module. The script is at `/tmp/m5/splice.py` in the working container. After splicing, always run `npm run content` and check for errors before committing.

---

## 9. What NOT to do
- Do not write a section that is a wall of bullet points.
- Do not add `diagram` blocks without validating them.
- Do not explain what a concept "relates to" without saying what it **does**.
- Do not add "In conclusion" or "To summarise" paragraphs.
- Do not use phrases like "it's important to note" or "as we learned".
- Do not leave the **Imagine** as the first line of the whole section; it must come inside or just before the concept it explains.
- Do not write a **Which Java version?** table that only lists "Java 8+" for everything — be specific.
