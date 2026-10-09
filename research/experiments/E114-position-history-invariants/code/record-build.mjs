// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E114-position-history-invariants';
const claims={"C0971":"Actual move breaks exact whole-army color/rank reflection; complete unmatched inventories, no strategic inequality claim.","C0382":"Complete standard-initial-position history including actual move contains no actor castling; king square explicit. Missing/nonstandard history unavailable; no safety claim.","C0806":"Actual pawn identity strictly advances relative rank or promotes; same pawn cannot return to source as a pawn under forward-only movement rules.","C0927":"Explicit pawn identity advance, captured total unit-count decrease or castling-rights loss; complete immediate reply inventory checks count/rights monotonicity. Broader irreversible decisions unresolved.","C0213":"Actual pawn move abandons empty central attack square; all remaining own pawns at/above target rank cannot ever retreat to required attack rank. Permanent lack of pawn control, piece-defense/strategic weakness unresolved."};const seeds=[directory+'/PLAN.md',directory+'/EXPOSURE.md','package.json','research/AGENTS.md',
 'research/concepts/BUILD-FIRST.md','research/experiments/E113-causal-slider-placement/code/placement.test.mjs',... (await readdir(directory+'/code')).filter(f=>f.endsWith('.mjs')).map(f=>directory+'/code/'+f)];
const hashes={},visit=async name=>{
 name=name.replaceAll('\\','/');if(hashes[name])return;
 if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata:'+name);
 const text=(await readFile(name,'utf8')).replaceAll('\r\n','\n');hashes[name]=createHash('sha256').update(text).digest('hex');
 if(/\.(mjs|js)$/.test(name))for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))
  await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
};
for(const seed of seeds)await visit(seed);
const record={schema:'coach-build-v1',experiment:'E114',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:["npm run research:coach-tests -- E114","node --test '--test-name-pattern=disabled exact parent|strict controls|history mismatch' research/experiments/E113-causal-slider-placement/code/placement.test.mjs","node research/experiments/E114-position-history-invariants/code/pilot.mjs","node research/experiments/E114-position-history-invariants/code/replay-saved.mjs","npm run verify:source","git diff --check"],
 deferredChecks:['combined cumulative regression','combined independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));
