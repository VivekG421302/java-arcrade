// Parses content/problems/*.txt. Format per problem:
// === N
// S: statement          T: input => expected output (repeatable)
// A: approach           C: Java check (expression, or { ...; return bool; })   [verification only]
// ```java ... ```       Java solution
import fs from 'node:fs'
import path from 'node:path'

export function parseProblems(text) {
  return text
    .split(/^=== (\d+)\s*$/m)
    .slice(1)
    .reduce((acc, v, i, a) => {
      if (i % 2) return acc
      const body = a[i + 1]
      const given = (body.match(/```defs\n([\s\S]*?)```/) || [])[1]?.trimEnd()
      const code = (body.match(/```(?:java|rust)\n([\s\S]*?)```/) || [])[1]?.trimEnd()
      const lines = body.replace(/```defs\n[\s\S]*?```/, '').replace(/```(?:java|rust)\n[\s\S]*?```/, '').split('\n')
      const one = (k) => lines.filter((l) => l.startsWith(k + ': ')).map((l) => l.slice(k.length + 2).trim())
      const tests = one('T').map((t) => {
        const [input, output] = t.split(' => ')
        const strip = (x) => x.trim().replace(/^`([\s\S]*)`$/, '$1')
        return { input: strip(input), output: strip(output) }
      })
      acc.push({ n: +v, statement: one('S')[0], tests, approach: one('A')[0] || '', check: one('C')[0], code, given })
      return acc
    }, [])
}

export function loadProblems(dir = 'content/problems') {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.txt'))
    .sort()
    .flatMap((f) => parseProblems(fs.readFileSync(path.join(dir, f), 'utf8')))
}
