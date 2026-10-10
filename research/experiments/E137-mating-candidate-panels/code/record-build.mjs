// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E137-mating-candidate-panels';
const claims={"C0138":"Compare every legal candidate under the same finite forced-mate objective with exact shorter-bound proofs or explicit unresolved state, no general positional or human-thinking inference.","C0137":"Complete shortest-mate candidate filter: every excluded move has a refutation at the best continuation bound, all tied shortest candidates retained; operational analysis tool, not observed thinking.","C0135":"Every legal defense to the actual forced mate is independently bounded, with all longest delaying replies identified under exact minimax mate distance; no general best-response assertion.","C0118":"Verified principal variation from actual successor chooses shortest mating moves and longest defenses, with every lower-bound/defender panel and actual mate endpoint retained; no engine-PV or nonmating claim."};const seeds=[directory+'/PLAN.md',directory+'/EXPOSURE.md','package.json','research/AGENTS.md',
 'research/concepts/BUILD-FIRST.md','research/experiments/E136-exact-mate-distance/code/distance.test.mjs',... (await readdir(directory+'/code')).filter(f=>f.endsWith('.mjs')).map(f=>directory+'/code/'+f)];
const hashes={},visit=async name=>{
 name=name.replaceAll('\\','/');if(hashes[name])return;
 if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata:'+name);
 const text=(await readFile(name,'utf8')).replaceAll('\r\n','\n');hashes[name]=createHash('sha256').update(text).digest('hex');
 if(/\.(mjs|js)$/.test(name))for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))
  await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
};
for(const seed of seeds)await visit(seed);
const record={schema:'coach-build-v1',experiment:'E137',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:["npm run research:coach-tests -- E137","node --test '--test-name-pattern=disabled exact parent|strict controls|history mismatch' research/experiments/E136-exact-mate-distance/code/distance.test.mjs","node research/experiments/E137-mating-candidate-panels/code/pilot.mjs","node research/experiments/E137-mating-candidate-panels/code/replay-saved.mjs","npm run verify:source","git diff --check"],
 deferredChecks:['combined cumulative regression','combined independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));
