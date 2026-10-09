// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E094-history-pawn-formations-breaks';
const claims={"C0244":"History-bound original c/e pawn Modern-Benoni-type formation and legal next-turn pawn contact; broader strategic plans unresolved.","C0250":"History-bound Dragon-type original pawn exchange and fianchetto setup with legal contact; reversed shapes explicitly marked, strategic value unresolved.","C0251":"Recorded original unmoved c-pawn Closed-Sicilian-type setup with legal activity, no ECO or broader plans inferred.","C0252":"Recorded original pawns and home bishops Botvinnik-type formation with legal activity; long-term hole/plan assessment unresolved.","C0253":"Recorded e/d/c exchange Panov-type formation and actual legal c-pawn capture; IQP strategy unresolved.","C0567":"New legal noncapturing pawn advance then hypothetical next-actor-turn new pawn capture contact; safe/forcing breakthrough unresolved.","C0524":"Actual nonpawn move newly enables legal advance/contact; preparation fact only, safety and necessity unresolved.","C0772":"Move removes enemy legal advance/contact, deleting only actual mover restores same lever; artificial local causality, permanent prevention unresolved.","C0855":"Actual lever advance permits enemy capture of moved pawn with positive net nominal gain through all immediate counters; conditional warning, engine move grade unresolved."};const seeds=[directory+'/PLAN.md',directory+'/EXPOSURE.md',directory+'/SOURCES.md','package.json','research/AGENTS.md',
 'research/concepts/BUILD-FIRST.md',... (await readdir(directory+'/code')).filter(f=>f.endsWith('.mjs')).map(f=>directory+'/code/'+f)];
const hashes={},visit=async name=>{
 name=name.replaceAll('\\','/');if(hashes[name])return;
 if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata:'+name);
 const text=(await readFile(name,'utf8')).replaceAll('\r\n','\n');hashes[name]=createHash('sha256').update(text).digest('hex');
 if(/\.(mjs|js)$/.test(name))for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))
  await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
};
for(const seed of seeds)await visit(seed);
const record={schema:'coach-build-v1',experiment:'E094',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:['npm run research:coach-tests -- E094 E093 E024 E022',
 'node research/experiments/E094-history-pawn-formations-breaks/code/pilot.mjs',
 'npm run verify:source','git diff --check'],
 deferredChecks:['combined cumulative regression','independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));
