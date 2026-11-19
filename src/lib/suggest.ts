// Context-aware suggestions for the code editor (Java and Rust). Pure functions, no imports, so it can be tested in Node.
// suggest(text, caret, lang) looks at the line before the caret and answers with ranked items:
//   member  after "name."          -> methods/fields of the variable's type (type read from its declaration)
//   init    after "Type name ="    -> "new HashMap<>()" for Map, "new ArrayList<>()" for List, ...
//   name    after "Type "          -> variable names for that type, plus "name = new X<>();"
//   word    while typing a word    -> statements, types (Map -> full declaration), variables of the file, ranked by use
//   idle    nothing typed          -> the statements you most likely want here (never ";" on an empty line)
export type Kind = 'keyword' | 'type' | 'method' | 'field' | 'var' | 'snippet'
export type Lang = 'java' | 'rust'
export type Sug = { label: string; insert: string; back: number; kind: Kind; detail?: string; replace: number }
export type Result = { items: Sug[]; ctx: 'member' | 'init' | 'name' | 'word' | 'idle' | 'none'; first: string[]; last: string[] }

const MARK = '\u2038'   // caret position inside a snippet body

// ------------------------------------------------------------------ usage (most used rises to the top)
let usage: Record<string, number> = {}
export const loadUsage = (u: Record<string, number>) => { usage = { ...u } }
export const getUsage = () => usage
export const bump = (label: string) => { usage[label] = (usage[label] || 0) + 1 }
const boost = (label: string) => Math.min(60, Math.log2(1 + (usage[label] || 0)) * 12)

function mk(label: string, body: string, kind: Kind, detail: string | undefined, replace: number): Sug {
  const i = body.indexOf(MARK)
  const insert = body.replace(MARK, '')
  return { label, insert, back: i < 0 ? 0 : insert.length - i, kind, detail, replace }
}

// ------------------------------------------------------------------ member catalogs, most used first. "name(args):ret", fields ".name:ret"
type Group = { p?: string[]; ext?: string; m: string }
const JAVA: Record<string, Group> = {
  String: { m: 'length():int;charAt(i):char;equals(s):boolean;substring(a, b):String;isEmpty():boolean;indexOf(s):int;contains(s):boolean;split(regex):String[];toCharArray():char[];toLowerCase():String;toUpperCase():String;trim():String;startsWith(s):boolean;endsWith(s):boolean;replace(a, b):String;compareTo(s):int;equalsIgnoreCase(s):boolean;chars():Stream;repeat(n):String;strip():String;lastIndexOf(s):int;isBlank():boolean;matches(regex):boolean;hashCode():int;concat(s):String' },
  StringBuilder: { m: 'append(x):StringBuilder;toString():String;length():int;reverse():StringBuilder;charAt(i):char;insert(i, x):StringBuilder;deleteCharAt(i):StringBuilder;setLength(n):void;setCharAt(i, c):void;isEmpty():boolean;indexOf(s):int;delete(a, b):StringBuilder;substring(a, b):String;replace(a, b, s):StringBuilder' },
  List: { p: ['E'], m: 'add(e):boolean;get(i):E;size():int;isEmpty():boolean;contains(e):boolean;remove(i):E;set(i, e):E;clear():void;indexOf(e):int;addAll(c):boolean;sort(cmp):void;stream():Stream;forEach(fn):void;subList(a, b):List<E>;toArray():Object[];iterator():Iterator<E>;removeIf(p):boolean;lastIndexOf(e):int;containsAll(c):boolean' },
  LinkedList: { p: ['E'], ext: 'List', m: 'addFirst(e):void;addLast(e):void;removeFirst():E;removeLast():E;getFirst():E;getLast():E;peek():E;poll():E;push(e):void;pop():E;offer(e):boolean' },
  Map: { p: ['K', 'V'], m: 'put(k, v):V;get(k):V;containsKey(k):boolean;getOrDefault(k, d):V;entrySet():Set<Map.Entry<K, V>>;keySet():Set<K>;values():List<V>;size():int;isEmpty():boolean;remove(k):V;putIfAbsent(k, v):V;merge(k, v, fn):V;computeIfAbsent(k, fn):V;containsValue(v):boolean;clear():void;forEach(fn):void;compute(k, fn):V;putAll(m):void' },
  TreeMap: { p: ['K', 'V'], ext: 'Map', m: 'firstKey():K;lastKey():K;floorKey(k):K;ceilingKey(k):K;higherKey(k):K;lowerKey(k):K;firstEntry():Map.Entry<K, V>;lastEntry():Map.Entry<K, V>;pollFirstEntry():Map.Entry<K, V>;headMap(k):TreeMap<K, V>;tailMap(k):TreeMap<K, V>' },
  Entry: { p: ['K', 'V'], m: 'getKey():K;getValue():V;setValue(v):V' },
  Set: { p: ['E'], m: 'add(e):boolean;contains(e):boolean;remove(e):boolean;size():int;isEmpty():boolean;clear():void;addAll(c):boolean;retainAll(c):boolean;removeAll(c):boolean;iterator():Iterator<E>;stream():Stream;containsAll(c):boolean;forEach(fn):void' },
  TreeSet: { p: ['E'], ext: 'Set', m: 'first():E;last():E;floor(e):E;ceiling(e):E;higher(e):E;lower(e):E;pollFirst():E;pollLast():E;headSet(e):TreeSet<E>;tailSet(e):TreeSet<E>' },
  Queue: { p: ['E'], m: 'offer(e):boolean;poll():E;peek():E;add(e):boolean;remove():E;size():int;isEmpty():boolean;clear():void;contains(e):boolean;iterator():Iterator<E>;stream():Stream' },
  Deque: { p: ['E'], ext: 'Queue', m: 'offerFirst(e):boolean;offerLast(e):boolean;pollFirst():E;pollLast():E;peekFirst():E;peekLast():E;push(e):void;pop():E;addFirst(e):void;addLast(e):void;removeFirst():E;removeLast():E;getFirst():E;getLast():E' },
  PriorityQueue: { p: ['E'], ext: 'Queue', m: '' },
  Stack: { p: ['E'], m: 'push(e):E;pop():E;peek():E;isEmpty():boolean;empty():boolean;size():int;clear():void;contains(e):boolean;get(i):E;search(e):int' },
  Iterator: { p: ['E'], m: 'hasNext():boolean;next():E;remove():void' },
  Optional: { p: ['T'], m: 'isPresent():boolean;get():T;orElse(x):T;isEmpty():boolean;ifPresent(fn):void;map(fn):Optional;orElseThrow():T' },
  Stream: { m: 'filter(p):Stream;map(fn):Stream;mapToInt(fn):Stream;collect(c):Object;forEach(fn):void;sum():int;count():long;sorted():Stream;distinct():Stream;limit(n):Stream;boxed():Stream;toList():List;reduce(id, fn):Object;anyMatch(p):boolean;allMatch(p):boolean;max():Optional;min():Optional;average():Optional;toArray():int[]' },
  Integer: { m: 'intValue():int;compareTo(o):int;equals(o):boolean;toString():String;hashCode():int' },
  array: { m: '.length:int;clone():Object' },
  ListNode: { m: '.val:int;.next:ListNode' },
  TreeNode: { m: '.val:int;.left:TreeNode;.right:TreeNode' },
  Object: { m: 'equals(o):boolean;hashCode():int;toString():String;getClass():Class' },
}
const JAVA_STATIC: Record<string, string> = {
  Math: 'max(a, b):int;min(a, b):int;abs(x):int;pow(a, b):double;sqrt(x):double;floor(x):double;ceil(x):double;round(x):long;random():double;floorMod(a, b):int;log(x):double;hypot(a, b):double',
  Arrays: 'toString(a):String;sort(a):void;fill(a, v):void;asList(a):List;copyOf(a, n):int[];copyOfRange(a, from, to):int[];deepToString(a):String;equals(a, b):boolean;stream(a):Stream;binarySearch(a, key):int;setAll(a, fn):void',
  Collections: 'sort(list):void;reverse(list):void;max(c):E;min(c):E;swap(list, i, j):void;unmodifiableList(list):List;emptyList():List;shuffle(list):void;frequency(c, o):int;reverseOrder():Comparator;singletonList(x):List',
  Integer: 'parseInt(s):int;valueOf(x):Integer;MAX_VALUE;MIN_VALUE;compare(a, b):int;toString(i):String;toBinaryString(i):String;bitCount(i):int;sum(a, b):int;max(a, b):int;min(a, b):int;signum(i):int',
  Long: 'parseLong(s):long;valueOf(x):Long;MAX_VALUE;MIN_VALUE;compare(a, b):int;toString(l):String;bitCount(l):int',
  Double: 'parseDouble(s):double;valueOf(x):Double;compare(a, b):int;MAX_VALUE;MIN_VALUE;POSITIVE_INFINITY;NEGATIVE_INFINITY;isNaN(d):boolean',
  Character: 'isDigit(c):boolean;isLetter(c):boolean;isLetterOrDigit(c):boolean;isUpperCase(c):boolean;isLowerCase(c):boolean;toUpperCase(c):char;toLowerCase(c):char;getNumericValue(c):int;isWhitespace(c):boolean',
  String: 'valueOf(x):String;format(fmt, args):String;join(sep, parts):String;copyValueOf(a):String',
  List: 'of(a, b):List;copyOf(c):List',
  Set: 'of(a, b):Set;copyOf(c):Set',
  Map: 'of(k, v):Map;entry(k, v):Map.Entry;copyOf(m):Map;ofEntries(e):Map',
  System: 'out;err;in;currentTimeMillis():long;nanoTime():long;arraycopy(src, sp, dst, dp, n):void;exit(code):void;lineSeparator():String',
  'System.out': 'println(x):void;print(x):void;printf(fmt, args):PrintStream;format(fmt, args):PrintStream',
  Objects: 'equals(a, b):boolean;hash(args):int;requireNonNull(o):T;isNull(o):boolean;toString(o):String',
  Collectors: 'toList():Collector;toSet():Collector;toMap(k, v):Collector;groupingBy(fn):Collector;joining(sep):Collector;counting():Collector;summingInt(fn):Collector',
  Optional: 'of(x):Optional;empty():Optional;ofNullable(x):Optional',
  Boolean: 'parseBoolean(s):boolean;TRUE;FALSE',
}

