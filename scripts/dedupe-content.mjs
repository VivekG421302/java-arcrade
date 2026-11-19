// Finds (and with --fix removes) a block of markdown that is repeated straight after itself.
// Blocks are separated by blank lines (blank lines inside ``` fences do not split). A run of 1-4 blocks repeated right away is a duplicate.
// Usage: node scripts/dedupe-content.mjs [--fix] [files...]   (default: every .md under content/)
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const fix = args.includes('--fix')
let files = args.filter((a) => !a.startsWith('--'))
if (!files.length) {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.md') ? [path.join(d, e.name)] : []))
  files = walk('content')
}

function blocks(text) {
  const out = []
  let cur = [], fence = false
  for (const line of text.split('\n')) {
    if (/^\s*```/.test(line)) fence = !fence
    if (!fence && line.trim() === '' && !/^\s*```/.test(line)) { if (cur.length) { out.push(cur.join('\n')); cur = [] } continue }
    cur.push(line)
  }
  if (cur.length) out.push(cur.join('\n'))
  return out
}

let total = 0
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8')
  const bl = blocks(text)
  const drop = new Set()
  for (let i = 0; i < bl.length; i++) {
    if (drop.has(i)) continue
    for (let k = 4; k >= 1; k--) {
      if (i + 2 * k > bl.length) continue
      let same = true
      for (let j = 0; j < k; j++) if (bl[i + j] !== bl[i + k + j]) { same = false; break }
      // a lone repeated block must be real prose or a list, not a one-line heading / divider
      if (same && k === 1 && bl[i].split('\n').length < 2) same = false
      if (same) {
        for (let j = 0; j < k; j++) drop.add(i + k + j)
        const preview = bl[i].split('\n')[0].slice(0, 70)
        console.log(`${f}: ${k} block(s) repeated straight after "${preview}"`)
        total++
        i += 2 * k - 1
        break
      }
    }
  }
  if (fix && drop.size) fs.writeFileSync(f, bl.filter((_, i) => !drop.has(i)).join('\n\n') + '\n')
}
console.log(total ? `${total} duplicate run(s)${fix ? ' removed' : ' found'}` : 'no duplicates found')
process.exit(total && !fix ? 1 : 0)
