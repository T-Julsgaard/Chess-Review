// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E092-pawn-vulnerabilities-transformations';
const claims={C0205:'New enemy pawn behind every adjacent-file own pawn, with no legal capture and every legal advance permitting certified pawn loss through all immediate counters; stationary/long-term backwardness unresolved.',
 C0522:'Identify that new backward-pawn loss resource from complete legal advance inventories; general weakness evaluation unresolved.',
 C0225:'History-tracked same piece makes two certified profitable capture contacts against one unchanged pawn; repeated-pressure subset, sustained targeting unresolved.',
 C0521:'Select newly certified conditional actor-turn pawn captures by fixed minimum gain then UCI; no best-move/strategic target claim.',
 C0886:'Changed unequal pawn feature count vectors with unequal complete legal conditional pawn-loss target counts; strategic assessment unresolved.',
 C0893:'Own passer-count advantage and selected actual pawn has all-defense surviving queen route at declared own-push horizon; overall passer-strength comparison unresolved.',
 C0894:'Prior a-d/e-h pawn majority becomes a newly created passer with surviving queen route unavailable before at same bound; general majority conversion unresolved.',
 C0297:'Same witnessed majority-to-surviving-promotion-resource conversion; general transforming positional advantages unresolved.',
 C0905:'Same majority conversion with equal-bound failed pre-route and complete surviving after-route; broader duplicate occurrence scope unresolved.',
 C0537:'Pawn capture undoubles a file and newly creates passer whose same bounded queen route changes from failed to proven; general structure improvement unresolved.',
 C0050:'Same actual capture undoubling/passer/promotion transformation with finite material outcome; general easier/better position trade unresolved.',
 C0220:'Forward unchanged requested FRIEND-03 supported unchallengeable wedge proof of causal enemy-king destination denial; serious nonking-army cramping unresolved.'};const seeds=[directory+'/PLAN.md',directory+'/EXPOSURE.md','package.json','research/AGENTS.md',
 'research/concepts/BUILD-FIRST.md',... (await readdir(directory+'/code')).filter(f=>f.endsWith('.mjs')).map(f=>directory+'/code/'+f)];
const hashes={},visit=async name=>{
 name=name.replaceAll('\\','/');if(hashes[name])return;
 if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata:'+name);
 const text=(await readFile(name,'utf8')).replaceAll('\r\n','\n');hashes[name]=createHash('sha256').update(text).digest('hex');
 if(/\.(mjs|js)$/.test(name))for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))
  await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
};
for(const seed of seeds)await visit(seed);
const record={schema:'coach-build-v1',experiment:'E092',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:['npm run research:coach-tests -- E092 E091 E089 FRIEND-03',
 'node research/experiments/E092-pawn-vulnerabilities-transformations/code/pilot.mjs',
 'npm run verify:source','git diff --check'],
 deferredChecks:['combined cumulative regression','independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));



