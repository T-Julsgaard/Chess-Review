// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E090-opening-center-activity';
const claims={C0164:'Strict standard-start actual first pair e4/e5; opening origin only, current positional openness unresolved.',
 C0165:'Strict standard-start actual e4 followed by legal response other than e5; semi-open opening origin only.',
 C0166:'Strict standard-start actual d4/d5 first pair; closed opening origin only, current closure unresolved.',
 C0167:'Strict standard-start actual d4 and legal response other than d5; semi-closed opening origin only.',
 C0553:'New legal captures onto occupied d4/e4/d5/e5 on explicitly labelled actor-turn snapshot; empty-square or strategic control unresolved.',
 C0173:'Played nonpawn nonking occupies core square with new legal capture or actual check; general piece center valuation unresolved.',
 C0176:'d/e files pawn-free with new legal slider capture traversing or ending on core square; broader open-center strategy unresolved.',
 C0178:'New central pawn ram and all participating ram pawns have no legal moves on their respective turn snapshots; future transformation unresolved.',
 C0179:'New connected pair of own core pawns each has legal straight advance; safety and sustained mobile-center strength unresolved.'};const seeds=[directory+'/PLAN.md',directory+'/EXPOSURE.md','package.json','research/AGENTS.md',
 'research/concepts/BUILD-FIRST.md',... (await readdir(directory+'/code')).filter(f=>f.endsWith('.mjs')).map(f=>directory+'/code/'+f)];
const hashes={},visit=async name=>{
 name=name.replaceAll('\\','/');if(hashes[name])return;
 if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata:'+name);
 const text=(await readFile(name,'utf8')).replaceAll('\r\n','\n');hashes[name]=createHash('sha256').update(text).digest('hex');
 if(/\.(mjs|js)$/.test(name))for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))
  await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
};
for(const seed of seeds)await visit(seed);
const record={schema:'coach-build-v1',experiment:'E090',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:['npm run research:coach-tests -- E090 E089 E027',
 'node research/experiments/E090-opening-center-activity/code/pilot.mjs',
 'npm run verify:source','git diff --check'],
 deferredChecks:['combined cumulative regression','independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));

