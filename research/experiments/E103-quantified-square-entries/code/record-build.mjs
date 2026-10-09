// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E103-quantified-square-entries';
const claims={"C0266":"Actual live noncapturing piece entry has piece-specific all-defense legal capture policy with positive nominal gain through all immediate counters. Enemy cannot remove that occupied piece or this finite goal on its next turn; enduring weak-square quality unresolved.","C0267":"Same quantified occupied-square material usefulness against every legal defense, restricted to captures by the actual moved piece; global strong-square quality, best entry and permanent holding unresolved.","C0270":"Actual relative-rank-five-or-higher piece entry has positive all-defense piece-specific material policy; artificial restoration of only the piece under post-move clocks/rights has complete policy failure. Causal finite tactical entry only; enduring invasion unresolved.","C0271":"Same causally supported advanced entry and all-defense material policy; strategic penetrating-square evaluation, durable control and other objectives remain unresolved.","C0212":"Actual pawn-supported knight rank4..6 with unchanged E070 complete pre-promotion enemy-pawn reach exclusion, plus positive same-knight all-defense material policy. Fixed pawn-resistant square with finite tactical usefulness; general convenient-defense and promoted-unit scopes unresolved.","C0337":"Reuse E070 legal support and full future pawn-access certificate, add same-knight all-defense positive capture policy through all immediate counters. No immediate enemy reply captures the knight in this subset; removal of support and later safety/permanence unresolved."};const seeds=[directory+'/PLAN.md',directory+'/EXPOSURE.md','package.json','research/AGENTS.md',
 'research/concepts/BUILD-FIRST.md',... (await readdir(directory+'/code')).filter(f=>f.endsWith('.mjs')).map(f=>directory+'/code/'+f)];
const hashes={},visit=async name=>{
 name=name.replaceAll('\\','/');if(hashes[name])return;
 if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata:'+name);
 const text=(await readFile(name,'utf8')).replaceAll('\r\n','\n');hashes[name]=createHash('sha256').update(text).digest('hex');
 if(/\.(mjs|js)$/.test(name))for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))
  await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
};
for(const seed of seeds)await visit(seed);
const record={schema:'coach-build-v1',experiment:'E103',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:["npm run research:coach-tests -- E103 E022 E091","node --test '--test-name-pattern=disabled exact parent|strict controls|history mismatch' research/experiments/E102-king-pawn-turn-policies/code/policies.test.mjs","node --test '--test-name-pattern=supported-fifth|enemy-pawn-can-shift-file|exact parent defaults|complete future routes' research/experiments/E070-knight-outposts/code/outpost.test.mjs","node research/experiments/E103-quantified-square-entries/code/pilot.mjs --out research/runs/E103/pilot","node research/experiments/E103-quantified-square-entries/code/replay-saved.mjs research/runs/E103/pilot","npm run verify:source","git diff --check"],
 deferredChecks:['combined cumulative regression','combined independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));
