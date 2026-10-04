import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Temporary development-only backport for GHSA-86w9-cpqp-85rv.
// Match the nested element-count check proposed in digitalbazaar/forge#1152.
// Remove this patch and the npm override when an official fixed release exists.
const originalHash = 'fd4740238145ec26470eb3f06a627c72039538ce1307dbdce40521f94dfd0a50';
const before = 'obj.value.length !== 2) {';
const after = "obj.value.length !== 2 ||\n            obj.value[0].value.length !==\n            (('parameters' in capture) ? 2 : 1)) {";
const sha256 = value => createHash('sha256').update(value).digest('hex');

export function patchRsaSource(source) {
  const normalized = source.replace(/\r\n/g, '\n');
  // Validate the whole file, including on a second invocation. Unknown source
  // must fail installation rather than silently leave vulnerable code running.
  if (sha256(normalized) === originalHash) return normalized.replace(before, after);
  if (normalized.includes(after) && sha256(normalized.replace(after, before)) === originalHash) return source;
  throw Error('Unexpected node-forge RSA source; review the CVE-2026-85393 backport before using development tooling.');
}

export async function patchNodeForge() {
  const require = createRequire(import.meta.url);
  let packagePath;
  try { packagePath = require.resolve('node-forge/package.json'); }
  catch (error) {
    if (error.code === 'MODULE_NOT_FOUND' && process.env.npm_config_omit?.split(/\s+/).includes('dev')) return;
    throw error;
  }
  const {version} = JSON.parse(await readFile(packagePath, 'utf8'));
  if (version !== '1.4.0') throw Error(`Review the node-forge backport for version ${version}; it only supports 1.4.0.`);
  const rsaPath = path.join(path.dirname(packagePath), 'lib/rsa.js');
  const source = await readFile(rsaPath, 'utf8');
  const patched = patchRsaSource(source);
  if (patched !== source) await writeFile(rsaPath, patched);
  console.log('Verified node-forge development backport for CVE-2026-85393.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await patchNodeForge();
