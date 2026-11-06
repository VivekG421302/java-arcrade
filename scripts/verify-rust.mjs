// Compiles every Rust solution (each in its own module) and runs its C: check.
// Usage: node scripts/verify-rust.mjs [--edition 2015|2018|2021] [file.txt ...]
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { loadProblems, parseProblems } from './problems.mjs'

const args = process.argv.slice(2)
let edition = '2018'
const ei = args.indexOf('--edition')
if (ei >= 0) { edition = args[ei + 1]; args.splice(ei, 2) }
const probs = args.length ? args.flatMap((f) => parseProblems(fs.readFileSync(f, 'utf8'))) : loadProblems('content/rust/problems')

const prelude = `#![allow(dead_code, unused_imports, unused_variables, unused_mut, unused_must_use, non_snake_case)]
use std::collections::*;

#[derive(PartialEq, Eq, Clone, Debug)]
pub struct ListNode { pub val: i32, pub next: Option<Box<ListNode>> }
#[derive(PartialEq, Eq, Clone, Debug)]
pub struct TreeNode { pub val: i32, pub left: Option<Box<TreeNode>>, pub right: Option<Box<TreeNode>> }

pub fn list(a: &[i32]) -> Option<Box<ListNode>> {
    let mut head: Option<Box<ListNode>> = None;
    for &v in a.iter().rev() { head = Some(Box::new(ListNode { val: v, next: head })); }
    head
}
pub fn lv(l: &Option<Box<ListNode>>) -> Vec<i32> {
    let mut out = vec![]; let mut cur = l;
    while let Some(n) = cur { out.push(n.val); cur = &n.next; }
    out
}
// level-order tree from "[3,9,20,null,null,15,7]"
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
pub fn strs(a: &[&str]) -> Vec<String> { a.iter().map(|s| s.to_string()).collect() }
`
let mods = '', calls = ''
for (const p of probs) {
  const c = (p.check || 'false').trim()
  const body = c.startsWith('{') ? c : `{ ${c} }`
  const defs = p.given ? p.given + '\n' : ''
  mods += `\nmod p${p.n} {\n    use super::*;\n${defs}${p.code}\n    pub fn check() -> bool ${body}\n}\n`
  calls += `    run(${p.n}, || p${p.n}::check());\n`
}
const main = `
fn run<F: FnOnce() -> bool + std::panic::UnwindSafe>(n: u32, f: F) {
    match std::panic::catch_unwind(f) {
        Ok(true) => {}
        Ok(false) => { println!("FAIL {}", n); unsafe { BAD += 1; } }
        Err(_) => { println!("PANIC {}", n); unsafe { BAD += 1; } }
    }
}
static mut BAD: u32 = 0;
fn main() {
    std::panic::set_hook(Box::new(|_| {}));
${calls}    let bad = unsafe { BAD };
    if bad == 0 { println!("ALL PASS ({})", ${probs.length}); } else { println!("{} FAILED", bad); }
}
`
fs.mkdirSync('/tmp/vr', { recursive: true })
fs.writeFileSync('/tmp/vr/main.rs', prelude + mods + main)
try {
  execFileSync('rustc', ['--edition', edition, '-A', 'warnings', '-o', '/tmp/vr/main', '/tmp/vr/main.rs'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 280000 })
  console.log(execFileSync('/tmp/vr/main', [], { encoding: 'utf8', timeout: 120000 }).trim())
} catch (e) {
  console.log(((e.stdout || '') + (e.stderr || '')).split('\n').slice(0, 40).join('\n'))
  process.exit(1)
}
