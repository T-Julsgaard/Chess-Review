import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import path from 'node:path';


export const hash = value => createHash('sha256').update(value).digest('hex');
export const hashFile = async file => hash(await readFile(file));
export function args(options) {
  return parseArgs({ options: Object.fromEntries(Object.entries(options).map(([k, v]) =>
    [k, typeof v === 'boolean' ? { type: 'boolean', default: v } : { type: 'string', ...(v == null ? {} : { default: String(v) }) }])) }).values;
}

export async function json(file) { return JSON.parse(await readFile(file, 'utf8')); }
export function provenanceSummary(manifest) {
  if(manifest==null)return manifest;
  if ((Object.hasOwn(manifest, 'independentlyDefinedScoring') && manifest.independentlyDefinedScoring !== true)
      || (Object.hasOwn(manifest, 'externalReviewScoresUsed') && manifest.externalReviewScoresUsed !== false)) {
    throw Error('Unsupported scoring provenance');
  }
  return structuredClone(manifest);
}
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



