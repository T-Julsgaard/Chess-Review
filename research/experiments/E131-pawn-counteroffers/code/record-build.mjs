// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E131-pawn-counteroffers';
const claims={"C0160":"Standard-start opening quiet pawn push permits a legal enemy pawn acceptance with no immediate legal recapture of the accepting pawn; complete branches and nominal balance retained. Soundness, stationary and immediately recapturable offers unresolved.","C0161":"Actual legal pawn capture exactly accepts a recorded eligible preceding opening pawn offer; history-bound full immediate replies establish no immediate recapture, not net material gain or compensation.","C0162":"Actual move accepts none of the eligible recorded preceding pawn offers; no refusal intention or strategic judgment.","C0163":"Actual quiet pawn push offers its pawn while leaving an incoming eligible pawn offer untaken and the same acceptance still eligible in legal fresh after-placement actor-turn comparison. Both offers have full immediate-recapture inventories; broader countergambit taxonomy unresolved."};const seeds=[directory+'/PLAN.md',directory+'/EXPOSURE.md','package.json','research/AGENTS.md',
 'research/concepts/BUILD-FIRST.md','research/experiments/E130-castling-pawn-delays/code/timing.test.mjs',... (await readdir(directory+'/code')).filter(f=>f.endsWith('.mjs')).map(f=>directory+'/code/'+f)];
const hashes={},visit=async name=>{
 name=name.replaceAll('\\','/');if(hashes[name])return;
 if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata:'+name);
 const text=(await readFile(name,'utf8')).replaceAll('\r\n','\n');hashes[name]=createHash('sha256').update(text).digest('hex');
 if(/\.(mjs|js)$/.test(name))for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))
  await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
};
for(const seed of seeds)await visit(seed);
const record={schema:'coach-build-v1',experiment:'E131',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:["npm run research:coach-tests -- E131","node --test '--test-name-pattern=disabled exact parent|strict controls|history mismatch' research/experiments/E130-castling-pawn-delays/code/timing.test.mjs","node research/experiments/E131-pawn-counteroffers/code/pilot.mjs","node research/experiments/E131-pawn-counteroffers/code/replay-saved.mjs","npm run verify:source","git diff --check"],
 deferredChecks:['combined cumulative regression','combined independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));
