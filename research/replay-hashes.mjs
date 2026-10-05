import {readFile} from 'node:fs/promises';import path from 'node:path';
import {sha256} from './data-policy.mjs';import {recordSourceRepresentation} from './source-replay.mjs';
// Record exact bytes and newline representation before fitting, so future
// clean archives can prove source equivalence without a later repair study.
export async function captureSourceHashes(root,codeDirectory,names,extra=[]){
  const codeSha256={},sharedCodeSha256={},sharedSourceRepresentation={},visited=new Set();
  async function walk(p){if(visited.has(p))return;if(p.startsWith('../')||path.posix.isAbsolute(p))throw Error('Source path escapes workspace');visited.add(p);const bytes=await readFile(path.join(root,p)),source=bytes.toString('utf8');if(!p.startsWith(codeDirectory+'/')){sharedCodeSha256[p]=sha256(bytes);sharedSourceRepresentation[p]=recordSourceRepresentation(bytes);}
    for(const m of source.matchAll(/(?:from\s+|import\s*)['"]([^'"]+)['"]/g)){if(!m[1].startsWith('.'))continue;const next=path.posix.normalize(path.posix.join(path.posix.dirname(p),m[1]));if(/\.(mjs|js)$/.test(next))await walk(next);}}
  for(const name of names){const p=codeDirectory+'/'+name;codeSha256[name]=sha256(await readFile(path.join(root,p)));await walk(p);}for(const p of extra)await walk(p);
  return{codeSha256,sharedCodeSha256,sharedSourceRepresentation};
}
