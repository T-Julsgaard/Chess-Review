// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E089-causal-pawn-breakthrough';
const claims={C0216:'Actual pawn capture newly creates passed pawn and surviving all-defense straight queen route absent before at equal own-push bound; nonpawn/global breakthrough unresolved.',
 C0641:'Such causal pawn-capture breakthrough within1..6own pushes; general sacrificial pawn breakthroughs and game win unresolved.',
 C0618:'Same certified route change only in pure K/P ending; general winning breakthrough unresolved.',
 C0204:'Selected pre-move pawn is realized as a passer by actual legal pawn capture with certified surviving route; broader candidate passer strategy unresolved.',
 C0644:'Same realized candidate passer with all-defense promotion witness; unplayed multi-exchange possibilities unresolved.',
 C0629:'Actor already had strict pawn surplus before played pawn advance/capture in pure K/P ending; after it has certified surviving queen route; ultimate game win unresolved.'};
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
const record={schema:'coach-build-v1',experiment:'E089',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:['npm run research:coach-tests -- E089 E088 E037 (focused dependency checks)',
 'npm run research:coach-tests -- E089 (21 focused checks, independent promotion and failed-route checker)',
 'node research/experiments/E089-causal-pawn-breakthrough/code/pilot.mjs (16 synthetic cases, independent route replay)',
 'npm run verify:source','git diff --check'],
 deferredChecks:['combined cumulative regression','independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));
