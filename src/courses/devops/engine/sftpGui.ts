// What the FileZilla-style pane does to the world. Same filesystems and permission rules as the terminal, so a jar uploaded by
// drag-and-drop is visible to `ls -lh /opt/myapp` and vice versa.
import { base, can, join, listDir, moveTree, parent, removeTree, type Fs, type FsEntry } from './fs'
import { transfer } from './netcmds'
import { PEM, PUBLIC_IP, serverDown, ufwBlocks, type World } from './world'
import { DOMAIN } from './nginx'

export interface SftpLog { kind: 'Status' | 'Command' | 'Response' | 'Error'; s: string }
export interface Row { name: string; type: 'file' | 'dir'; size: number; mode: string; owner: string; mtime: number }
export type Side = 'local' | 'remote'

const KEY_MARKER = 'SHOP-SERVER-KEY'

export function keyChoices(w: World): string[] {
  const d = '/home/learner/.ssh'
  return listDir(w.fs.local, d).filter((n) => n.endsWith('.pem')).map((n) => join(d, n))
}

export function sftpConnect(w: World, f: { host: string; user: string; port: number; key: string }): { ok: boolean; log: SftpLog[] } {
  const host = f.host.trim().replace(/^s?ftp:\/\//, '')
  const log: SftpLog[] = [{ kind: 'Status', s: `Connecting to ${host}...` }]
  const fail = (m: string) => { log.push({ kind: 'Error', s: m }, { kind: 'Error', s: 'Could not connect to server' }); return { ok: false, log } }
  if ((host === PUBLIC_IP || host === DOMAIN) && (serverDown(w) || ufwBlocks(w, 22))) return fail('Connection timed out after 20 seconds of inactivity')
  if (host !== PUBLIC_IP && host !== DOMAIN) return fail(/^\d+\.\d+\.\d+\.\d+$/.test(host) ? 'Connection timed out after 20 seconds of inactivity' : `Could not resolve host name ${host}`)
  if (f.port !== 22) return fail('Connection attempt failed with "ECONNREFUSED - Connection refused by server".')
  log.push({ kind: 'Status', s: `Using username "${f.user}".` })
  const key = f.key ? w.fs.local[f.key] : undefined
  if (!f.key) return fail('Disconnected: No supported authentication methods available (server sent: publickey)')
  if (!key || !(key.content ?? '').includes(KEY_MARKER) || f.user !== 'ubuntu') return fail('Authentication failed.')
  log.push({ kind: 'Status', s: `Connected to ${host}` }, { kind: 'Status', s: 'Retrieving directory listing...' }, { kind: 'Status', s: 'Directory listing of "/home/ubuntu" successful' })
  w.x.sftp.connected = true
  return { ok: true, log }
}

export function sftpDisconnect(w: World): SftpLog[] {
  w.x.sftp.connected = false
  return [{ kind: 'Status', s: 'Disconnected from server' }]
}

const toRow = (name: string, e: FsEntry): Row => ({ name, type: e.type, size: e.size, mode: e.mode, owner: e.owner, mtime: e.mtime })

export function listing(w: World, side: Side, path: string): Row[] | null {
  const fs: Fs = w.fs[side]
  if (fs[path]?.type !== 'dir') return null
  return listDir(fs, path).map((n) => toRow(n, fs[join(path, n)]))
}

export function sftpTransfer(w: World, dir: 'up' | 'down', from: string, toDir: string): SftpLog[] {
  const name = base(from)
  const dest = join(toDir, name)
  const src = w.fs[dir === 'up' ? 'local' : 'remote'][from]
  const log: SftpLog[] = [{ kind: 'Status', s: `File transfer queued: ${name}` }]
  if (!src || src.type !== 'file') return [{ kind: 'Error', s: 'Only files can be transferred in this simulator (folders: right-click is not needed in Stage 1).' }]
  const r = transfer(w, dir, from, toDir, 'learner', 'ubuntu')
  if (r.err) {
    log.push({ kind: 'Error', s: `${dest}: open for write: permission denied` }, { kind: 'Error', s: 'File transfer failed' })
    return log
  }
  log.push({ kind: 'Status', s: `Starting ${dir === 'up' ? 'upload' : 'download'} of ${from}` }, { kind: 'Status', s: `File transfer successful, transferred ${(r.bytes / 1048576).toFixed(0)} MiB in 3 seconds` })
  return log
}

export function sftpRename(w: World, side: Side, path: string, newName: string): SftpLog[] {
  const fs = w.fs[side]
  const to = join(parent(path), newName)
  if (!newName || newName.includes('/')) return [{ kind: 'Error', s: 'Invalid file name.' }]
  if (fs[to]) return [{ kind: 'Error', s: `${to}: file exists already` }]
  if (!can(fs[parent(path)], side === 'remote' ? 'ubuntu' : 'learner', 'w')) return [{ kind: 'Error', s: `${path}: rename failed: permission denied` }]
  moveTree(fs, path, to)
  return [{ kind: 'Status', s: `Renamed '${path}' to '${to}'` }]
}

export function sftpDelete(w: World, side: Side, path: string): SftpLog[] {
  const fs = w.fs[side]
  if (!can(fs[parent(path)], side === 'remote' ? 'ubuntu' : 'learner', 'w')) return [{ kind: 'Error', s: `${path}: delete failed: permission denied` }]
  removeTree(fs, path)
  return [{ kind: 'Status', s: `Deleted "${path}"` }]
}

export { PEM }
