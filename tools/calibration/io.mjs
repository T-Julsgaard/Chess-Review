import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const hash = value => createHash('sha256').update(value).digest('hex');
export const hashFile = async file => hash(await readFile(file));
export function args(options) {
  return parseArgs({ options: Object.fromEntries(Object.entries(options).map(([k, v]) =>
    [k, typeof v === 'boolean' ? { type: 'boolean', default: v } : { type: 'string', ...(v == null ? {} : { default: String(v) }) }])) }).values;
}
export function integer(value, name, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw Error(`Invalid ${name}: ${value}`);
  return n;
}
export async function json(file) { return JSON.parse(await readFile(file, 'utf8')); }
const saves = new Map();
export async function save(file, value) {
  const operation = (saves.get(file) || Promise.resolve()).catch(() => {}).then(async () => {
    await mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(value, null, 2) + '\n');
    for (let attempt = 0; ; attempt++) {
      try { await rename(temporary, file); break; }
      catch (e) {
        if (attempt >= 5 || !['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) throw e;
        await new Promise(resolve => setTimeout(resolve, 50 * 2 ** attempt));
      }
    }
  });
  saves.set(file, operation);
  try { await operation; } finally { if (saves.get(file) === operation) saves.delete(file); }
}
export async function jsonl(file) {
  return (await readFile(file, 'utf8')).split('\n').filter(Boolean).map(JSON.parse);
}
export async function codeIdentity() {
  const { readdir } = await import('node:fs/promises');
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const files = (await readdir(dir)).filter(f => /\.(mjs|cjs)$/.test(f)).sort();
  return Object.fromEntries(await Promise.all([...files.map(async f => [f, await hashFile(path.join(dir, f))]),
    (async () => ['../../lib/chess.js', await hashFile(path.join(dir, '../../lib/chess.js'))])()]));
}
export async function snapshotCode(run, identity) {
  const sourceDir = path.dirname(fileURLToPath(import.meta.url));
  const repository = path.resolve(sourceDir, '../..');
  for (const [name, checksum] of Object.entries(identity)) {
    const original = path.resolve(sourceDir, name), bytes = await readFile(original);
    if (hash(bytes) !== checksum) throw Error(`Source changed while snapshotting: ${name}`);
    const target = path.join(run, 'source', path.relative(repository, original));
    await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, bytes);
  }
}
