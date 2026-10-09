// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E087-king-mobility-cutoffs';
const claims={C0354:'New enemy king destination denied on moved rook/queen straight line, restored by removing that piece; immediate legal scope, not durable cut-off.',
 C0396:'Same causal immediate straight-line king restriction; permanent barrier/win unresolved.',
 C0662:'Such moved-rook restriction in pure K/R/P material; strategic rook-ending cut-off benefit unresolved.',
 C0443:'Enemy king step legal before snapshot, absent actual after, restored on removal and attacked by moved piece; current restriction only.',
 C0442:'Enemy king in actual check has no legal king evasion but has non-king legal capture/block replies; future escape/safety unresolved.',
 C0773:'Previously legal enemy castle absent after, restored removing moved piece attacking king/transit/destination; temporary legal prevention only.',
 C0777:'Actual nonking move creates legal actor king step in labelled next-actor snapshot; no durable safety or general mate prevention.'};
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
const record={schema:'coach-build-v1',experiment:'E087',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:['npm run research:coach-tests -- E087 E086 (focused dependency checks)',
 'npm run research:coach-tests -- E087 (26 focused checks, independent causal move-set checker)',
 'node research/experiments/E087-king-mobility-cutoffs/code/pilot.mjs (22 synthetic cases, independent causal move sets)',
 'npm run verify:source','git diff --check'],
 deferredChecks:['combined cumulative regression','independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));
