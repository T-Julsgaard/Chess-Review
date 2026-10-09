// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E105-connected-pawn-conversion';
const claims={"C0201":"Actual connected passed pair in K+2P versus K, current legal partner support plus complete original-pawn identity history with legal protection in both directions at different snapshots, and full tracked-pawn surviving-queen policy. Recorded alternating reciprocal protection only; simultaneous/direct mutual attacks and permanent safety unclaimed.","C0552":"Actual noncapturing pawn advance leaves connected passed pair with complete legal tracked-queen conversion policy; removal of only partner under post-move clocks has complete failure at same0..8ply bound. Finite causal structure usefulness, global structure evaluation unresolved.","C0928":"Same full conversion policy and complete partner-removal counterpolicy demonstrate dependence of this finite legal route on the actual pawn pair. Global optimal plans and other structures/material unresolved.","C1080":"Same causal structure route plus complete failure after a legal noncapturing king delay AND artificial restore of only advanced pawn under post-move clocks/turn. Finite conversion timing at fixed bound; globally correct timing and unbounded winning status unresolved."};const seeds=[directory+'/PLAN.md',directory+'/EXPOSURE.md','package.json','research/AGENTS.md',
 'research/concepts/BUILD-FIRST.md',... (await readdir(directory+'/code')).filter(f=>f.endsWith('.mjs')).map(f=>directory+'/code/'+f)];
const hashes={},visit=async name=>{
 name=name.replaceAll('\\','/');if(hashes[name])return;
 if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata:'+name);
 const text=(await readFile(name,'utf8')).replaceAll('\r\n','\n');hashes[name]=createHash('sha256').update(text).digest('hex');
 if(/\.(mjs|js)$/.test(name))for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))
  await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
};
for(const seed of seeds)await visit(seed);
const record={schema:'coach-build-v1',experiment:'E105',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:["npm run research:coach-tests -- E105","npm run research:coach-tests -- E094 E104","node --test '--test-name-pattern=disabled exact parent|strict controls|history mismatch|full JSON serialization' research/experiments/E102-king-pawn-turn-policies/code/policies.test.mjs","node research/experiments/E105-connected-pawn-conversion/code/pilot.mjs --out research/runs/E105/pilot","node research/experiments/E105-connected-pawn-conversion/code/replay-saved.mjs research/runs/E105/pilot","npm run verify:source","git diff --check"],
 deferredChecks:['combined cumulative regression','combined independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));
