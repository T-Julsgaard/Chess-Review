// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E096-development-tempo-constraints';
const claims={"C0753":"Actual new legal unit capture contact with every response removing threat or permitting positive net gain through every immediate counter; bounded response pressure, attacker safety/full tempo value unresolved.","C0754":"Actual original opening unit move allows enemy new certified response threat on moved unit; current concession, necessity/optimal move comparison unresolved.","C0144":"Actual repeated original minor while others unmoved permits certified enemy response threat; bounded warning, no blanket avoidance recommendation.","C0145":"Early first original queen departure permits first enemy original minor development with certified queen response threat; bounded exposed-queen warning.","C0147":"First original minor development plus own developed-minor count lead and new certified profitable response threat; factual activity subset, strategic advantage unresolved.","C0148":"Same recorded first minor development/count lead with complete response-threat policy; temporary development facts, general time advantage unresolved.","C0585":"Same original-minor development lead AND certified response activity, never count-only advantage.","C0888":"Same unequal original developed-minor inventories with actual first development and profitable response threat; broader imbalance assessment unresolved.","C0774":"New first-original-enemy-minor departure would permit actual mover capture with positive net gain after deployment offset through every counter; conditional local loss constraint, safe/optimal development unresolved."};const seeds=[directory+'/PLAN.md',directory+'/EXPOSURE.md','package.json','research/AGENTS.md',
 'research/concepts/BUILD-FIRST.md',... (await readdir(directory+'/code')).filter(f=>f.endsWith('.mjs')).map(f=>directory+'/code/'+f)];
const hashes={},visit=async name=>{
 name=name.replaceAll('\\','/');if(hashes[name])return;
 if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata:'+name);
 const text=(await readFile(name,'utf8')).replaceAll('\r\n','\n');hashes[name]=createHash('sha256').update(text).digest('hex');
 if(/\.(mjs|js)$/.test(name))for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))
  await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
};
for(const seed of seeds)await visit(seed);
const record={schema:'coach-build-v1',experiment:'E096',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:['npm run research:coach-tests -- E096 E095 E088 E035',
 'node research/experiments/E096-development-tempo-constraints/code/pilot.mjs',
 'npm run verify:source','git diff --check'],
 deferredChecks:['combined cumulative regression','independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));
