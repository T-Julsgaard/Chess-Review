// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E093-forcing-draw-resources';
const claims={C0365:'Actual check followed by finite all-defense checking policy to actor-side threefold claim at declared after-move ply horizon; infinite checking strategy unresolved.',
 C0466:'Same independently replayed checking-to-actor-claim policy with complete legal histories; broader defensive occurrence scope unresolved.',
 C0723:'Same finite all-defense perpetual-check resource; complete checks/replies/actor-side repetition keys, not observed cycle only.',
 C0949:'Checking tactic forcing actor repetition claim within1..9further plies against all legal defenses; general perpetual tactics unresolved.',
 C0465:'Same checking-draw strategy from strict pre-move nominal deficit; bounded checking-fortress subset, static/enduring fortress unresolved.',
 C0625:'Same nominal-deficit all-defense checking fortress resource; general endgame fortress theory unresolved.',
 C0735:'Same full legal checking-to-actor-claim policy despite nominal deficit; broader perpetual-check fortress scope unresolved.',
 C0950:'Same finite checking fortress tactic with declared deficit and every enemy defense retained; nonchecking/static fortress tactics unresolved.',
 C0982:'Same current checking-fortress resource under nominal deficit; full fortress-position evaluation and optimal outcome unresolved.',
 C0827:'Available certified actor repetition or own-stalemate resource after played move; no player intention or optimal draw-choice inference.',
 C0468:'Nonking positive-cost unit offer, including EP victim identity, with all-defense finite actor-stalemate policy; stronger than existing conditional resource, no losing-position assessment.',
 C0626:'Same full legal forced-own-stalemate resource; broader draw and longer horizon unresolved.',
 C0948:'Same all-defense finite own-stalemate tactic, never assumed offer acceptance; original conditional accepted evidence unchanged.'};const seeds=[directory+'/PLAN.md',directory+'/EXPOSURE.md','package.json','research/AGENTS.md',
 'research/concepts/BUILD-FIRST.md',... (await readdir(directory+'/code')).filter(f=>f.endsWith('.mjs')).map(f=>directory+'/code/'+f)];
const hashes={},visit=async name=>{
 name=name.replaceAll('\\','/');if(hashes[name])return;
 if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata:'+name);
 const text=(await readFile(name,'utf8')).replaceAll('\r\n','\n');hashes[name]=createHash('sha256').update(text).digest('hex');
 if(/\.(mjs|js)$/.test(name))for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))
  await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
};
for(const seed of seeds)await visit(seed);
const record={schema:'coach-build-v1',experiment:'E093',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:['npm run research:coach-tests -- E093 E092 E024',
 'node research/experiments/E093-forcing-draw-resources/code/pilot.mjs',
 'npm run verify:source','git diff --check'],
 deferredChecks:['combined cumulative regression','independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));




