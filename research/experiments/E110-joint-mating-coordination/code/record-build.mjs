// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E110-joint-mating-coordination';
const claims={"C0028":"Complete actual and fresh-actual finite mate policies; each selected partner separately necessary under legal removal or restored actual king entry controls. Strict exact actor K+QN/QB/opposite-colorBB/KR/KN, <=10units, no rights. Generic coordination beyond this finite mate remains unresolved.","C0556":"Complete actual and fresh-actual finite mate policies; each selected partner separately necessary under legal removal or restored actual king entry controls. Strict exact actor K+QN/QB/opposite-colorBB/KR/KN, <=10units, no rights. Generic coordination beyond this finite mate remains unresolved.","C0373":"Same full joint necessity gate for exact queen+knight pair. No motif-only or generic strategic cooperation claim.","C0374":"Same full joint necessity gate for exact queen+bishop pair.","C0678":"Actual king entry with rook; restoring ONLY king to its actual origin and separately removing rook both fail complete same-horizon mating policy.","C0707":"Actual king entry with knight; separate king restoration and knight removal fail complete mating policy.","C0356":"Same king+rook joint finite mate against exact opposing king+one bishop/knight. All actual enemy defenses certified; generic rook/minor valuation unresolved.","C0883":"Same king+rook joint finite mate against exact opposing king+two bishop/knight units without pawns/majors. General imbalances unresolved.","C0307":"Opposite-color bishop pair with complete joint-removal necessity AND separately replacing EACH bishop with equal-nominal knight fails full same-horizon mate policy. General bishop-pair advantage unresolved.","C0882":"Same bishop-pair joint/removal/equal-value replacement gate against exact opposing NN or BN plus0..2pawns, no other nonking. General minor imbalance unresolved."};const seeds=[directory+'/PLAN.md',directory+'/EXPOSURE.md','package.json','research/AGENTS.md',
 'research/concepts/BUILD-FIRST.md',... (await readdir(directory+'/code')).filter(f=>f.endsWith('.mjs')).map(f=>directory+'/code/'+f)];
const hashes={},visit=async name=>{
 name=name.replaceAll('\\','/');if(hashes[name])return;
 if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata:'+name);
 const text=(await readFile(name,'utf8')).replaceAll('\r\n','\n');hashes[name]=createHash('sha256').update(text).digest('hex');
 if(/\.(mjs|js)$/.test(name))for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))
  await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
};
for(const seed of seeds)await visit(seed);
const record={schema:'coach-build-v1',experiment:'E110',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:["npm run research:coach-tests -- E110","npm run research:coach-tests -- E029","node --test '--test-name-pattern=disabled exact parent|strict controls|history mismatch' research/experiments/E109-causal-piece-conversion/code/pieces.test.mjs","node research/experiments/E110-joint-mating-coordination/code/pilot.mjs --out research/runs/E110/pilot","node research/experiments/E110-joint-mating-coordination/code/replay-saved.mjs research/runs/E110/pilot","npm run verify:source","git diff --check"],
 deferredChecks:['combined cumulative regression','combined independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));
