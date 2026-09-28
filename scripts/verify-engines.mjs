import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const engineDir = new URL('../engine/', import.meta.url);
const entries = JSON.parse(await readFile(new URL('checksums.json', engineDir), 'utf8'));
for (const entry of entries) {
  const bytes = await readFile(new URL(entry.file, engineDir));
  const actual = createHash('sha256').update(bytes).digest('hex');
  if (actual !== entry.sha256) throw new Error(`${entry.file}: expected ${entry.sha256}, got ${actual}`);
  console.log(`${entry.file}: ${bytes.length.toLocaleString('en-US')} bytes, SHA-256 OK`);
}
