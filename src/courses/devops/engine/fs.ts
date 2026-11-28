// A tiny POSIX-ish filesystem: one flat map from absolute path to entry. Two instances exist in the simulator (laptop and VPS).
import type { VirtualFileSystemNode } from '../types'

export interface FsEntry {
  type: 'file' | 'dir'
  mode: string        // octal permission digits, e.g. "644"
  owner: string
  size: number        // bytes
  content?: string
  mtime: number       // epoch seconds (simulated clock)
  link?: string       // symlink target (absolute path); reads follow it
}
export type Fs = Record<string, FsEntry>

export const base = (p: string) => (p === '/' ? '/' : p.slice(p.lastIndexOf('/') + 1))
export const parent = (p: string) => (p === '/' ? '/' : p.slice(0, p.lastIndexOf('/')) || '/')
export const join = (a: string, b: string) => (a === '/' ? `/${b}` : `${a}/${b}`)

/** Resolve `p` against `cwd`, expanding ~ and . / .. segments. */
export function resolvePath(p: string, cwd: string, home: string): string {
  let full = p
  if (full === '~') full = home
  else if (full.startsWith('~/')) full = join(home, full.slice(2))
  else if (!full.startsWith('/')) full = join(cwd, full)
  const out: string[] = []
  for (const seg of full.split('/')) {
    if (!seg || seg === '.') continue
    if (seg === '..') out.pop()
    else out.push(seg)
  }
  return '/' + out.join('/')
}

/** Display a path the way bash does in the prompt: /home/ubuntu -> ~ */
export const tilde = (p: string, home: string) => (p === home ? '~' : p.startsWith(home + '/') ? '~' + p.slice(home.length) : p)

export function buildFs(root: VirtualFileSystemNode, now: number): Fs {
  const fs: Fs = {}
  const walk = (n: VirtualFileSystemNode, path: string, inheritOwner: string) => {
    const owner = n.owner ?? inheritOwner
    if (n.type === 'dir') {
      fs[path] = { type: 'dir', mode: n.permissions ?? '755', owner, size: 4096, mtime: now }
      for (const c of n.children ?? []) walk(c, join(path, c.name), owner)
    } else {
      const content = n.content ?? ''
      fs[path] = { type: 'file', mode: n.permissions ?? '644', owner, size: n.size ?? content.length, content: n.size ? undefined : content, mtime: now }
    }
  }
  walk({ ...root, name: '/' }, '/', root.owner ?? 'root')
  return fs
}

export const exists = (fs: Fs, p: string) => !!fs[p]
export const isDir = (fs: Fs, p: string) => fs[p]?.type === 'dir'

export function listDir(fs: Fs, dir: string): string[] {
  const prefix = dir === '/' ? '/' : dir + '/'
  const names: string[] = []
  for (const p of Object.keys(fs)) {
    if (p !== dir && p.startsWith(prefix) && !p.slice(prefix.length).includes('/')) names.push(p.slice(prefix.length))
  }
  const key = (s: string) => s.replace(/^\./, '').toLowerCase()
  return names.sort((a, b) => key(a).localeCompare(key(b)) || a.localeCompare(b))
}

export function modeString(e: FsEntry): string {
  if (e.link) return 'lrwxrwxrwx'
  const bits = e.mode.padStart(3, '0').split('').map(Number)
  const tri = (n: number) => (n & 4 ? 'r' : '-') + (n & 2 ? 'w' : '-') + (n & 1 ? 'x' : '-')
  return (e.type === 'dir' ? 'd' : '-') + bits.map(tri).join('')
}

/** `ls -h` / `du -h` style size: 1K = 1024, one decimal below 10, rounded up (like GNU coreutils). */
export function humanSize(n: number): string {
  if (n < 1024) return String(n)
  const units = ['K', 'M', 'G', 'T']
  let v = n / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  const r = v < 10 ? Math.ceil(v * 10) / 10 : Math.ceil(v)
  return `${Number.isInteger(r) ? r : r.toFixed(1)}${units[i]}`
}

type Access = 'r' | 'w' | 'x'
/** Owner bits apply to the owner, "other" bits to everyone else; root bypasses (groups are not modelled). */
export function can(e: FsEntry, user: string, what: Access): boolean {
  if (user === 'root') return true
  const bits = e.mode.padStart(3, '0').split('').map(Number)
  const n = user === e.owner ? bits[0] : bits[2]
  return !!(n & (what === 'r' ? 4 : what === 'w' ? 2 : 1))
}

