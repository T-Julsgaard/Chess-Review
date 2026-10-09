// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E091-forced-material-sequences';
const claims={C0473:'Actual nonpawn capture with all-enemy-defense own-capture policy; every immediate counter leaves at most one nonpawn family and nonnegative root-relative material. Strategic liquidation desirability unresolved.',
 C0951:'Same finite all-defense tactical liquidation with complete chosen-capture/counter witnesses; longer combinations and winning endings unresolved.',
 C0956:'Threatened nonpawn retreats toward home rank without capture; every defense allows an own capture preserving strictly positive root-relative nominal gain through all counters. General tactical retreats unresolved.',
 C0957:'Previous recorded enemy capture caused loss; actual nonrecapture restores pre-loss nominal balance by all-defense capture policy through all immediate counters. Longer counter-combinations unresolved.',
 C0958:'Actual nonking check evasion followed by all-defense capture policy retaining pre-move material through all counters. Broader defensive combinations unresolved.',
 C0279:'Recorded material loss has certified all-defense recovery; one named legal quiet delay removes that bounded recovery. Positional and lasting compensation unresolved.',
 C0281:'Same finite material recovery resource unavailable after one named legal quiet delay; general urgency and nonmaterial temporary compensation unresolved.',
 C0865:'Actual nonpawn capture permits a positive E022 enemy capture whose minimum gain exceeds actor capture gain from pre-simplification root; nominal material loss warning only, strategic badness unresolved.'};const seeds=[directory+'/PLAN.md',directory+'/EXPOSURE.md','package.json','research/AGENTS.md',
 'research/concepts/BUILD-FIRST.md',... (await readdir(directory+'/code')).filter(f=>f.endsWith('.mjs')).map(f=>directory+'/code/'+f)];
const hashes={},visit=async name=>{
 name=name.replaceAll('\\','/');if(hashes[name])return;
 if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata:'+name);
 const text=(await readFile(name,'utf8')).replaceAll('\r\n','\n');hashes[name]=createHash('sha256').update(text).digest('hex');
 if(/\.(mjs|js)$/.test(name))for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))
  await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
};
for(const seed of seeds)await visit(seed);
const record={schema:'coach-build-v1',experiment:'E091',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:['npm run research:coach-tests -- E091 E090 E022',
 'node research/experiments/E091-forced-material-sequences/code/pilot.mjs',
 'npm run verify:source','git diff --check'],
 deferredChecks:['combined cumulative regression','independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));


