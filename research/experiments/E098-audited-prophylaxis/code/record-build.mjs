// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E098-audited-prophylaxis';
const claims={"C0284":"Current quiet move refutes certified immediate enemy piece-capture gain and restore-only-mover reinstates it; opponent intended plan/general prophylaxis unknown.","C0532":"Same audited E027 material-loss prevention with E022 restored threat; broader strategic-plan prophylaxis unresolved.","C0770":"Same legal every-target-capture refutation and single-mover causal restoration; broader preventive scope unresolved.","C0902":"Same finite material-loss prophylaxis resource with independent source/counterfactual replay; deeper strategic generalization unresolved.","C0285":"Same current quiet preventive resource; primary move purpose/player design not inferred.","C0546":"Same removal/refutation of certified immediate piece-capture gain as bounded counterplay prevention; other counterplay may remain.","C0785":"Same complete audited prevention with actual king mover, both kings preserved in restored frame; no inferred intention.","C0786":"Same complete audited prevention with actual rook mover; broader preventive rook strategy unresolved.","C0787":"Same complete audited prevention with actual queen mover; broader preventive queen strategy unresolved.","C0305":"Current audited prevention AND new complete profitable unit-response pressure; two quantified changes, overall strategic goodness/intent unresolved.","C0304":"Recorded prior audited defense, legal enemy reply, actual new certified response pressure, protected unit still defended against every current capture; wider preparatory strategy unresolved.","C0299":"Current audited protection after prior own capture with positive recorded net material gain still present; bounded consolidation subset, optimal conversion unresolved."};const seeds=[directory+'/PLAN.md',directory+'/EXPOSURE.md','package.json','research/AGENTS.md',
 'research/concepts/BUILD-FIRST.md',... (await readdir(directory+'/code')).filter(f=>f.endsWith('.mjs')).map(f=>directory+'/code/'+f)];
const hashes={},visit=async name=>{
 name=name.replaceAll('\\','/');if(hashes[name])return;
 if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata:'+name);
 const text=(await readFile(name,'utf8')).replaceAll('\r\n','\n');hashes[name]=createHash('sha256').update(text).digest('hex');
 if(/\.(mjs|js)$/.test(name))for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))
  await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
};
for(const seed of seeds)await visit(seed);
const record={schema:'coach-build-v1',experiment:'E098',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:['npm run research:coach-tests -- E098 E097 E027 E096',
 'node research/experiments/E098-audited-prophylaxis/code/pilot.mjs',
 'npm run verify:source','git diff --check'],
 deferredChecks:['combined cumulative regression','independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));
