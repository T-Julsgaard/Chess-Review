// Source metadata only. Vendor engine bytes are explicit leaves, never parsed as imports.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
export const directory='research/experiments/E138-bounded-engine-panels';
export const binary=name=>name.endsWith('.wasm');
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export const normalized=(name,bytes)=>binary(name)?bytes:bytes.toString('utf8').replaceAll('\r\n','\n');
export async function bindings(seeds){
 const hashes={};async function visit(name){name=name.replaceAll('\\','/');if(hashes[name])return;
  if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata: '+name);
  const bytes=await readFile(name),source=normalized(name,bytes);hashes[name]=digest(source);
  if(!name.startsWith('engine/')&&/\.(mjs|js|cjs)$/.test(name))for(const m of source.matchAll(/(?:from\s*|import\s*\(\s*|import\s*|require\s*\(\s*)['"](\.[^'"]+)['"]/g))await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),m[1])));
 }for(const name of seeds)await visit(name);return Object.fromEntries(Object.entries(hashes).sort());
}
export const collectionSeeds=[directory+'/code/collect.mjs',directory+'/code/fixtures.mjs','tools/calibration/engine-host.cjs','engine/stockfish-19-lite-single.js','engine/stockfish-19-lite-single.wasm'];
