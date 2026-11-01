// Compiles every solution and runs its C: check. Usage: node scripts/verify-problems.mjs [file.txt ...]
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { loadProblems, parseProblems } from './problems.mjs'

const files = process.argv.slice(2)
const probs = files.length ? files.flatMap((f) => parseProblems(fs.readFileSync(f, 'utf8'))) : loadProblems()
const head = `import java.util.*;
import java.util.stream.*;
public class V {
  static ListNode L(int... a){ ListNode d=new ListNode(0),t=d; for(int x:a){t.next=new ListNode(x);t=t.next;} return d.next; }
  static String LS(ListNode n){ StringBuilder s=new StringBuilder("["); for(;n!=null;n=n.next){ if(s.length()>1)s.append(","); s.append(n.val);} return s.append("]").toString(); }
  static TreeNode T(Integer... a){ if(a.length==0||a[0]==null) return null; TreeNode r=new TreeNode(a[0]); Deque<TreeNode> q=new ArrayDeque<>(); q.add(r); int i=1;
    while(!q.isEmpty()&&i<a.length){ TreeNode n=q.poll(); if(i<a.length&&a[i]!=null){n.left=new TreeNode(a[i]);q.add(n.left);} i++; if(i<a.length&&a[i]!=null){n.right=new TreeNode(a[i]);q.add(n.right);} i++; } return r; }
  static String TS(TreeNode r){ if(r==null) return "[]"; List<String> o=new ArrayList<>(); Deque<TreeNode> q=new LinkedList<>(); q.add(r);
    while(!q.isEmpty()){ TreeNode n=q.poll(); if(n==null){o.add("null");continue;} o.add(""+n.val); q.add(n.left); q.add(n.right);}
    int e=o.size(); while(e>0&&o.get(e-1).equals("null")) e--; return "["+String.join(",",o.subList(0,e))+"]"; }
  static String A(int[] a){ return Arrays.toString(a).replace(" ",""); }
  static String D(int[][] a){ return Arrays.deepToString(a).replace(" ",""); }
  static char[][] G(String... r){ char[][] g=new char[r.length][]; for(int i=0;i<r.length;i++) g[i]=r[i].toCharArray(); return g; }
  static String GS(char[][] g){ StringBuilder s=new StringBuilder(); for(char[] r:g) s.append(new String(r)).append('|'); return s.toString(); }
  static String S(Object o){ return String.valueOf(o).replace(" ",""); }
`
const helperClasses = `class ListNode { int val; ListNode next; ListNode(int v){val=v;} ListNode(int v, ListNode n){val=v;next=n;} }\nclass TreeNode { int val; TreeNode left, right; TreeNode(int v){val=v;} }\n`
let checks = '', calls = '', classes = ''
for (const p of probs) {
  const id = 'S' + p.n
  const code = p.code.split('\n').filter((l) => !l.startsWith('import ')).join('\n')
    .replace(/\bclass Solution\b/g, `class ${id}`)
  classes += `\n// ---- ${p.n}\n${code}\n`
  const c = (p.check || 'false').replace(/\bSolution\b/g, id)
  checks += `  static boolean c${p.n}() ${c.startsWith('{') ? c : `{ return ${c}; }`}\n`
  calls += `    run(${p.n}, () -> c${p.n}());\n`
}
const main = `  interface B { boolean get() throws Throwable; }
  static int bad = 0;
  static void run(int n, B b){ try{ if(!b.get()){ System.out.println("FAIL "+n); bad++; } }catch(Throwable e){ System.out.println("ERROR "+n+": "+e); bad++; } }
  public static void main(String[] x){
${calls}    System.out.println(bad==0 ? "ALL PASS ("+${probs.length}+")" : bad+" FAILED");
  }
}
`
fs.mkdirSync('/tmp/verify', { recursive: true })
fs.writeFileSync('/tmp/verify/V.java', head + checks + main + '\n' + helperClasses + classes)
try {
  console.log(execFileSync('java', ['/tmp/verify/V.java'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 }).trim())
} catch (e) {
  console.log((e.stdout || '') + (e.stderr || '').split('\n').slice(0, 25).join('\n'))
  process.exit(1)
}