const RUST: Record<string, Group> = {
  Vec: { p: ['T'], m: 'push(x):();len():usize;pop():Option<T>;iter():Iter;is_empty():bool;get(i):Option<T>;contains(&x):bool;insert(i, x):();remove(i):T;sort():();sort_by(|a, b| ):();sort_unstable():();reverse():();clear():();last():Option<T>;first():Option<T>;extend(iter):();swap(i, j):();iter_mut():Iter;into_iter():Iter;truncate(n):();join(sep):String;windows(n):Iter;chunks(n):Iter;binary_search(&x):Result;dedup():();retain(|x| ):();drain(..):Iter;to_vec():Vec<T>;clone():Vec<T>;resize(n, x):();split_at(i):();concat():Vec<T>' },
  String: { m: 'len():usize;chars():Iter;push_str(s):();push(c):();as_str():&str;to_string():String;to_uppercase():String;to_lowercase():String;trim():&str;split(pat):Iter;split_whitespace():Iter;parse::<i32>():Result;contains(pat):bool;starts_with(pat):bool;ends_with(pat):bool;replace(a, b):String;is_empty():bool;bytes():Iter;lines():Iter;as_bytes():Vec<u8>;find(pat):Option<usize>;to_owned():String;char_indices():Iter;repeat(n):String;clear():()' },
  HashMap: { p: ['K', 'V'], m: 'insert(k, v):Option<V>;get(&k):Option<V>;contains_key(&k):bool;entry(k):Entry;remove(&k):Option<V>;keys():Iter;values():Iter;len():usize;is_empty():bool;iter():Iter;get_mut(&k):Option<V>;values_mut():Iter;clear():()' },
  HashSet: { p: ['T'], m: 'insert(x):bool;contains(&x):bool;remove(&x):bool;len():usize;is_empty():bool;iter():Iter;union(&o):Iter;intersection(&o):Iter;difference(&o):Iter;clear():()' },
  VecDeque: { p: ['T'], m: 'push_back(x):();pop_front():Option<T>;push_front(x):();pop_back():Option<T>;front():Option<T>;back():Option<T>;len():usize;is_empty():bool;iter():Iter;clear():()' },
  BinaryHeap: { p: ['T'], m: 'push(x):();pop():Option<T>;peek():Option<T>;len():usize;is_empty():bool;into_sorted_vec():Vec<T>' },
  Option: { p: ['T'], m: 'unwrap():T;is_some():bool;is_none():bool;unwrap_or(x):T;map(|x| ):Option;and_then(|x| ):Option;ok_or(e):Result;expect("msg"):T;as_ref():Option;take():Option<T>;unwrap_or_else(|| ):T;as_mut():Option;cloned():Option<T>;unwrap_or_default():T' },
  Result: { p: ['T', 'E'], m: 'unwrap():T;expect("msg"):T;is_ok():bool;is_err():bool;map_err(|e| ):Result;ok():Option<T>;unwrap_or(x):T;unwrap_or_else(|e| ):T' },
  Iter: { m: 'map(|x| ):Iter;filter(|x| ):Iter;collect::<Vec<_>>():Vec;sum::<i32>():i32;enumerate():Iter;rev():Iter;zip(other):Iter;count():usize;fold(init, |acc, x| ):();any(|x| ):bool;all(|x| ):bool;max():Option;min():Option;take(n):Iter;skip(n):Iter;cloned():Iter;for_each(|x| ):();find(|x| ):Option;position(|x| ):Option<usize>;flat_map(|x| ):Iter;next():Option;peekable():Iter;copied():Iter;last():Option;max_by_key(|x| ):Option' },
  int: { m: 'abs():i32;pow(n):i32;min(o):i32;max(o):i32;checked_add(o):Option;wrapping_add(o):i32;saturating_sub(o):i32;to_string():String;count_ones():u32;signum():i32;rem_euclid(o):i32;leading_zeros():u32;clamp(a, b):i32' },
  char: { m: 'is_alphabetic():bool;is_numeric():bool;is_ascii_digit():bool;is_alphanumeric():bool;to_ascii_uppercase():char;to_ascii_lowercase():char;to_digit(10):Option<u32>;is_whitespace():bool;is_uppercase():bool;is_lowercase():bool' },
  f64: { m: 'sqrt():f64;abs():f64;powi(n):f64;floor():f64;ceil():f64;round():f64;max(o):f64;min(o):f64;sin():f64;cos():f64' },
}

const JAVA_ALIAS: Record<string, string> = {
  ArrayList: 'List', List: 'List', Collection: 'List', Vector: 'Stack', LinkedList: 'LinkedList', Map: 'Map', HashMap: 'Map', LinkedHashMap: 'Map', TreeMap: 'TreeMap',
  Set: 'Set', HashSet: 'Set', LinkedHashSet: 'Set', TreeSet: 'TreeSet', Queue: 'Queue', Deque: 'Deque', ArrayDeque: 'Deque', PriorityQueue: 'PriorityQueue',
  Stack: 'Stack', StringBuilder: 'StringBuilder', StringBuffer: 'StringBuilder', String: 'String', Iterator: 'Iterator', 'Map.Entry': 'Entry', Entry: 'Entry',
  Optional: 'Optional', Stream: 'Stream', IntStream: 'Stream', Integer: 'Integer', Long: 'Integer', Double: 'Integer', Character: 'Integer', ListNode: 'ListNode', TreeNode: 'TreeNode',
}
const RUST_ALIAS: Record<string, string> = {
  Vec: 'Vec', String: 'String', str: 'String', HashMap: 'HashMap', BTreeMap: 'HashMap', HashSet: 'HashSet', BTreeSet: 'HashSet', VecDeque: 'VecDeque', BinaryHeap: 'BinaryHeap',
  Option: 'Option', Result: 'Result', Iter: 'Iter', i32: 'int', i64: 'int', u32: 'int', u64: 'int', usize: 'int', isize: 'int', u8: 'int', i8: 'int', i16: 'int', u16: 'int', char: 'char', f64: 'f64', f32: 'f64',
}

