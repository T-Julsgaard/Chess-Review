// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E133-central-position-types';
const claims={"C0959":"Open central pawn structure: current d/e files contain no pawns; complete legal slider paths retained without claiming activity, advantage or whole-position openness.","C0960":"Closed central pawn structure: both d/e files have opposing adjacent pawn locks and every central pawn is forward-blocked by an enemy pawn; captures may still open structure.","C0961":"Split semi-open central structure: d/e files each contain pawns of only one color, with opposite colors across files, giving each side a different semi-open central file; residual mixed positions abstain.","C0975":"Actual side to move has a live legal quiet central pawn advance yielding closed structure and a live legal central pawn capture yielding open or split semi-open structure; complete successor inventory and explicit finite choices, no universal fluid-position taxonomy."};const seeds=[directory+'/PLAN.md',directory+'/EXPOSURE.md','package.json','research/AGENTS.md',
 'research/concepts/BUILD-FIRST.md','research/experiments/E132-supported-outpost-challenges/code/outpost.test.mjs',... (await readdir(directory+'/code')).filter(f=>f.endsWith('.mjs')).map(f=>directory+'/code/'+f)];
const hashes={},visit=async name=>{
 name=name.replaceAll('\\','/');if(hashes[name])return;
 if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata:'+name);
 const text=(await readFile(name,'utf8')).replaceAll('\r\n','\n');hashes[name]=createHash('sha256').update(text).digest('hex');
 if(/\.(mjs|js)$/.test(name))for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))
  await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
};
for(const seed of seeds)await visit(seed);
const record={schema:'coach-build-v1',experiment:'E133',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:["npm run research:coach-tests -- E133","node --test '--test-name-pattern=disabled exact parent|strict controls|history mismatch' research/experiments/E132-supported-outpost-challenges/code/outpost.test.mjs","node research/experiments/E133-central-position-types/code/pilot.mjs","node research/experiments/E133-central-position-types/code/replay-saved.mjs","npm run verify:source","git diff --check"],
 deferredChecks:['combined cumulative regression','combined independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));
