// Builds the "call every test case and print the result" lines that go into each problem's starter main().
// Test inputs look like `nums = [2,7,11,15], target = 9` and outputs like `[0,1]`; this turns them into typed Java / Rust
// calls using the method signature. Anything it cannot convert safely returns null, and the starter keeps its old comment hints.

const bad = () => { throw new Error('unsupported') }

/** Splits on commas that are not inside [], (), <>, {} or quotes. */
export function splitTop(s, angle = false) {
  const out = []
  let depth = 0, cur = '', q = null
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (q) { cur += c; if (c === '\\') cur += s[++i] ?? ''; else if (c === q) q = null; continue }
    if (c === '"') { q = c; cur += c; continue }
    if ('[({'.includes(c) || (angle && c === '<')) depth++
    if (']})'.includes(c) || (angle && c === '>' && s[i - 1] !== '-')) depth--
    if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue }
    cur += c
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

/** `a = [1,2], b = 3` -> ['[1,2]', '3'] (null when the input is prose, not name = value pairs). */
export function parseInput(input) {
  const parts = splitTop(input)
  if (!parts.length) return null
  const vals = []
  for (const p of parts) {
    const m = p.match(/^([A-Za-z_]\w*)\s*=\s*([\s\S]+)$/)
    if (!m) return null
    vals.push(m[2].trim())
  }
  return vals
}

/** JSON-ish value of a raw test literal (`[1,null]`, `"abc"`, `'a'`, `true`, `7`). */
function jsonOf(raw) {
  if (/^'(.)'$/.test(raw)) return raw[1]
  try { return JSON.parse(raw) } catch { return bad() }
}

