// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E104-defensive-mate-choice-policies';
const claims={"C0470":"Every legal root move compared with complete E029 enemy-mate policy or defending counterpolicy at same finite0..3ply bound; actual live move is unique avoiding forced enemy mate while every other permits it. General only-defense/best-move status beyond bound unresolved.","C0458":"Actual noncapturing king escape from root check has complete finite enemy-mate avoidance counterpolicy, while another legal king relocation permits certified forced enemy mate at same bound. Durable evacuation, other threats and global safety unresolved.","C0025":"Actual live move has complete finite enemy-mate avoidance counterpolicy while at least one legal alternative has certified enemy mate at same bound; all root alternatives retained. Relative bounded king vulnerability only; global safety/evaluation unresolved.","C0380":"Same complete full-history root-choice comparison and finite defending counterpolicy; actual choice avoids forced enemy mate where another legal choice permits it. Broader king safety remains unresolved.","C0548":"Same full alternative finite king-vulnerability comparison supplies actual evaluation context without an engine score or strategic safety judgment. Comprehensive positional king evaluation unresolved.","C0857":"Actual live move permits certified forced enemy mate at stated bound, while a legal alternative has complete finite defending counterpolicy; move-dependent worsening of bounded mate exposure. No engine-error category or global quality judgment."};const seeds=[directory+'/PLAN.md',directory+'/EXPOSURE.md','package.json','research/AGENTS.md',
 'research/concepts/BUILD-FIRST.md',... (await readdir(directory+'/code')).filter(f=>f.endsWith('.mjs')).map(f=>directory+'/code/'+f)];
const hashes={},visit=async name=>{
 name=name.replaceAll('\\','/');if(hashes[name])return;
 if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata:'+name);
 const text=(await readFile(name,'utf8')).replaceAll('\r\n','\n');hashes[name]=createHash('sha256').update(text).digest('hex');
 if(/\.(mjs|js)$/.test(name))for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))
  await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
};
for(const seed of seeds)await visit(seed);
const record={schema:'coach-build-v1',experiment:'E104',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:["npm run research:coach-tests -- E104 E029 E085 E095","node research/experiments/E104-defensive-mate-choice-policies/code/pilot.mjs --out research/runs/E104/pilot","node research/experiments/E104-defensive-mate-choice-policies/code/replay-saved.mjs research/runs/E104/pilot","npm run verify:source","git diff --check"],
 deferredChecks:['combined cumulative regression','combined independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));
