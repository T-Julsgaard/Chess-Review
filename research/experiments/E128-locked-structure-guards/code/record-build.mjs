// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E128-locked-structure-guards';
const claims={"C0229":"Structural weakness in a four-unit locked ending: a pawn step removes an available graph-safe enemy pawn escape and creates an immobile target forced to be captured first with either turn; broader formations/game outcomes unresolved.","C0912":"Static pawn weakness: after causal fixation the same target is first-capture losing in actual and legal opposite-turn frames under complete graph strategies; not a full game loss.","C0914":"Pawn fixation with functional contrast: quiet single pawn step locks an enemy target whose first capture is forced, while the target prior legal pawn escape led to a graph-safe locked position.","C0780":"Unique quiet king guard: full legal alternatives show only the actual move avoids first capture of own blocked pawn; complete graph safety, actual clock/history and capturing alternatives included."};const seeds=[directory+'/PLAN.md',directory+'/EXPOSURE.md','package.json','research/AGENTS.md',
 'research/concepts/BUILD-FIRST.md','research/experiments/E127-locked-pawn-correspondence/code/correspondence.test.mjs',... (await readdir(directory+'/code')).filter(f=>f.endsWith('.mjs')).map(f=>directory+'/code/'+f)];
const hashes={},visit=async name=>{
 name=name.replaceAll('\\','/');if(hashes[name])return;
 if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata:'+name);
 const text=(await readFile(name,'utf8')).replaceAll('\r\n','\n');hashes[name]=createHash('sha256').update(text).digest('hex');
 if(/\.(mjs|js)$/.test(name))for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))
  await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
};
for(const seed of seeds)await visit(seed);
const record={schema:'coach-build-v1',experiment:'E128',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:["npm run research:coach-tests -- E128","node --test '--test-name-pattern=disabled exact parent|strict controls|history mismatch' research/experiments/E127-locked-pawn-correspondence/code/correspondence.test.mjs","node research/experiments/E128-locked-structure-guards/code/pilot.mjs","node research/experiments/E128-locked-structure-guards/code/replay-saved.mjs","npm run verify:source","git diff --check"],
 deferredChecks:['combined cumulative regression','combined independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));