/** Expected output text -> { want, alts } with commentary such as "(5 + 5 + 1)" or "is also accepted" removed. */
export function cleanExpected(out) {
  const s = out.replace(/`/g, '').trim()
  let tok = ''
  if (s[0] === '[') {
    let d = 0, q = false
    for (let i = 0; i < s.length; i++) {
      const c = s[i]
      if (q) { if (c === '\\') i++; else if (c === '"') q = false; continue }
      if (c === '"') q = true
      else if (c === '[') d++
      else if (c === ']' && --d === 0) { tok = s.slice(0, i + 1); break }
    }
  } else if (s[0] === '"') {
    const m = s.match(/^"(?:[^"\\]|\\.)*"/)
    tok = m ? m[0] : ''
  } else {
    tok = (s.match(/^[^\s,(]+/) || [''])[0]
  }
  if (!tok || !/^(\[|"|-?\d|true$|false$|null$)/.test(tok)) return null
  const rest = s.slice(tok.length)
  const alts = /accept/i.test(rest) ? [...rest.matchAll(/"([^"]*)"/g)].map((m) => `"${m[1]}"`) : []
  return { want: tok, alts }
}

const ORDER_FREE = /any order|in any order|either order|one valid|any valid/i
const ORDERED_LISTS = /level order|right side view|zigzag/i   // List results where the order is part of the answer

// ---------------------------------------------------------------- Java
const JPRIM = new Set(['int', 'long', 'short', 'byte', 'double', 'float', 'boolean', 'char', 'Integer', 'Long', 'Double', 'Boolean', 'Character'])

function jscalar(t, x) {
  switch (t) {
    case 'int': case 'short': case 'byte': case 'Integer':
      return Number.isInteger(x) ? String(x) : bad()
    case 'long': case 'Long':
      return Number.isInteger(x) ? (Math.abs(x) > 2147483647 ? `${x}L` : String(x)) : bad()
    case 'double': case 'Double':
      return typeof x === 'number' ? (Number.isInteger(x) ? `${x}.0` : String(x)) : bad()
    case 'float':
      return typeof x === 'number' ? `${x}f` : bad()
    case 'boolean': case 'Boolean':
      return typeof x === 'boolean' ? String(x) : bad()
    case 'char': case 'Character':
      return typeof x === 'string' && [...x].length === 1 ? `'${x === "'" ? "\\'" : x === '\\' ? '\\\\' : x}'` : bad()
    case 'String':
      return typeof x === 'string' ? JSON.stringify(x) : bad()
    default:
      return bad()
  }
}

/** Java expression for a test value of declared type `type`; `use` collects the helper methods it needs. */
function jlit(type, raw, use) {
  type = type.trim()
  if (type === 'int' && /^[01]{32}$/.test(raw)) return `0b${raw}`   // bit-string inputs (Number of 1 Bits, Reverse Bits)
  const v = jsonOf(raw)
  const node = (t, x) => {
    if (!Array.isArray(x)) bad()
    if (t === 'ListNode') { if (x.some((e) => typeof e !== 'number')) bad(); use.add('list'); return x.length ? `list(${x.join(', ')})` : 'null' }
    if (x.some((e) => e !== null && typeof e !== 'number')) bad()
    use.add('tree'); return x.length ? `tree(${x.map((e) => (e === null ? 'null' : e)).join(', ')})` : 'null'
  }
  if (type === 'ListNode' || type === 'TreeNode') return node(type, v)
  if (type === 'ListNode[]') { if (!Array.isArray(v)) bad(); return `new ListNode[]{${v.map((x) => node('ListNode', x)).join(', ')}}` }
  if (type.endsWith('[]')) {
    if (!Array.isArray(v)) bad()
    const init = (t, a) => `{${a.map((x) => (t.endsWith('[]') ? (Array.isArray(x) ? init(t.slice(0, -2), x) : bad()) : jscalar(t, x))).join(', ')}}`
    return `new ${type}${init(type.slice(0, -2), v)}`
  }
  const list = type.match(/^List<(.+)>$/)
  if (list) {
    if (!Array.isArray(v)) bad()
    const inner = (t, a) => {
      const l = t.match(/^List<(.+)>$/)
      return `Arrays.asList(${a.map((x) => (l ? (Array.isArray(x) ? inner(l[1], x) : bad()) : jscalar(t, x))).join(', ')})`
    }
    return v.length ? `new ArrayList<>(${inner(type, v)})` : 'new ArrayList<>()'
  }
  if (!JPRIM.has(type) && type !== 'String') bad()
  return jscalar(type, v)
}

function jshow(ret, expr, use) {
  if (ret === 'ListNode') use.add('list')
  if (ret === 'TreeNode') use.add('tree')
  if (/^(int|long|short|byte|double|float|boolean|char|String)\[\]$/.test(ret)) return `Arrays.toString(${expr})`
  if (/^[\w<>]+(\[\]){2,}$/.test(ret)) return `Arrays.deepToString(${expr})`
  if (ret === 'ListNode' || ret === 'TreeNode') return `show(${expr})`
  if (/\[\]|\bNode\b/.test(ret)) bad()
  return expr
}

export const JAVA_HELPERS = {
  list: `    static ListNode list(int... a) {
        ListNode dummy = new ListNode(0), tail = dummy;
        for (int x : a) { tail.next = new ListNode(x); tail = tail.next; }
        return dummy.next;
    }

    static String show(ListNode n) {
        StringBuilder s = new StringBuilder("[");
        for (; n != null; n = n.next) { if (s.length() > 1) s.append(","); s.append(n.val); }
        return s.append("]").toString();
    }`,
  tree: `    static TreeNode tree(Integer... a) {   // level order, null = missing child
        if (a.length == 0 || a[0] == null) return null;
        TreeNode root = new TreeNode(a[0]);
        Deque<TreeNode> q = new ArrayDeque<>();
        q.add(root);
        for (int i = 1; i < a.length && !q.isEmpty(); ) {
            TreeNode n = q.poll();
            if (i < a.length && a[i] != null) { n.left = new TreeNode(a[i]); q.add(n.left); }
            i++;
            if (i < a.length && a[i] != null) { n.right = new TreeNode(a[i]); q.add(n.right); }
            i++;
        }
        return root;
    }

    static String show(TreeNode root) {
        if (root == null) return "[]";
        List<String> out = new ArrayList<>();
        Deque<TreeNode> q = new LinkedList<>();
        q.add(root);
        while (!q.isEmpty()) {
            TreeNode n = q.poll();
            if (n == null) { out.add("null"); continue; }
            out.add("" + n.val);
            q.add(n.left); q.add(n.right);
        }
        int end = out.size();
        while (end > 0 && out.get(end - 1).equals("null")) end--;
        return "[" + String.join(",", out.subList(0, end)) + "]";
    }`,
}

/** `int[] twoSum(int[] nums, int target)` -> { ret, name, params: [{ type, name }] }. */
export function parseJavaSig(sig) {
  const m = sig.match(/^(.+?)\s+(\w+)\((.*)\)$/)
  if (!m) return null
  const params = splitTop(m[3], true).map((p) => {
    const i = p.lastIndexOf(' ')
    return i < 0 || p.includes('...') ? null : { type: p.slice(0, i).trim(), name: p.slice(i + 1) }
  })
  if (params.includes(null)) return null
  return { ret: m[1].trim(), name: m[2], params }
}

/** -> { body: string[] (lines for main), helpers: string[], expect: string[][], loose: boolean } or null. */
export function javaCalls(q, sig, max = 5) {
  if (!sig) return null
  const use = new Set()
  const body = [], expect = []
  try {
    for (const t of q.tests.slice(0, max)) {
      const vals = parseInput(t.input)
      const exp = cleanExpected(t.output)
      if (!vals || !exp || vals.length !== sig.params.length) continue
      const args = vals.map((raw, i) => jlit(sig.params[i].type, raw, use))
      const note = `  // expected: ${exp.want}`
      if (sig.ret === 'void') {
        const k = sig.params.findIndex((p) => /\[\]$|^(ListNode|TreeNode)$/.test(p.type))
        if (k < 0) bad()
        const v = `${sig.params[k].name}${expect.length + 1}`
        const callArgs = args.map((a, i) => (i === k ? v : a))
        body.push(`        ${sig.params[k].type} ${v} = ${args[k]};`)
        body.push(`        new Solution().${sig.name}(${callArgs.join(', ')});`)
        body.push(`        System.out.println(${jshow(sig.params[k].type, v, use)});${note}`)
      } else {
        body.push(`        System.out.println(${jshow(sig.ret, `new Solution().${sig.name}(${args.join(', ')})`, use)});${note}`)
      }
      expect.push([exp.want, ...exp.alts])
    }
  } catch { return null }
  if (!expect.length) return null
  // a stub that just returns its default value must not pass: skip when every expected value is that default
  const dflt = { boolean: 'false', int: '0', long: '0', short: '0', byte: '0', double: '0.0', float: '0' }[sig.ret]
  if (dflt !== undefined && expect.every((e) => Number(e[0]) === Number(dflt) || e[0] === dflt)) return null
  const loose = ORDER_FREE.test(q.statement) || (/^List</.test(sig.ret) && !ORDERED_LISTS.test(q.title))
  return { body, helpers: [...use].map((u) => JAVA_HELPERS[u]), expect, loose }
}

