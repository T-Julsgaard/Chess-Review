// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E101-tactical-constraints-vulnerabilities';
const claims={"C0059":"Actual new ray to more-valuable nonking nonqueen target; every legal blocker off-line move permits slider capture with positive net gain through all immediate counterreplies; broader pin targets and quality unresolved.","C0063":"Actual new nonking front-first ray with higher-value front, certified profitable front capture and every legal front off-line move allowing positive rear capture through all immediate counterreplies; forced evacuation or all other defenses unresolved.","C0068":"New slider/blocker/enemy-target ray plus complete positive conditional off-line target-capture policy; direct capture through blocker remains illegal, broader strategic value unresolved.","C0126":"Actual noncapture/noncheck nonking move has all-defense capture policy with positive root-relative gain through all counters; original non-forcing characterization and purpose unresolved.","C0933":"Actual legal enemy capture has positive root-relative gain despite at least one legal recapture of capturer, every immediate actor response covered; deeper underprotection unresolved.","C0934":"Actual move newly pins own blocker to own king, removes formerly legal off-line mobility, and enemy capture has positive immediate net material proof; prior capture may already exist and intent unresolved.","C0104":"Selected actual enemy piece capture followed by ALL actor replies, chosen enemy captures, ALL actor counters maintains positive enemy gain from before played move; stronger four-ply subset, permanent profit unresolved.","C0105":"Played actual capture of geometrically undefended nonpawn victim with positive complete immediate material certificate; observed tactical opportunity only, general frequency principle unresolved.","C0109":"Played move newly allows certified root-relative positive enemy piece capture absent in mapped pre-enemy-turn snapshot; structural/piece placement cause in finite horizon, broader strategic vulnerability unresolved.","C0159":"Same new certified material loss in strict full-home opening history within ten own turns; observed early pitfall only, hidden opponent trap preparation unresolved."};const seeds=[directory+'/PLAN.md',directory+'/EXPOSURE.md','package.json','research/AGENTS.md',
 'research/concepts/BUILD-FIRST.md',... (await readdir(directory+'/code')).filter(f=>f.endsWith('.mjs')).map(f=>directory+'/code/'+f)];
const hashes={},visit=async name=>{
 name=name.replaceAll('\\','/');if(hashes[name])return;
 if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata:'+name);
 const text=(await readFile(name,'utf8')).replaceAll('\r\n','\n');hashes[name]=createHash('sha256').update(text).digest('hex');
 if(/\.(mjs|js)$/.test(name))for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))
  await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
};
for(const seed of seeds)await visit(seed);
const record={schema:'coach-build-v1',experiment:'E101',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:['npm run research:coach-tests -- E101 E100 E026 E022 E091 E035','npm run research:coach-tests -- E101',
 'node research/experiments/E101-tactical-constraints-vulnerabilities/code/pilot.mjs --out research/runs/E101/normalized-zero',
 'node research/experiments/E101-tactical-constraints-vulnerabilities/code/replay-saved.mjs research/runs/E101/normalized-zero',
 'npm run verify:source','git diff --check'],
 deferredChecks:['combined cumulative regression','independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));
