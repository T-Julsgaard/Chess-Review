// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E130-castling-pawn-delays';
const claims={"C0141":"Early legal castling removes every immediate enemy mate while a legal quiet pawn delay preserves a pre-existing mate; standard-start history within20 prior plies. Broader opening advice unresolved.","C0143":"Opening quiet pawn delay preserves a pre-existing immediate mate, including pawn restoration, while a legal castle removes all immediate mates; complete alternative inventories. Broader strategic necessity unresolved.","C0856":"Same full-inventory avoidable pre-existing mate pawn-delay warning without asserting opening history, global move quality or absence of other pawn purposes."};const seeds=[directory+'/PLAN.md',directory+'/EXPOSURE.md','package.json','research/AGENTS.md',
 'research/concepts/BUILD-FIRST.md','research/experiments/E129-knight-tempo-parity/code/knight.test.mjs',... (await readdir(directory+'/code')).filter(f=>f.endsWith('.mjs')).map(f=>directory+'/code/'+f)];
const hashes={},visit=async name=>{
 name=name.replaceAll('\\','/');if(hashes[name])return;
 if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata:'+name);
 const text=(await readFile(name,'utf8')).replaceAll('\r\n','\n');hashes[name]=createHash('sha256').update(text).digest('hex');
 if(/\.(mjs|js)$/.test(name))for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))
  await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
};
for(const seed of seeds)await visit(seed);
const record={schema:'coach-build-v1',experiment:'E130',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:["npm run research:coach-tests -- E130","node --test '--test-name-pattern=disabled exact parent|strict controls|history mismatch' research/experiments/E129-knight-tempo-parity/code/knight.test.mjs","node research/experiments/E130-castling-pawn-delays/code/pilot.mjs","node research/experiments/E130-castling-pawn-delays/code/replay-saved.mjs","npm run verify:source","git diff --check"],
 deferredChecks:['combined cumulative regression','combined independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));