// ---------------------------------------------------------------- Rust
export const RUST_HELPERS = {
  list: `pub fn list(a: &[i32]) -> Option<Box<ListNode>> {
    let mut head: Option<Box<ListNode>> = None;
    for &v in a.iter().rev() { head = Some(Box::new(ListNode { val: v, next: head })); }
    head
}
pub fn lv(l: &Option<Box<ListNode>>) -> Vec<i32> {
    let mut out = vec![]; let mut cur = l;
    while let Some(n) = cur { out.push(n.val); cur = &n.next; }
    out
}`,
  tree: `// level-order tree from "[3,9,20,null,null,15,7]"
pub fn tree(s: &str) -> Option<Box<TreeNode>> {
    let t = s.trim().trim_start_matches('[').trim_end_matches(']');
    if t.is_empty() { return None; }
    let vals: Vec<Option<i32>> = t.split(',').map(|x| { let x = x.trim(); if x == "null" { None } else { Some(x.parse().unwrap()) } }).collect();
    // build with an arena then link bottom-up
    let n = vals.len();
    let mut kids: Vec<(Option<usize>, Option<usize>)> = vec![(None, None); n];
    let mut q: VecDeque<usize> = VecDeque::new();
    if vals[0].is_none() { return None; }
    q.push_back(0);
    let mut i = 1;
    while let Some(p) = q.pop_front() {
        if i < n { if vals[i].is_some() { kids[p].0 = Some(i); q.push_back(i); } i += 1; }
        if i < n { if vals[i].is_some() { kids[p].1 = Some(i); q.push_back(i); } i += 1; }
    }
    fn build(i: usize, vals: &Vec<Option<i32>>, kids: &Vec<(Option<usize>, Option<usize>)>) -> Option<Box<TreeNode>> {
        Some(Box::new(TreeNode { val: vals[i].unwrap(), left: kids[i].0.and_then(|k| build(k, vals, kids)), right: kids[i].1.and_then(|k| build(k, vals, kids)) }))
    }
    build(0, &vals, &kids)
}
pub fn ts(t: &Option<Box<TreeNode>>) -> String {
    let root = match t { None => return "[]".to_string(), Some(r) => r };
    let mut out: Vec<String> = vec![];
    let mut q: VecDeque<Option<&Box<TreeNode>>> = VecDeque::new();
    q.push_back(Some(root));
    while let Some(x) = q.pop_front() {
        match x { None => out.push("null".to_string()), Some(n) => { out.push(n.val.to_string()); q.push_back(n.left.as_ref()); q.push_back(n.right.as_ref()); } }
    }
    while out.last().map_or(false, |s| s == "null") { out.pop(); }
    format!("[{}]", out.join(","))
}
pub fn grid(rows: &[&str]) -> Vec<Vec<char>> { rows.iter().map(|r| r.chars().collect()).collect() }
pub fn strs(a: &[&str]) -> Vec<String> { a.iter().map(|s| s.to_string()).collect() }`,
}

