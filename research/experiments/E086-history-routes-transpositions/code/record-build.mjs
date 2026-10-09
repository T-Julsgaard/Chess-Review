// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E086-history-routes-transpositions';
const claims={C0156:'Two explicitly supplied legal routes from same start reach identical live full FEN with different move sequences; repetition histories separate.',
 C0762:'Same exact legal-route transposition; opening-book equivalence and broader clock-insensitive scope unresolved.',
 C0155:'Same move multiset in different legal order reaches exact live full FEN; no move-order advantage.',
 C0324:'Same tracked knight follows >=2moves/3distinct squares and directly checks at endpoint; maneuver usefulness unresolved.',
 C0335:'Same concrete checking knight route; strategic rerouting benefit unresolved.',
 C0704:'Same tracked multi-move checking knight route; broader endgame/strategic maneuvering unresolved.',
 C0336:'Same knight visits >=4distinct squares in >=3knight moves ending in direct check; broader tour/benefit scope unresolved.',
 C0402:'Same king follows >=3king moves/4distinct squares and captures at endpoint; safety and walk benefit unresolved.'};
const seeds=[directory+'/PLAN.md',directory+'/EXPOSURE.md','package.json','research/AGENTS.md',
 'research/concepts/BUILD-FIRST.md',... (await readdir(directory+'/code')).filter(f=>f.endsWith('.mjs')).map(f=>directory+'/code/'+f)];
const hashes={},visit=async name=>{
 name=name.replaceAll('\\','/');if(hashes[name])return;
 if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata:'+name);
 const text=(await readFile(name,'utf8')).replaceAll('\r\n','\n');hashes[name]=createHash('sha256').update(text).digest('hex');
 if(/\.(mjs|js)$/.test(name))for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))
  await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
};
for(const seed of seeds)await visit(seed);
const record={schema:'coach-build-v1',experiment:'E086',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:['npm run research:coach-tests -- E086 E085 (focused dependency checks)',
 'npm run research:coach-tests -- E086 (17 focused checks, independent identity/endpoint checker)',
 'node research/experiments/E086-history-routes-transpositions/code/pilot.mjs (12 synthetic cases, independent history/endpoint checks)',
 'npm run verify:source','git diff --check'],
 deferredChecks:['combined cumulative regression','independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));
