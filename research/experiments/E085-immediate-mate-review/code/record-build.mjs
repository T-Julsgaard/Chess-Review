// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E085-immediate-mate-review';
const claims={C0114:'Complete legal checking/capturing candidate inventory, without a quality ranking or best-move claim.',
 C0116:'Callable legal checks/captures/immediate-mate inventory; deeper threats and hidden thinking method unresolved.',
 C1061:'Complete legal checking/capturing/root-mate records; deeper threat scope unresolved.',
 C0134:'Finite post-move immediate-mate check, all legal opponent replies; no engine-error category or safety beyond horizon.',
 C0821:'Same finite legal immediate-mate review; mental process and broader blunder scope unresolved.',
 C0851:'Played move misses available immediate mate, reuse existing E029 one-ply proof where enabled; other missed tactics unresolved.',
 C0853:'Same before-snapshot immediate mating move survives actual move despite a legal alternative without immediate mating replies; no hidden intention.',
 C0778:'Actual move removes all mate-in-one moves from labelled hypothetical enemy-turn snapshot; no broad tactical safety.',
 C0117:'Complete legal one-ply root and actual-response tree with terminal flags; deeper calculation trees unresolved.'};
const seeds=[directory+'/PLAN.md',directory+'/EXPOSURE.md','package.json','research/AGENTS.md',
 'research/concepts/BUILD-FIRST.md',... (await readdir(directory+'/code')).filter(f=>f.endsWith('.mjs')).map(f=>directory+'/code/'+f)];
const hashes={},visit=async name=>{
 name=name.replaceAll('\\','/');if(hashes[name])return;
 if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata:'+name);
 const text=(await readFile(name,'utf8')).replaceAll('\r\n','\n');hashes[name]=createHash('sha256').update(text).digest('hex');
 if(/\.(mjs|js)$/.test(name))for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))
  await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
};
for(const seed of seeds)await visit(seed);
const record={schema:'coach-build-v1',experiment:'E085',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:['npm run research:coach-tests -- E085 E084 (focused dependency checks)',
 'npm run research:coach-tests -- E085 (24 focused checks, independent complete legal/mate scans)',
 'node research/experiments/E085-immediate-mate-review/code/pilot.mjs (19 synthetic cases, complete immediate mate scans)',
 'npm run verify:source','git diff --check'],
 deferredChecks:['combined cumulative regression','independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));