const RNUM = new Set(['i32', 'i64', 'u32', 'u64', 'usize', 'isize', 'u8', 'i8', 'i16', 'u16'])
function rscalar(t, x) {
  if (RNUM.has(t)) return Number.isInteger(x) ? String(x) : bad()
  if (t === 'f64' || t === 'f32') return typeof x === 'number' ? (Number.isInteger(x) ? `${x}.0` : String(x)) : bad()
  if (t === 'bool') return typeof x === 'boolean' ? String(x) : bad()
  if (t === 'char') return typeof x === 'string' && [...x].length === 1 ? `'${x === "'" ? "\\'" : x === '\\' ? '\\\\' : x}'` : bad()
  if (t === 'String') return typeof x === 'string' ? `${JSON.stringify(x)}.to_string()` : bad()
  if (t === '&str') return typeof x === 'string' ? JSON.stringify(x) : bad()
  return bad()
}

/** Rust expression for a test value; `use` collects helpers. The value is built for the plain (owned) type. */
function rlit(type, raw, use) {
  type = type.trim()
  if (type === 'u32' && /^[01]{32}$/.test(raw)) return `0b${raw}`
  const v = jsonOf(raw)
  const lst = () => { if (!Array.isArray(v) || v.some((e) => typeof e !== 'number')) bad(); use.add('list'); return v.length ? `list(&[${v.join(', ')}])` : 'None' }
  const tre = (x) => { if (!Array.isArray(x) || x.some((e) => e !== null && typeof e !== 'number')) bad(); use.add('tree'); return x.length ? `tree("[${x.map((e) => (e === null ? 'null' : e)).join(',')}]")` : 'None' }
  if (type === 'Option<Box<ListNode>>') return lst()
  if (type === 'Option<Box<TreeNode>>') return tre(v)
  if (type === 'Vec<Option<Box<ListNode>>>') { if (!Array.isArray(v)) bad(); return `vec![${v.map((x) => { const save = v; void save; if (!Array.isArray(x)) bad(); use.add('list'); return x.length ? `list(&[${x.join(', ')}])` : 'None' }).join(', ')}]` }
  const vec = type.match(/^Vec<(.+)>$/)
  if (vec) {
    if (!Array.isArray(v)) bad()
    const inner = (t, a) => {
      const m = t.match(/^Vec<(.+)>$/)
      return `vec![${a.map((x) => (m ? (Array.isArray(x) ? inner(m[1], x) : bad()) : rscalar(t, x))).join(', ')}]`
    }
    return inner(type, v)
  }
  return rscalar(type, v)
}

