// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E107-causal-material-mating-value';
const claims={"C0030":"Complete finite actor-mate policy contrasted with a strictly higher signed nominal material legal alternative and its complete failed actor-mate policy at same horizon. Nominal material versus concrete outcome only; broad positional evaluation unresolved.","C0547":"Same exact material/outcome contrast and complete legal inventories, not arithmetic alone or global material heuristic.","C0031":"Same full mate/material contrast with different non-pawn army multisets; outcome-backed imbalance example only, other combinations and general positional value unresolved.","C0880":"Same differing-army mate/material contrast for strategic-imbalance occurrence; no inferred generic piece values or whole strategic imbalance solution.","C0581":"Same differing non-pawn army and finite mate/material contrast. Concrete imbalanced position outcome, broader positional imbalances unresolved.","C0420":"Actual post-move negative signed nominal balance and complete actor mating policy against every legal defense at fixed0..4ply bound. Nonmating attacks and general sacrifice quality unresolved.","C0591":"Actual material deficit, full actor mate and complete failed opposing-mate policy at same actual state/horizon; concrete king outcome over nominal material, no global tradeoff scores.","C0889":"Complete positive actor mate and complete negative opponent mate policy on full actual history at identical bound; asymmetric finite king outcome, no broad safety heuristic.","C0033":"Full actual actor mate; removing one own nonking unit makes that mate goal fail, removing another equal-nominal-value unit retains mate. Explicit legal fresh-history post-clock counterframes; causal differential finite usefulness, no legal disappearance or numerical positional prices."};const seeds=[directory+'/PLAN.md',directory+'/EXPOSURE.md','package.json','research/AGENTS.md',
 'research/concepts/BUILD-FIRST.md',... (await readdir(directory+'/code')).filter(f=>f.endsWith('.mjs')).map(f=>directory+'/code/'+f)];
const hashes={},visit=async name=>{
 name=name.replaceAll('\\','/');if(hashes[name])return;
 if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata:'+name);
 const text=(await readFile(name,'utf8')).replaceAll('\r\n','\n');hashes[name]=createHash('sha256').update(text).digest('hex');
 if(/\.(mjs|js)$/.test(name))for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))
  await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
};
for(const seed of seeds)await visit(seed);
const record={schema:'coach-build-v1',experiment:'E107',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:["npm run research:coach-tests -- E107","npm run research:coach-tests -- E029 E106","node research/experiments/E107-causal-material-mating-value/code/pilot.mjs --out research/runs/E107/rights-guard","node research/experiments/E107-causal-material-mating-value/code/replay-saved.mjs research/runs/E107/rights-guard","npm run verify:source","git diff --check"],
 deferredChecks:['combined cumulative regression','combined independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));