// ------------------------------------------------------------------ small text helpers
const splitTop = (s: string): string[] => {
  const out: string[] = []
  let d = 0, cur = ''
  for (const c of s) {
    if (c === '<' || c === '(' || c === '[') d++
    if (c === '>' || c === ')' || c === ']') d--
    if (c === ',' && d === 0) { out.push(cur.trim()); cur = ''; continue }
    cur += c
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}
/** "Map<String, List<Integer>>" -> { base: 'Map', args: ['String', 'List<Integer>'] }; "int[]" -> base 'int[]'. */
function parseType(t: string): { base: string; args: string[]; arr: boolean } {
  t = t.trim().replace(/^&(mut\s+)?/, '').replace(/^final\s+/, '')
  const arr = /\[\]$/.test(t)
  const lt = t.indexOf('<')
  const base = lt < 0 ? t : t.slice(0, lt)
  const args = lt < 0 ? [] : splitTop(t.slice(lt + 1, t.lastIndexOf('>')))
  return { base: base.replace(/\[\]$/, ''), args, arr }
}
const KEYWORDS_JAVA = new Set('abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while var true false null record'.split(' '))
const KEYWORDS_RUST = new Set('as break const continue crate else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while async await dyn'.split(' '))

/** Everything before the caret, with strings and comments blanked out (same length), plus the stack of open `{` headers. */
function scan(text: string, caret: number) {
  const t = text.slice(0, caret)
  let out = '', i = 0, stmt = 0
  const stack: string[] = []
  let inString = false, paren = 0
  while (i < t.length) {
    const c = t[i]
    if (c === '/' && t[i + 1] === '/') { const j = t.indexOf('\n', i); const e = j < 0 ? t.length : j; out += ' '.repeat(e - i); i = e; continue }
    if (c === '/' && t[i + 1] === '*') { const j = t.indexOf('*/', i + 2); const e = j < 0 ? t.length : j + 2; out += t.slice(i, e).replace(/[^\n]/g, ' '); i = e; continue }
    if (c === '"') {
      let j = i + 1
      while (j < t.length && t[j] !== '"' && t[j] !== '\n') { if (t[j] === '\\') j++; j++ }
      if (j >= t.length) inString = true
      const e = Math.min(t.length, j + 1)
      out += '"' + ' '.repeat(Math.max(0, e - i - 2)) + (j < t.length ? '"' : ' ')
      i = e; continue
    }
    if (c === '{') { stack.push(out.slice(stmt).trim()); stmt = out.length + 1 }
    else if (c === '}') { stack.pop(); stmt = out.length + 1 }
    else if (c === '(') paren++
    else if (c === ')') paren = Math.max(0, paren - 1)
    else if (c === ';' && paren === 0) stmt = out.length + 1
    out += c; i++
  }
  return { code: out, stack, inString }
}

// ------------------------------------------------------------------ declarations: which type is `name`?
const JTYPE = String.raw`[A-Za-z_][\w.]*(?:<[^;(){}=]*>)?(?:\[\])*`
const esc = (s: string) => s.replace(/[$]/g, '\\$')

function initType(init: string, lang: Lang): string | null {
  init = init.trim()
  if (lang === 'java') {
    let m = init.match(/^new\s+([A-Za-z_][\w.]*)(<[^(]*>)?\s*(\(|\[)/)
    if (m) return m[3] === '[' ? `${m[1]}[]` : m[1]
    if (/^"/.test(init)) return 'String'
    if (/^-?\d+$/.test(init)) return 'int'
    if (/^-?\d*\.\d+/.test(init)) return 'double'
    if (/^(true|false)\b/.test(init)) return 'boolean'
    m = init.match(/^(Math|Integer|Arrays|Collections|String)\./)
    if (/^String\.(valueOf|format|join)/.test(init)) return 'String'
    return null
  }
  let m = init.match(/^(Vec|String|HashMap|HashSet|VecDeque|BinaryHeap|BTreeMap|BTreeSet)::(new|from|with_capacity)/)
  if (m) return m[1]
  if (/^vec!\[/.test(init)) return 'Vec'
  if (/^format!|^"[^"]*"\.(to_string|to_owned)\(\)/.test(init)) return 'String'
  if (/^"/.test(init)) return '&str'
  if (/^-?\d+$/.test(init)) return 'i32'
  if (/^-?\d+\.\d+/.test(init)) return 'f64'
  if (/\.collect::<Vec/.test(init)) return 'Vec'
  if (/\.collect::<String/.test(init)) return 'String'
  if (/\.(chars|iter|into_iter|bytes|lines|split_whitespace)\(\)/.test(init) && !/\.(collect|sum|count)/.test(init)) return 'Iter'
  if (/^Some\(/.test(init)) return 'Option'
  return null
}

type Decl = { name: string; type: string; at: number }
/** Variables declared before the caret, in order of appearance. */
function declarations(code: string, lang: Lang): Decl[] {
  const out: Decl[] = []
  const kw = lang === 'java' ? KEYWORDS_JAVA : KEYWORDS_RUST
  if (lang === 'java') {
    const re = new RegExp(String.raw`(?:^|[\s(,;{])(${JTYPE})\s+([A-Za-z_$][\w$]*)\s*(?=[=;,):]|$)`, 'gm')
    for (const m of code.matchAll(re)) {
      let type = m[1], name = m[2]
      if (kw.has(name) || (kw.has(type) && type !== 'var' && !/^(int|long|double|char|boolean|byte|short|float)/.test(type))) continue
      if (type === 'var' || type === 'final') {
        const rest = code.slice(m.index! + m[0].length)
        const init = rest.match(/^=\s*([^;]*)/)
        const t = init ? initType(init[1], lang) : null
        if (!t) continue
        type = t
      }
      out.push({ name, type, at: m.index! })
    }
  } else {
    const typed = /(?:let\s+(?:mut\s+)?|[(,]\s*(?:mut\s+)?)([a-z_]\w*)\s*:\s*([^,=)]+?)\s*(?=[,=)]|;|$)/gm
    for (const m of code.matchAll(typed)) out.push({ name: m[1], type: m[2].trim(), at: m.index! })
    for (const m of code.matchAll(/let\s+(?:mut\s+)?([a-z_]\w*)\s*=\s*([^;]*)/g)) {
      const t = initType(m[2], lang)
      if (t) out.push({ name: m[1], type: t, at: m.index! })
    }
    for (const m of code.matchAll(/for\s+([a-z_]\w*)\s+in\b/g)) out.push({ name: m[1], type: 'i32', at: m.index! })
    out.sort((a, b) => a.at - b.at)
  }
  return out
}
const lookup = (decls: Decl[], name: string): string | null => {
  for (let i = decls.length - 1; i >= 0; i--) if (decls[i].name === name) return decls[i].type
  return null
}

// ------------------------------------------------------------------ catalogs -> members of a type
type Member = { name: string; args: string; ret: string; field: boolean }
const parsed = new Map<string, Member[]>()
function members(table: Record<string, Group>, key: string): Member[] {
  const id = key + (table === JAVA ? ':j' : ':r')
  const hit = parsed.get(id)
  if (hit) return hit
  const g = table[key]
  const own = g && g.m ? g.m.split(';').map(parseMember) : []
  const all = g?.ext ? [...own, ...members(table, g.ext)] : own
  parsed.set(id, all)
  return all
}
function parseMember(s: string): Member {
  const colon = s.lastIndexOf(':')
  const head = colon > s.indexOf(')') && s.includes('(') ? s.slice(0, colon) : (s.includes('(') ? s : s.split(':')[0])
  const ret = colon > -1 && (!s.includes('(') || colon > s.lastIndexOf(')')) ? s.slice(colon + 1) : ''
  const field = head.startsWith('.')
  const lp = head.indexOf('(')
  return { name: field ? head.slice(1) : lp < 0 ? head : head.slice(0, lp), args: lp < 0 ? '' : head.slice(lp + 1, head.lastIndexOf(')')), ret, field: field || lp < 0 }
}
const staticMembers = (name: string): Member[] => (JAVA_STATIC[name] ? JAVA_STATIC[name].split(';').map(parseMember) : [])

function groupKey(type: string, lang: Lang): { key: string; args: string[] } | null {
  const t = parseType(type)
  if (lang === 'java') {
    if (t.arr) return { key: 'array', args: [] }
    const key = JAVA_ALIAS[t.base]
    return key ? { key, args: t.args } : null
  }
  const key = RUST_ALIAS[t.base]
  return key ? { key, args: t.args } : null
}
/** Fill K / V / E / T in a member's return type with the real type arguments. */
function subst(ret: string, key: string, args: string[], table: Record<string, Group>): string {
  const p = table[key]?.p
  if (!p || !args.length) return ret.replace(/\b[KVET]\b/g, '')
  return ret.replace(/\b[KVET]\b/g, (m) => args[p.indexOf(m)] ?? '')
}

// ------------------------------------------------------------------ receiver expression -> type
function receiverBefore(code: string, dot: number): string {
  let i = dot - 1
  while (i >= 0 && code[i] === ' ') i--
  const end = i + 1
  for (;;) {
    if (i < 0) break
    const c = code[i]
    if (c === ')' || c === ']') {
      let d = 0
      for (; i >= 0; i--) { if (code[i] === ')' || code[i] === ']') d++; else if (code[i] === '(' || code[i] === '[') { d--; if (d === 0) break } }
      i--
      continue
    }
    if (c === '"') { i--; while (i >= 0 && code[i] !== '"') i--; i--; continue }
    if (/[\w$]/.test(c)) { i--; continue }
    if (c === '.') { i--; continue }
    if (c === ':' && code[i - 1] === ':') { i -= 2; continue }
    if (c === '!' && code[i - 1] !== '=') { i--; continue }
    break
  }
  return code.slice(i + 1, end).trim()
}

function typeOfExpr(expr: string, decls: Decl[], lang: Lang, depth = 0): string | null {
  expr = expr.trim()
  if (!expr || depth > 6) return null
  if (/^"/.test(expr)) return lang === 'java' ? 'String' : '&str'
  if (/^-?\d+$/.test(expr)) return lang === 'java' ? 'int' : 'i32'
  if (expr.startsWith('(') && expr.endsWith(')')) return null
  if (/^[A-Za-z_$][\w$]*$/.test(expr)) return lookup(decls, expr)
  // chain: base.member or base.member(args)
  let d = 0, cut = -1
  for (let i = expr.length - 1; i >= 0; i--) {
    const c = expr[i]
    if (c === ')' || c === ']') d++
    else if (c === '(' || c === '[') d--
    else if (c === '.' && d === 0) { cut = i; break }
  }
  if (cut < 0) { const m = expr.match(/^([A-Za-z_$][\w$]*)\s*[([]/); return m && lang === 'java' ? null : null }
  const base = expr.slice(0, cut), mem = expr.slice(cut + 1)
  const name = (mem.match(/^[\w$]+/) || [''])[0]
  const bt = typeOfExpr(base, decls, lang, depth + 1)
  if (lang === 'java' && !bt && /^[A-Z]/.test(base) && JAVA_STATIC[base]) {   // static call: Integer.parseInt(..) -> int, String.valueOf(..) -> String
    const m = staticMembers(base).find((x) => x.name === name)
    return m?.ret || null
  }
  if (!bt) return null
  const gk = groupKey(bt, lang)
  if (!gk) return null
  const table = lang === 'java' ? JAVA : RUST
  const m = members(table, gk.key).find((x) => x.name === name)
  if (!m || !m.ret) return null
  const r = subst(m.ret, gk.key, gk.args, table).trim()
  return r || null
}

// ------------------------------------------------------------------ word catalogs
type Snip = { label: string; body: string; kind: Kind; aliases?: string[]; detail?: string }
const sn = (label: string, body: string, kind: Kind = 'keyword', aliases?: string[], detail?: string): Snip => ({ label, body, kind, aliases, detail })

const J_STATEMENTS: Snip[] = [
  sn('for', 'for (int i = 0; i < ‸; i++) {\n    \n}', 'snippet', ['fori'], 'loop'),
  sn('if', 'if (‸) {\n    \n}', 'snippet', [], 'condition'),
  sn('int', 'int ', 'type'), sn('String', 'String ', 'type'),
  sn('while', 'while (‸) {\n    \n}', 'snippet', [], 'loop'),
  sn('return', 'return ', 'keyword'),
  sn('System.out.println', 'System.out.println(‸);', 'snippet', ['sout', 'println', 'print'], 'print line'),
  sn('else', 'else {\n    ‸\n}', 'snippet'), sn('else if', 'else if (‸) {\n    \n}', 'snippet'),
  sn('boolean', 'boolean ', 'type'), sn('long', 'long ', 'type'), sn('double', 'double ', 'type'), sn('char', 'char ', 'type'),
  sn('int[]', 'int[] ', 'type'), sn('new', 'new ', 'keyword'),
  sn('break', 'break;', 'keyword'), sn('continue', 'continue;', 'keyword'),
  sn('switch', 'switch (‸) {\n    case : \n        break;\n    default:\n        break;\n}', 'snippet'),
  sn('try', 'try {\n    ‸\n} catch (Exception e) {\n    e.printStackTrace();\n}', 'snippet', ['trycatch']),
  sn('do', 'do {\n    ‸\n} while ();', 'snippet'),
  sn('public static void main', 'public static void main(String[] args) {\n    ‸\n}', 'snippet', ['psvm', 'main']),
  sn('public', 'public ', 'keyword'), sn('private', 'private ', 'keyword'), sn('static', 'static ', 'keyword'), sn('final', 'final ', 'keyword'),
  sn('void', 'void ', 'type'), sn('class', 'class ‸ {\n    \n}', 'snippet'), sn('var', 'var ', 'keyword'),
  sn('null', 'null', 'keyword'), sn('true', 'true', 'keyword'), sn('false', 'false', 'keyword'), sn('this', 'this.', 'keyword'),
  sn('throw new', 'throw new ‸;', 'snippet'), sn('import java.util.*;', 'import java.util.*;', 'snippet', ['import']),
  sn('System.out.printf', 'System.out.printf("‸%n");', 'snippet', ['printf', 'souf']),
]
const R_STATEMENTS: Snip[] = [
  sn('let', 'let ', 'keyword'), sn('let mut', 'let mut ', 'keyword'),
  sn('for', 'for ‸ in  {\n    \n}', 'snippet', [], 'loop'), sn('if', 'if ‸ {\n    \n}', 'snippet'),
  sn('println!', 'println!("{}", ‸);', 'snippet', ['println', 'print'], 'print line'),
  sn('match', 'match ‸ {\n    _ => {}\n}', 'snippet'), sn('return', 'return ', 'keyword'),
  sn('while', 'while ‸ {\n    \n}', 'snippet'), sn('loop', 'loop {\n    ‸\n}', 'snippet'), sn('else', 'else {\n    ‸\n}', 'snippet'),
  sn('break', 'break;', 'keyword'), sn('continue', 'continue;', 'keyword'),
  sn('fn', 'fn ‸() {\n    \n}', 'snippet'), sn('struct', 'struct ‸ {\n    \n}', 'snippet'), sn('impl', 'impl ‸ {\n    \n}', 'snippet'),
  sn('enum', 'enum ‸ {\n    \n}', 'snippet'), sn('use', 'use std::collections::‸;', 'snippet'), sn('pub', 'pub ', 'keyword'), sn('mut', 'mut ', 'keyword'),
  sn('vec!', 'vec![‸]', 'snippet', ['vec']), sn('Some', 'Some(‸)', 'snippet'), sn('None', 'None', 'keyword'), sn('Ok', 'Ok(‸)', 'snippet'), sn('Err', 'Err(‸)', 'snippet'),
  sn('else if', 'else if ‸ {\n    \n}', 'snippet'), sn('if let', 'if let Some(‸) =  {\n    \n}', 'snippet'), sn('while let', 'while let Some(‸) =  {\n    \n}', 'snippet'),
  sn('self', 'self', 'keyword'), sn('true', 'true', 'keyword'), sn('false', 'false', 'keyword'), sn('as', 'as ', 'keyword'),
  sn('#[derive(Debug)]', '#[derive(Debug)]', 'snippet', ['derive']),
]

type TypeSnip = { name: string; impl: string; decl: string; vname: string; names: string[]; inits: string[] }
const J_TYPES: TypeSnip[] = [
  { name: 'List', impl: 'ArrayList', decl: 'List<Integer> list = new ArrayList<>();', vname: 'list', names: ['list', 'result', 'res', 'ans'], inits: ['new ArrayList<>()', 'new LinkedList<>()', 'List.of()', 'Arrays.asList()'] },
  { name: 'Map', impl: 'HashMap', decl: 'Map<String, Integer> map = new HashMap<>();', vname: 'map', names: ['map', 'counts', 'freq', 'seen'], inits: ['new HashMap<>()', 'new TreeMap<>()', 'new LinkedHashMap<>()', 'Map.of()'] },
  { name: 'Set', impl: 'HashSet', decl: 'Set<Integer> set = new HashSet<>();', vname: 'set', names: ['set', 'seen', 'visited'], inits: ['new HashSet<>()', 'new TreeSet<>()', 'new LinkedHashSet<>()', 'Set.of()'] },
  { name: 'Queue', impl: 'LinkedList', decl: 'Queue<Integer> queue = new LinkedList<>();', vname: 'queue', names: ['queue', 'q'], inits: ['new LinkedList<>()', 'new ArrayDeque<>()', 'new PriorityQueue<>()'] },
  { name: 'Deque', impl: 'ArrayDeque', decl: 'Deque<Integer> deque = new ArrayDeque<>();', vname: 'deque', names: ['deque', 'dq', 'stack'], inits: ['new ArrayDeque<>()', 'new LinkedList<>()'] },
  { name: 'Stack', impl: 'Stack', decl: 'Stack<Integer> stack = new Stack<>();', vname: 'stack', names: ['stack', 'st'], inits: ['new Stack<>()'] },
  { name: 'PriorityQueue', impl: 'PriorityQueue', decl: 'PriorityQueue<Integer> pq = new PriorityQueue<>();', vname: 'pq', names: ['pq', 'heap', 'minHeap'], inits: ['new PriorityQueue<>()', 'new PriorityQueue<>(Collections.reverseOrder())', 'new PriorityQueue<>((a, b) -> a - b)'] },
  { name: 'StringBuilder', impl: 'StringBuilder', decl: 'StringBuilder sb = new StringBuilder();', vname: 'sb', names: ['sb', 'builder'], inits: ['new StringBuilder()'] },
  { name: 'ArrayList', impl: 'ArrayList', decl: 'ArrayList<Integer> list = new ArrayList<>();', vname: 'list', names: ['list', 'result'], inits: ['new ArrayList<>()'] },
  { name: 'HashMap', impl: 'HashMap', decl: 'HashMap<String, Integer> map = new HashMap<>();', vname: 'map', names: ['map', 'counts', 'freq'], inits: ['new HashMap<>()'] },
  { name: 'HashSet', impl: 'HashSet', decl: 'HashSet<Integer> set = new HashSet<>();', vname: 'set', names: ['set', 'seen'], inits: ['new HashSet<>()'] },
  { name: 'LinkedList', impl: 'LinkedList', decl: 'LinkedList<Integer> list = new LinkedList<>();', vname: 'list', names: ['list'], inits: ['new LinkedList<>()'] },
  { name: 'TreeMap', impl: 'TreeMap', decl: 'TreeMap<Integer, Integer> map = new TreeMap<>();', vname: 'map', names: ['map'], inits: ['new TreeMap<>()'] },
  { name: 'TreeSet', impl: 'TreeSet', decl: 'TreeSet<Integer> set = new TreeSet<>();', vname: 'set', names: ['set'], inits: ['new TreeSet<>()'] },
  { name: 'ArrayDeque', impl: 'ArrayDeque', decl: 'ArrayDeque<Integer> dq = new ArrayDeque<>();', vname: 'dq', names: ['dq', 'stack'], inits: ['new ArrayDeque<>()'] },
  { name: 'Scanner', impl: 'Scanner', decl: 'Scanner sc = new Scanner(System.in);', vname: 'sc', names: ['sc', 'scanner'], inits: ['new Scanner(System.in)'] },
]
const R_TYPES: TypeSnip[] = [
  { name: 'Vec', impl: 'Vec', decl: 'let mut v: Vec<i32> = Vec::new();', vname: 'v', names: ['v', 'result', 'res'], inits: ['Vec::new()', 'vec![]', 'Vec::with_capacity(‸)'] },
  { name: 'HashMap', impl: 'HashMap', decl: 'let mut map: HashMap<String, i32> = HashMap::new();', vname: 'map', names: ['map', 'counts', 'seen'], inits: ['HashMap::new()'] },
  { name: 'HashSet', impl: 'HashSet', decl: 'let mut set: HashSet<i32> = HashSet::new();', vname: 'set', names: ['set', 'seen'], inits: ['HashSet::new()'] },
  { name: 'VecDeque', impl: 'VecDeque', decl: 'let mut queue: VecDeque<i32> = VecDeque::new();', vname: 'queue', names: ['queue', 'q'], inits: ['VecDeque::new()'] },
  { name: 'BinaryHeap', impl: 'BinaryHeap', decl: 'let mut heap: BinaryHeap<i32> = BinaryHeap::new();', vname: 'heap', names: ['heap'], inits: ['BinaryHeap::new()'] },
  { name: 'String', impl: 'String', decl: 'let mut s = String::new();', vname: 's', names: ['s', 'result'], inits: ['String::new()', 'String::from("‸")'] },
  { name: 'BTreeMap', impl: 'BTreeMap', decl: 'let mut map: BTreeMap<i32, i32> = BTreeMap::new();', vname: 'map', names: ['map'], inits: ['BTreeMap::new()'] },
]

const PRIMS_J: Record<string, { names: string[]; inits: string[] }> = {
  int: { names: ['i', 'n', 'count', 'sum', 'max', 'result', 'left', 'right'], inits: ['0', 'Integer.MAX_VALUE', 'Integer.MIN_VALUE', 'Integer.parseInt(‸)', '-1', '1'] },
  long: { names: ['sum', 'total', 'result'], inits: ['0L', 'Long.MAX_VALUE', 'Long.MIN_VALUE'] },
  double: { names: ['avg', 'result', 'sum'], inits: ['0.0', 'Double.MAX_VALUE', 'Math.sqrt(‸)'] },
  boolean: { names: ['found', 'isValid', 'ok', 'flag'], inits: ['false', 'true'] },
  char: { names: ['c', 'ch'], inits: ["'a'", "'0'", 's.charAt(‸)'] },
  String: { names: ['s', 'str', 'result', 'word'], inits: ['""', 'String.valueOf(‸)', 'new String()', 'sc.nextLine()'] },
  'int[]': { names: ['arr', 'nums', 'dp', 'count'], inits: ['new int[‸]', '{‸}', 'new int[]{‸}', 'nums.clone()'] },
  'int[][]': { names: ['grid', 'dp', 'matrix'], inits: ['new int[‸][]', 'new int[][]{{‸}}'] },
  'String[]': { names: ['parts', 'words', 'strs'], inits: ['new String[‸]', 's.split(" ")'] },
  'char[]': { names: ['chars', 'arr'], inits: ['s.toCharArray()', 'new char[‸]'] },
  'boolean[]': { names: ['visited', 'seen'], inits: ['new boolean[‸]'] },
}

// ------------------------------------------------------------------ ranking helpers
const lc = (s: string) => s.toLowerCase()
/** 0 = no match; higher is better: exact > prefix > word start > contains > subsequence. */
function matchScore(prefix: string, label: string, aliases: string[] = []): number {
  if (!prefix) return 1
  const p = lc(prefix)
  let best = 0
  for (const c of [label, ...aliases]) {
    const l = lc(c)
    const s = l === p ? 100 : l.startsWith(p) ? 80 : new RegExp(`[._ (]${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(l) ? 55 : l.includes(p) ? (prefix.length >= 2 ? 40 : 0) : prefix.length >= 2 && subseq(p, l) ? 20 : 0
    best = Math.max(best, s)
  }
  return best
}
const subseq = (p: string, l: string) => { let i = 0; for (const c of l) if (c === p[i]) i++; return i === p.length }

// ------------------------------------------------------------------ the engine
export function suggest(text: string, caret: number, lang: Lang, limit = 24): Result {
  const { code, stack, inString } = scan(text, caret)
  const lineStart = code.lastIndexOf('\n') + 1
  const before = code.slice(lineStart)            // strings blanked
  const rawBefore = text.slice(text.lastIndexOf('\n', caret - 1) + 1, caret)
  const decls = declarations(code, lang)
  const kw = lang === 'java' ? KEYWORDS_JAVA : KEYWORDS_RUST
  const none: Result = { items: [], ctx: 'none', first: [], last: [] }
  const order = symbolOrder(before, inString, lang, stack)

  if (inString) return { ...none, first: order.first, last: order.last }
  if (/^\s*(\/\/|\*|\/\*)/.test(rawBefore)) return none     // inside a comment line

  // ---- member: receiver.prefix
  const dm = before.match(/\.\s*([\w$]*)$/)
  if (dm && !/\.\.\s*[\w$]*$/.test(before) && !/\d\.\s*\d*$/.test(before)) {
    const dot = before.length - dm[0].length + before.slice(before.length - dm[0].length).indexOf('.')
    const recv = receiverBefore(before, dot)
    const prefix = dm[1]
    const items: { s: Sug; score: number }[] = []
    const push = (ms: Member[], statics: boolean) => ms.forEach((m, idx) => {
      const sc = matchScore(prefix, m.name)
      if (!sc) return
      const label = m.name
      const body = m.field ? m.name : `${m.name}(${MARK})`.replace(`(${MARK})`, m.args ? `(${MARK})` : '()')
      const kind: Kind = m.field ? 'field' : 'method'
      const detail = m.field ? m.ret : `${m.args ? `(${m.args})` : '()'}${m.ret ? ` → ${m.ret}` : ''}`
      items.push({ s: mk(label, body, kind, detail, prefix.length), score: sc * 2 - idx * 0.6 + boost(label) / 3 + (statics ? 0 : 0) })
    })
    if (lang === 'java' && /^[A-Z][\w]*(\.[a-z]\w*)?$/.test(recv) && (JAVA_STATIC[recv]) && !lookup(decls, recv)) {
      push(staticMembers(recv), true)
    } else {
      const t = typeOfExpr(recv, decls, lang)
      const gk = t ? groupKey(t, lang) : null
      if (gk) push(members(lang === 'java' ? JAVA : RUST, gk.key), false)
      else if (lang === 'java' && recv && !/^[A-Z]/.test(recv)) push(members(JAVA, 'Object'), false)
    }
    items.sort((a, b) => b.score - a.score)
    return { items: items.slice(0, limit).map((x) => x.s), ctx: items.length ? 'member' : 'none', first: [], last: [] }
  }

  // ---- init: Type name = prefix
  const declRe = lang === 'java'
    ? new RegExp(String.raw`^\s*(?:final\s+)?(${JTYPE})\s+([A-Za-z_$][\w$]*)\s*=\s*([\w$.]*)$`)
    : /^\s*let\s+(?:mut\s+)?([a-z_]\w*)\s*(?::\s*([^=]+?))?\s*=\s*([\w$.:!]*)$/
  const im = before.match(declRe)
  if (im) {
    const type = lang === 'java' ? im[1].trim() : (im[2] || '').trim()
    const prefix = im[3] || ''
    const inits = initsFor(type, lang)
    const items = inits
      .map((body, idx) => ({ body, idx, score: matchScore(prefix, body.replace(MARK, '')) }))
      .filter((x) => !prefix || x.score > 0)
      .sort((a, b) => b.score - a.score || a.idx - b.idx)
      .map((x) => mk(x.body.replace(MARK, ''), x.body, x.body.startsWith('new ') || x.body.includes('::') ? 'snippet' : 'keyword', undefined, prefix.length))
    if (items.length) return { items: items.slice(0, limit), ctx: 'init', first: order.first, last: order.last }
  }

  // ---- name: a type was just typed and a space follows
  const nm = lang === 'java' ? before.match(new RegExp(String.raw`^\s*(?:final\s+)?(${JTYPE})\s+$`)) : null
  if (nm) {
    const type = nm[1].trim()
    const base = parseType(type).base
    const isType = !kw.has(base) || /^(int|long|double|char|boolean|byte|short|float|var)$/.test(base)
    if (isType && /^[A-Za-z_]/.test(type)) {
      const used = new Set(decls.map((d) => d.name))
      const cand = namesFor(type, lang)
      const items: Sug[] = []
      for (const n of cand) if (!used.has(n)) items.push(mk(n, n, 'var', 'name', 0))
      const ts = J_TYPES.find((t) => t.name === base)
      if (ts) { const nm0 = cand.find((n) => !used.has(n)) || ts.vname; items.unshift(mk(`${nm0} = new ${ts.impl}<>();`, `${nm0} = new ${ts.impl}<>();`, 'snippet', 'declare', 0)) }
      else if (base === 'StringBuilder') items.unshift(mk('sb = new StringBuilder();', 'sb = new StringBuilder();', 'snippet', 'declare', 0))
      else if (type === 'int[]' || type === 'char[]' || type === 'boolean[]' || type === 'String[]') items.unshift(mk(`${cand[0]} = new ${type.slice(0, -2)}[‸];`.replace(MARK, ''), `${cand[0]} = new ${type.slice(0, -2)}[${MARK}];`, 'snippet', 'declare', 0))
      if (items.length) return { items: items.slice(0, limit), ctx: 'name', first: [], last: ['; '] }
    }
  }

  // ---- word / idle
  const wm = before.match(/([A-Za-z_$][\w$]*!?)$/)
  const prefix = wm ? wm[1] : ''
  const lineIsJustPrefix = /^\s*$/.test(before.slice(0, before.length - prefix.length))
  const depth = stack.length
  const inLoop = stack.some((h) => (lang === 'java' ? /\b(for|while|do)\b/ : /\b(for|while|loop)\b/).test(h))
  const inSwitch = stack.some((h) => /\b(switch|match)\b/.test(h))
  const names = new Set(decls.map((d) => d.name))

  // mid-line with nothing typed: after an operator / return offer values (your variables first); otherwise only symbols help
  if (!prefix && !lineIsJustPrefix) {
    if (!/(return|=|\(|,|\+|-|\*|\/|%|<|>|&&|\|\||!|\?|:)\s*$/.test(before) || /(\+\+|--)\s*$/.test(before)) return { items: [], ctx: 'none', first: order.first, last: order.last }
    const vs: Sug[] = []
    const seenV = new Set<string>()
    for (let i = decls.length - 1; i >= 0 && vs.length < 8; i--) {
      const d = decls[i]
      if (seenV.has(d.name)) continue
      seenV.add(d.name)
      vs.push(mk(d.name, d.name, 'var', d.type, 0))
    }
    for (const lit of lang === 'java' ? ['0', 'null', 'true', 'false', '""'] : ['0', 'None', 'true', 'false', '""']) vs.push(mk(lit, lit, 'keyword', undefined, 0))
    return { items: vs.slice(0, limit), ctx: 'word', first: order.first, last: order.last }
  }

  const cands: { s: Sug; score: number }[] = []
  const add = (label: string, body: string, kind: Kind, detail: string | undefined, base: number, aliases?: string[]) => {
    const ms = matchScore(prefix, label, aliases)
    if (!ms) return
    cands.push({ s: mk(label, body, kind, detail, prefix.length), score: (prefix ? ms * 3 : 0) + base + boost(label) })
  }
  const stmts = lang === 'java' ? J_STATEMENTS : R_STATEMENTS

  // smart loops from the nearest declared array / collection
  for (const l of loopSnippets(decls, names, lang)) {
    const ms = matchScore(prefix, 'for', ['fori', 'foreach', 'iter'])   // only typing "for..." asks for a loop, not any word inside its label
    if (ms) cands.push({ s: mk(l.label, l.body, 'snippet', l.detail, prefix.length), score: (prefix ? ms * 3 : 0) + 300 + boost(l.label) })
  }

  stmts.forEach((s, idx) => {
    // inside a class body (not a method) only declarations make sense; at top level only imports/classes
    const top = lang === 'java' && depth === 0 && !/^(import|public|class|final|abstract|interface|enum|\/\/)/.test(s.label) && !/^(import)/.test(s.label)
    const member = lang === 'java' && depth === 1 && /^(for|while|if|else|return|break|continue|do|switch|try|System\.out|throw)/.test(s.label)
    if (top || member) return
    let base = 200 - idx * 3
    if ((s.label === 'break' || s.label === 'continue') && !inLoop && !inSwitch) base -= 150
    if ((s.label === 'break' || s.label === 'continue') && inLoop) base = s.label === 'break' ? 186 : 183
    if (s.label === 'break' && inSwitch) base += 20
    if (!lineIsJustPrefix && s.kind === 'snippet' && /^(for|if|while|else|switch|try|do|let|loop|match|fn|struct|impl|enum|use)/.test(s.label)) base -= 120
    add(s.label, s.body, s.kind, s.detail, base, s.aliases)
  })

  // collections: typing "Map" offers the whole declaration
  const types = lang === 'java' ? J_TYPES : R_TYPES
  types.forEach((t, idx) => {
    if (!prefix) return
    const ms = matchScore(prefix, t.name)
    if (!ms) return
    if (lineIsJustPrefix && lang === 'java') {
      const name = t.names.find((n) => !names.has(n)) || t.vname
      const body = t.decl.replace(` ${t.vname} = `, ` ${name} = `)
      cands.push({ s: mk(body.replace(MARK, ''), body, 'snippet', 'declare', prefix.length), score: ms * 3 + (prefix.length >= 2 ? 260 : 120) - idx * 2 + boost(t.decl) })
    } else if (lineIsJustPrefix) {
      cands.push({ s: mk(t.name, `${t.name}<${MARK}>`, 'type', undefined, prefix.length), score: ms * 3 + 200 - idx * 2 + boost(t.name) })
    }
    if (lang === 'java') cands.push({ s: mk(`${t.name}<>`, `${t.name}<${MARK}>`, 'type', undefined, prefix.length), score: ms * 3 + 150 - idx * 2 + boost(`${t.name}<>`) })
  })

  // variables of this file, recent first
  if (prefix) {
    const seen = new Set<string>()
    for (let i = decls.length - 1; i >= 0; i--) {
      const d = decls[i]
      if (seen.has(d.name)) continue
      seen.add(d.name)
      if (d.name === prefix) continue
      add(d.name, d.name, 'var', d.type, 180 - (decls.length - 1 - i) * 2)
    }
    // other identifiers used often in the file (methods, classes, fields)
    const freq = new Map<string, number>()
    for (const m of code.matchAll(/[A-Za-z_$][\w$]{2,}/g)) if (!kw.has(m[0])) freq.set(m[0], (freq.get(m[0]) || 0) + 1)
    for (const [w, c] of freq) if (!seen.has(w) && w !== prefix && c >= 2 && !stmts.some((s) => s.label === w) && !types.some((t) => t.name === w)) add(w, w, 'var', 'in file', 60 + Math.min(c, 10))
  }

  // idle: nothing typed
  if (!prefix) {
    if (depth === 0) {
      const top = lang === 'java' ? ['import java.util.*;', 'public class Main', 'class Solution'] : ['use std::collections::*;', 'fn main', 'struct', 'impl']
      top.forEach((l, i) => {
        const s = stmts.find((x) => x.label === l)
        cands.push({ s: s ? mk(s.label, s.body, s.kind, s.detail, 0) : mk(l, l === 'public class Main' ? 'public class Main {\n    ‸\n}' : l === 'class Solution' ? 'class Solution {\n    ‸\n}' : l === 'fn main' ? 'fn main() {\n    ‸\n}' : l, 'snippet', undefined, 0), score: 300 - i })
      })
    }
    const prevLine = (() => { const lines = code.slice(0, lineStart).split('\n'); for (let i = lines.length - 1; i >= 0; i--) if (lines[i].trim()) return lines[i].trim(); return '' })()
    if (prevLine.startsWith('}') && depth > 0) {
      // after a closed if/try block: else / catch come first
      const header = closedHeader(code, lineStart)
      if (/\b(if)\b/.test(header)) { add('else', 'else {\n    ‸\n}', 'snippet', undefined, 500); add('else if', lang === 'java' ? 'else if (‸) {\n    \n}' : 'else if ‸ {\n    \n}', 'snippet', undefined, 490) }
      if (/\btry\b/.test(header)) add('catch', 'catch (Exception e) {\n    ‸\n}', 'snippet', undefined, 500)
    }
    if (depth >= 2 && lang === 'java') add('return', 'return ', 'keyword', undefined, /\b(int|String|boolean|long|double|List|int\[\])\b[^;=]*\([^)]*\)\s*$/.test(stack[1] ?? stack[0] ?? '') ? 330 : 0)
    if (inSwitch) { add('case', 'case ‸:\n    break;', 'snippet', undefined, 450); add('default', 'default:\n    ‸', 'snippet', undefined, 440) }
    if (depth > 0 && openBraces(code) > 0 && lineIsJustPrefix) cands.push({ s: mk('}', '}', 'keyword', 'close block', 0), score: 120 })
  }

  cands.sort((a, b) => b.score - a.score)
  const out: Sug[] = []
  const seenLabel = new Set<string>()
  for (const c of cands) {
    const key = c.s.label + '|' + c.s.insert
    if (seenLabel.has(key)) continue
    seenLabel.add(key)
    out.push(c.s)
    if (out.length >= limit) break
  }
  return { items: out, ctx: prefix ? 'word' : 'idle', first: order.first, last: order.last }
}

const openBraces = (code: string) => { let d = 0; for (const c of code) { if (c === '{') d++; else if (c === '}') d-- } return d }
/** Header text of the block that was just closed by the `}` on the previous line. */
function closedHeader(code: string, lineStart: number): string {
  const upto = code.slice(0, lineStart)
  const close = upto.lastIndexOf('}')
  if (close < 0) return ''
  let d = 0
  for (let i = close; i >= 0; i--) {
    if (upto[i] === '}') d++
    else if (upto[i] === '{' && --d === 0) {
      const s = Math.max(upto.lastIndexOf(';', i), upto.lastIndexOf('{', i - 1), upto.lastIndexOf('}', i - 1)) + 1
      return upto.slice(s, i).trim()
    }
  }
  return ''
}

function initsFor(type: string, lang: Lang): string[] {
  const t = parseType(type)
  const full = type.trim().replace(/^&(mut\s+)?/, '')
  if (lang === 'java') {
    if (PRIMS_J[full]) return PRIMS_J[full].inits
    const ts = J_TYPES.find((x) => x.name === t.base)
    if (ts) {
      // the concrete class on the left wants the same class on the right
      return ts.inits.map((s) => s.replace(/new (\w+)<>/, (_m, c) => (t.base === ts.name && J_TYPES.some((x) => x.impl === t.base && x.name === t.base) ? `new ${t.base}<>` : `new ${c}<>`)))
    }
    if (t.base === 'ListNode' || t.base === 'TreeNode') return [`new ${t.base}(‸)`, 'null']
    if (/^[A-Z]/.test(t.base)) return [`new ${t.base}(‸)`, 'null']
    return []
  }
  const r = R_TYPES.find((x) => x.name === t.base)
  if (r) return r.inits
  if (t.base === 'i32' || t.base === 'i64' || t.base === 'usize' || t.base === 'u32') return ['0', '1', `${t.base}::MAX`, `${t.base}::MIN`]
  if (t.base === 'bool') return ['false', 'true']
  if (t.base === 'Option') return ['None', 'Some(‸)']
  if (t.base === 'f64') return ['0.0']
  return []
}
function namesFor(type: string, lang: Lang): string[] {
  const t = parseType(type)
  const full = type.trim()
  if (lang !== 'java') return []
  if (PRIMS_J[full]) return PRIMS_J[full].names
  const ts = J_TYPES.find((x) => x.name === t.base)
  if (ts) return ts.names
  if (t.base === 'ListNode' || t.base === 'TreeNode') return ['head', 'node', 'root', 'cur', 'dummy', 'prev']
  if (/^[A-Z]/.test(t.base)) return [t.base[0].toLowerCase() + t.base.slice(1), 'obj']
  return []
}

/** for-loops written for the array / collection you declared last. */
function loopSnippets(decls: Decl[], names: Set<string>, lang: Lang): { label: string; body: string; detail: string }[] {
  const pick = (c: string[]) => c.find((x) => !names.has(x)) || c[0] + '2'
  const i = pick(['i', 'j', 'k'])
  for (let n = decls.length - 1; n >= 0; n--) {
    const d = decls[n]
    const t = parseType(d.type)
    const gk = groupKey(d.type, lang)
    if (lang === 'java') {
      if (t.arr) {
        const el = t.base
        return [
          { label: `for (${i} < ${d.name}.length)`, body: `for (int ${i} = 0; ${i} < ${d.name}.length; ${i}++) {\n    ‸\n}`, detail: 'loop' },
          { label: `for (${el} x : ${d.name})`, body: `for (${el} x : ${d.name}) {\n    ‸\n}`, detail: 'for-each' },
        ]
      }
      if (gk?.key === 'List' || gk?.key === 'LinkedList') {
        const el = t.args[0] || 'var'
        return [
          { label: `for (${i} < ${d.name}.size())`, body: `for (int ${i} = 0; ${i} < ${d.name}.size(); ${i}++) {\n    ‸\n}`, detail: 'loop' },
          { label: `for (${el} x : ${d.name})`, body: `for (${el} x : ${d.name}) {\n    ‸\n}`, detail: 'for-each' },
        ]
      }
      if (gk?.key === 'Set' || gk?.key === 'TreeSet') return [{ label: `for (${t.args[0] || 'var'} x : ${d.name})`, body: `for (${t.args[0] || 'var'} x : ${d.name}) {\n    ‸\n}`, detail: 'for-each' }]
      if (gk?.key === 'Map' || gk?.key === 'TreeMap') return [{ label: `for (entry : ${d.name})`, body: `for (Map.Entry<${t.args.join(', ') || 'K, V'}> e : ${d.name}.entrySet()) {\n    ‸\n}`, detail: 'for-each' }]
      if (gk?.key === 'String' && d.type === 'String') return [
        { label: `for (${i} < ${d.name}.length())`, body: `for (int ${i} = 0; ${i} < ${d.name}.length(); ${i}++) {\n    char c = ${d.name}.charAt(${i});\n    ‸\n}`, detail: 'loop' },
        { label: `for (char c : ${d.name})`, body: `for (char c : ${d.name}.toCharArray()) {\n    ‸\n}`, detail: 'for-each' },
      ]
    } else if (gk?.key === 'Vec') {
      return [
        { label: `for x in &${d.name}`, body: `for x in &${d.name} {\n    ‸\n}`, detail: 'loop' },
        { label: `for i in 0..${d.name}.len()`, body: `for i in 0..${d.name}.len() {\n    ‸\n}`, detail: 'loop' },
        { label: `for (i, x) in ${d.name}.iter().enumerate()`, body: `for (i, x) in ${d.name}.iter().enumerate() {\n    ‸\n}`, detail: 'loop' },
      ]
    }
  }
  return []
}

// ------------------------------------------------------------------ symbols: which to show first / last for this spot (labels are the inserted text)
export function symbolOrder(before: string, inString: boolean, lang: Lang, stack: string[]): { first: string[]; last: string[] } {
  const t = before.trimEnd()
  if (inString) return { first: ['\\n', '%d', '%s', '"'], last: [';'] }
  if (t === '') return { first: ['{}', '()', '//'], last: [';'] }                          // an empty line never wants ";"
  const header = lang === 'java' ? /^\s*(\}\s*)?(else\s+)?(if|while|for|switch|catch)\s*$/ : /^\s*(\}\s*)?(else\s+)?(if|while|for|match)\s*$/
  if (header.test(t)) return lang === 'java' ? { first: ['()', '{}'], last: [';'] } : { first: ['{}', '..', '&'], last: [';'] }
  if (/\b(if|while|for|switch|catch)\s*\(.*\)\s*$/.test(t) && lang === 'java' && balanced(t)) return { first: ['{}', '&&', '||'], last: [';'] }
  if (/[{]\s*$/.test(t)) return { first: ['//'], last: [';'] }
  if (/[;}]\s*$/.test(t)) return { first: ['{}', '()', '//'], last: [';'] }
  if (/(=|\+|-|\*|\/|%|&&|\|\||<|>|!|\?|:|\(|,|return)\s*$/.test(t)) return { first: ['()', '""', "'", '[]'], last: [';'] }
  if (!balanced(t)) return { first: [')', ',', '.', '()'], last: [';'] }
  if (/\b(class|interface|enum)\s+\w+$/.test(t) && lang === 'java') return { first: ['{}'], last: [';'] }
  if (/^\s*(public|private|static|void|int|String|boolean|long|double)\b[^=;]*\)\s*$/.test(t) && lang === 'java') return { first: ['{}', ';'], last: [] }
  if (/[\w)\]"'+]$/.test(t) && !/\b(else|do|try|finally)$/.test(t)) {
    if (/\b(else|do|try|finally)$/.test(t)) return { first: ['{}'], last: [';'] }
    if (lang === 'rust') return { first: [';', '.', '()', '?', '::'], last: [] }
    return { first: [';', '.', '()', '=', '[]', ','], last: [] }
  }
  return { first: ['()', '{}'], last: [] }
}
const balanced = (s: string) => { let d = 0; for (const c of s) { if (c === '(' || c === '[') d++; else if (c === ')' || c === ']') d-- } return d === 0 }
