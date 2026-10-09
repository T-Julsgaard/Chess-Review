// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E116-center-restraint-entry';
const claims={"C0139":"Moved controller directly denies central king entry; both legal fresh removed-controller and restored-controller frames permit identical enemy king moves. Specific causal influence, not central advantage.","C0181":"Complete legal opponent pawn inventory contains distinct-pawn continuations leaving distinct central c-f/ranks3-6 profiles. Legal unresolved choices, no strategic quality claim.","C0658":"Actual pawn advance newly blocks enemy pawn; legal blocker removal releases it and every actual opponent reply preserves both pawns. Current-turn restraint, not permanence.","C0718":"Same causal restraint plus one same-color bishop has legal profitable fixed-pawn capture after EVERY opponent reply, independently material-certified through every next response.","C0659":"Pawn advance vacates central square; one stationary nonpawn/nonking entrant has legal nonterminal entry after EVERY opponent reply and no immediate legal enemy capture there. Broader penetration/safety unresolved."};const seeds=[directory+'/PLAN.md',directory+'/EXPOSURE.md','package.json','research/AGENTS.md',
 'research/concepts/BUILD-FIRST.md','research/experiments/E115-opening-mate-offers/code/offers.test.mjs',... (await readdir(directory+'/code')).filter(f=>f.endsWith('.mjs')).map(f=>directory+'/code/'+f)];
const hashes={},visit=async name=>{
 name=name.replaceAll('\\','/');if(hashes[name])return;
 if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata:'+name);
 const text=(await readFile(name,'utf8')).replaceAll('\r\n','\n');hashes[name]=createHash('sha256').update(text).digest('hex');
 if(/\.(mjs|js)$/.test(name))for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))
  await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
};
for(const seed of seeds)await visit(seed);
const record={schema:'coach-build-v1',experiment:'E116',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:["npm run research:coach-tests -- E116","node --test '--test-name-pattern=disabled exact parent|strict controls|history mismatch' research/experiments/E115-opening-mate-offers/code/offers.test.mjs","node research/experiments/E116-center-restraint-entry/code/pilot.mjs","node research/experiments/E116-center-restraint-entry/code/replay-saved.mjs","npm run verify:source","git diff --check"],
 deferredChecks:['combined cumulative regression','combined independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));
