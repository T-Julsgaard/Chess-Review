// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E106-ending-conversion-policies';
const claims={"C0602":"Actual capture removes last non-pawn piece, reaches live pawn ending and full mate-OR-surviving-tracked-queen policy at fixed0..6ply bound. General transition value and strategic stage choice unresolved.","C0977":"Same actual pawn-ending conversion plus complete failed same OR-goal policy for one recorded legal alternative, common BEFORE-move material baseline and equal horizon. Finite demonstrated simplification only; global best move unclaimed.","C0738":"Exact K+R+P versus K+B, actual rook captures bishop and retains K+R+P versus K with full finite mate-OR-surviving-queen conversion. Broader rook/bishop technical endings unresolved.","C0739":"Exact K+R+P versus K+N, actual rook captures knight and retains K+R+P versus K with full finite mate-OR-surviving-queen conversion. Broader rook/knight technical endings unresolved."};const seeds=[directory+'/PLAN.md',directory+'/EXPOSURE.md','package.json','research/AGENTS.md',
 'research/concepts/BUILD-FIRST.md',... (await readdir(directory+'/code')).filter(f=>f.endsWith('.mjs')).map(f=>directory+'/code/'+f)];
const hashes={},visit=async name=>{
 name=name.replaceAll('\\','/');if(hashes[name])return;
 if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata:'+name);
 const text=(await readFile(name,'utf8')).replaceAll('\r\n','\n');hashes[name]=createHash('sha256').update(text).digest('hex');
 if(/\.(mjs|js)$/.test(name))for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))
  await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
};
for(const seed of seeds)await visit(seed);
const record={schema:'coach-build-v1',experiment:'E106',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:["npm run research:coach-tests -- E106","npm run research:coach-tests -- E029","node --test '--test-name-pattern=disabled exact parent|strict controls|history mismatch|full JSON serialization' research/experiments/E105-connected-pawn-conversion/code/conversion.test.mjs","node research/experiments/E106-ending-conversion-policies/code/pilot.mjs --out research/runs/E106/pilot","node research/experiments/E106-ending-conversion-policies/code/replay-saved.mjs research/runs/E106/pilot","npm run verify:source","git diff --check"],
 deferredChecks:['combined cumulative regression','combined independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));
