// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E095-mating-attacks-resources';
const claims={"C0408":"Actual move with complete all-legal-defense own-mate policy within declared0..5further plies; general king-attack strategy unresolved.","C0129":"Same positive complete mating sequence, including quiet choices and every defender reply; no reasonableness filter or general forcing evaluation.","C0412":"Same certified own-mate policy plus both recorded opposite-wing castles and current kings still at recorded destinations; broader opposite-side strategy unresolved.","C0417":"Pawn-cover capture with positive sacrifice cost and legal acceptance, every legal reply permits mate; broad shield destruction unresolved.","C0095":"Same quantified mating pawn-cover sacrifice, acceptance and refusal included when legal; no inferred intention or nonmating sacrifice value.","C0096":"Actual checking Bxh7/Bxh2 against g8/g1 home king, positive sacrifice cost/legal acceptance and full mating policy; general Greek Gift theory unresolved.","C0469":"Played positive actor-mate proof or draw threshold plus at least one legal alternative certified enemy-mate at same horizon; general optimal defense unresolved.","C0471":"Same positive defensive resource triggered by played capture or check; broader counterplay/material/draw resources unresolved."};const seeds=[directory+'/PLAN.md',directory+'/EXPOSURE.md','package.json','research/AGENTS.md',
 'research/concepts/BUILD-FIRST.md',... (await readdir(directory+'/code')).filter(f=>f.endsWith('.mjs')).map(f=>directory+'/code/'+f)];
const hashes={},visit=async name=>{
 name=name.replaceAll('\\','/');if(hashes[name])return;
 if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata:'+name);
 const text=(await readFile(name,'utf8')).replaceAll('\r\n','\n');hashes[name]=createHash('sha256').update(text).digest('hex');
 if(/\.(mjs|js)$/.test(name))for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))
  await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
};
for(const seed of seeds)await visit(seed);
const record={schema:'coach-build-v1',experiment:'E095',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:['npm run research:coach-tests -- E095 E094 E029 E030',
 'node research/experiments/E095-mating-attacks-resources/code/pilot.mjs',
 'npm run verify:source','git diff --check'],
 deferredChecks:['combined cumulative regression','independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));
