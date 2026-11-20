// Reads content/exercises/<course>/*.txt into a list of hands-on exercises that appear between sections of a module.
// File format: "key: value" lines, then sections that start with "@@ task | hint | expect | starter | solution".
import fs from 'node:fs'
import path from 'node:path'

export function loadExercises(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter((f) => f.endsWith('.txt')).sort().map((f) => {
    const parts = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\r/g, '').split(/^@@ (\w+)\s*$/m)
    const meta = Object.fromEntries(parts[0].split('\n').filter((l) => l.includes(':')).map((l) => [l.slice(0, l.indexOf(':')).trim(), l.slice(l.indexOf(':') + 1).trim()]))
    const sec = {}
    for (let i = 1; i < parts.length; i += 2) sec[parts[i]] = parts[i + 1].replace(/^\n+|\s+$/g, '')
    for (const k of ['id', 'module', 'after', 'title']) if (!meta[k]) throw new Error(`${f}: missing ${k}`)
    for (const k of ['task', 'expect', 'starter', 'solution']) if (!sec[k]) throw new Error(`${f}: missing @@ ${k}`)
    return {
      id: meta.id, module: Number(meta.module), after: Number(meta.after), title: meta.title, level: meta.level || 'Medium',
      task: sec.task, hint: sec.hint || '', expect: sec.expect.split('\n').map((l) => [l]), starter: sec.starter + '\n', solution: sec.solution + '\n',
    }
  })
}
