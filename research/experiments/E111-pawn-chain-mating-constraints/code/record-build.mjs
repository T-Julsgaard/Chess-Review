// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E111-pawn-chain-mating-constraints';
const claims={"C0320":"Complete E021 support component ahead of defender bishop with E078 forward-ray restriction; full actual/fresh actor mate, legal full-chain removal stops mate, then removing ONLY defender bishop restores complete same-horizon mate. Broader liberation/strategic alternatives unresolved.","C0311":"Same complete chain-opening/bishop-removal causal controls prove this bishop passive for one finite mating defense, not low-mobility or pawn-color heuristic.","C0231":"Same causal bishop obstruction plus actual terminal queen entry onto bishop color proves a local color-complex mating vulnerability. No universal/permanent weak-complex score.","C0232":"Dark landing-square branch of same actual terminal mate and legal chain/bishop counterpolicy controls; broader dark-square weaknesses unresolved.","C0233":"Light landing-square branch of same actual terminal mate and legal chain/bishop counterpolicy controls; broader light-square weaknesses unresolved.","C0409":"Actual terminal noncapturing queen entry attacks the demonstrated local chain-blocked bishop weakness, with complete mate versus legal opened-chain defense and bishop-removed restoration. No strategic best-move claim."};const seeds=[directory+'/PLAN.md',directory+'/EXPOSURE.md','package.json','research/AGENTS.md',
 'research/concepts/BUILD-FIRST.md',... (await readdir(directory+'/code')).filter(f=>f.endsWith('.mjs')).map(f=>directory+'/code/'+f)];
const hashes={},visit=async name=>{
 name=name.replaceAll('\\','/');if(hashes[name])return;
 if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata:'+name);
 const text=(await readFile(name,'utf8')).replaceAll('\r\n','\n');hashes[name]=createHash('sha256').update(text).digest('hex');
 if(/\.(mjs|js)$/.test(name))for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))
  await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
};
for(const seed of seeds)await visit(seed);
const record={schema:'coach-build-v1',experiment:'E111',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:["npm run research:coach-tests -- E111","npm run research:coach-tests -- E021","npm run research:coach-tests -- E029","node --test '--test-name-pattern=disabled exact parent|strict controls|history mismatch' research/experiments/E110-joint-mating-coordination/code/coordination.test.mjs","node research/experiments/E111-pawn-chain-mating-constraints/code/pilot.mjs --out research/runs/E111/complete-controls","node research/experiments/E111-pawn-chain-mating-constraints/code/replay-saved.mjs research/runs/E111/complete-controls","npm run verify:source","git diff --check"],
 deferredChecks:['combined cumulative regression','combined independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));