/** `pub fn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32>` (without pub fn) -> { name, params, ret }. */
export function parseRustSig(sig) {
  const m = sig.match(/^(\w+)\((.*?)\)\s*(?:->\s*(.+))?$/)
  if (!m) return null
  const params = splitTop(m[2], true).map((p) => { const i = p.indexOf(':'); return i < 0 ? null : { name: p.slice(0, i).trim(), type: p.slice(i + 1).trim() } })
  if (params.includes(null)) return null
  return { name: m[1], params, ret: (m[3] || '()').trim() }
}

function rshow(ret, expr, use) {
  if (ret === 'Option<Box<ListNode>>') { use.add('list'); return `lv(&${expr})` }
  if (ret === 'Option<Box<TreeNode>>') { use.add('tree'); return `ts(&${expr})` }
  if (/Node|Rc|\(|usize>/.test(ret)) bad()
  return expr
}

export function rustCalls(q, sig, max = 5) {
  if (!sig) return null
  const use = new Set()
  const body = [], expect = []
  try {
    for (const t of q.tests.slice(0, max)) {
      const vals = parseInput(t.input)
      const exp = cleanExpected(t.output)
      if (!vals || !exp || vals.length !== sig.params.length) continue
      const note = `  // expected: ${exp.want}`
      const k = sig.ret === '()' ? sig.params.findIndex((p) => /^&mut /.test(p.type)) : -1
      if (sig.ret === '()' && k < 0) bad()
      const args = sig.params.map((p, i) => {
        const owned = p.type.replace(/^&(mut )?/, '')
        const lit = rlit(owned, vals[i], use)
        if (i === k) return `&mut ${p.name}${expect.length + 1}`
        return /^&/.test(p.type) ? `&${lit}` : lit
      })
      if (sig.ret === '()') {
        const p = sig.params[k], v = `${p.name}${expect.length + 1}`
        const owned = p.type.replace(/^&mut /, '')
        body.push(`    let mut ${v} = ${rlit(owned, vals[k], use)};`)
        body.push(`    Solution::${sig.name}(${args.join(', ')});`)
        const shown = owned === 'Option<Box<ListNode>>' ? (use.add('list'), `lv(&${v})`) : v
        body.push(`    println!("{:?}", ${shown});${note}`)
      } else {
        body.push(`    println!("{:?}", ${rshow(sig.ret, `Solution::${sig.name}(${args.join(', ')})`, use)});${note}`)
      }
      expect.push([exp.want, ...exp.alts])
    }
  } catch { return null }
  if (!expect.length) return null
  const loose = ORDER_FREE.test(q.statement) || (/^Vec<Vec</.test(sig.ret) && !ORDERED_LISTS.test(q.title))
  return { body, helpers: [...use].map((u) => RUST_HELPERS[u]), expect, loose }
}
