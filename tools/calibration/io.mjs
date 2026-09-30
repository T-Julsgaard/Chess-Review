import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import path from 'node:path';


export const hash = value => createHash('sha256').update(value).digest('hex');
export const hashFile = async file => hash(await readFile(file));
export function args(options) {
  return parseArgs({ options: Object.fromEntries(Object.entries(options).map(([k, v]) =>
    [k, typeof v === 'boolean' ? { type: 'boolean', default: v } : { type: 'string', ...(v == null ? {} : { default: String(v) }) }])) }).values;
}

export async function json(file) { return JSON.parse(await readFile(file, 'utf8')); }
export async function save(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2) + '\n');
}