export function mkdirp(fs: Fs, path: string, owner: string, now: number) {
  const parts = path.split('/').filter(Boolean)
  let cur = ''
  for (const p of parts) {
    cur += '/' + p
    if (!fs[cur]) fs[cur] = { type: 'dir', mode: '755', owner, size: 4096, mtime: now }
  }
}

export function writeFile(fs: Fs, path: string, content: string, owner: string, now: number, mode = '644', size?: number) {
  const prev = fs[path]
  fs[path] = { type: 'file', mode: prev?.mode ?? mode, owner: prev?.owner ?? owner, size: size ?? content.length, content: size ? undefined : content, mtime: now }
}

export function removeTree(fs: Fs, path: string) {
  const prefix = path + '/'
  for (const p of Object.keys(fs)) if (p === path || p.startsWith(prefix)) delete fs[p]
}

export function copyTree(fs: Fs, from: string, to: string, owner: string, now: number) {
  const prefix = from + '/'
  for (const p of Object.keys(fs)) {
    if (p === from || p.startsWith(prefix)) {
      const e = fs[p]
      fs[to + p.slice(from.length)] = { ...e, owner, mtime: now }
    }
  }
}

export function moveTree(fs: Fs, from: string, to: string) {
  const prefix = from + '/'
  for (const p of Object.keys(fs)) {
    if (p === from || p.startsWith(prefix)) {
      fs[to + p.slice(from.length)] = fs[p]
      delete fs[p]
    }
  }
}

const segRe = (seg: string) => new RegExp('^' + seg.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$')

/** Expand * and ? in a path (any segment). Results keep the prefix as typed (~/x, /x, x). Hidden files only match patterns starting with '.'. */
export function glob(fs: Fs, pattern: string, cwd: string, home: string): string[] {
  if (!/[*?]/.test(pattern)) return [pattern]
  let dir = cwd, shown0 = '', rest = pattern
  if (pattern.startsWith('/')) { dir = '/'; shown0 = '/'; rest = pattern.slice(1) }
  else if (pattern.startsWith('~/')) { dir = home; shown0 = '~/'; rest = pattern.slice(2) }
  const segs = rest.split('/').filter(Boolean)
  const walk = (d: string, i: number, shown: string): string[] => {
    if (i === segs.length) return [shown]
    const seg = segs[i]
    const next = (n: string) => shown + (shown === '' || shown.endsWith('/') ? '' : '/') + n
    if (!/[*?]/.test(seg)) { const p = join(d, seg); return fs[p] ? walk(p, i + 1, next(seg)) : [] }
    const re = segRe(seg)
    return listDir(fs, d).filter((n) => re.test(n) && (!n.startsWith('.') || seg.startsWith('.'))).flatMap((n) => walk(join(d, n), i + 1, next(n)))
  }
  return walk(dir, 0, shown0).sort()
}

/** Where a symlink at `linkPath` points, as an absolute path (relative targets are read from the link's own folder, like the kernel does). */
export function linkAbs(fs: Fs, linkPath: string): string {
  const e = fs[linkPath]
  const t = e?.link ?? ''
  return resolvePath(t, parent(linkPath), '/')
}

/**
 * Resolve every symlink on the way to `p` (all components when `last` is true, otherwise every component except the final one).
 * Returns the real path, or null for a loop. A dangling link resolves to the path it points at, which simply does not exist.
 */
export function realpath(fs: Fs, p: string, last = true): string | null {
  let hops = 0
  let cur = p
  outer: for (;;) {
    const segs = cur.split('/').filter(Boolean)
    let acc = ''
    for (let i = 0; i < segs.length; i++) {
      acc += '/' + segs[i]
      const e = fs[acc]
      const isLast = i === segs.length - 1
      if (e?.link && (!isLast || last)) {
        if (++hops > 40) return null
        const rest = segs.slice(i + 1).join('/')
        const tgt = linkAbs(fs, acc)
        cur = rest ? join(tgt, rest) : tgt
        continue outer
      }
    }
    return acc || '/'
  }
}

/** Follow symlinks like the kernel does when a program opens a path (including links in the middle of the path). */
export function resolveLink(fs: Fs, p: string): FsEntry | undefined {
  const r = realpath(fs, p, true)
  return r ? fs[r] : undefined
}

/** True when `p` is a symlink whose target does not exist (what `ls --color` paints red). */
export function isDangling(fs: Fs, p: string): boolean {
  return !!fs[p]?.link && !resolveLink(fs, p)
}
