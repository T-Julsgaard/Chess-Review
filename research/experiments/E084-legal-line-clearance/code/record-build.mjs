// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E084-legal-line-clearance';
const claims={C0077:'Actual friendly move clears a stationary slider line with new legal capture contact or actual check; quiet strategic clearance unresolved.',
 C0078:'Same causal cleared ray; no winning-tactic or intent inference.',
 C0415:'New witnessed stationary-slider attack line after legal blocker move; successful attack unresolved.',
 C0436:'Actual new line with legal capture/check witness; not general opening usefulness.',
 C0437:'Such causal attack ray on a file; general file-opening strategy unresolved.',
 C0110:'New causal slider alignment supported by legal capture or actual check; geometric placement alone excluded.',
 C0111:'New actual stationary-slider check ray to enemy king, complete legal evasions retained.',
 C0112:'Such queen-to-king actual checking ray; no winning attack inference.',
 C0113:'New stationary-rook legal capture contact with enemy queen after friendly blocker moves; not guaranteed gain.',
 C0930:'Causal cleared line with legal target contact/check only; successful line tactic unresolved.',
 C0931:'Same witnessed causal alignment; winning alignment tactic unresolved.'};
const seeds=[directory+'/PLAN.md',directory+'/EXPOSURE.md','package.json','research/AGENTS.md',
 'research/concepts/BUILD-FIRST.md',... (await readdir(directory+'/code')).filter(f=>f.endsWith('.mjs')).map(f=>directory+'/code/'+f)];
const hashes={},visit=async name=>{
 name=name.replaceAll('\\','/');if(hashes[name])return;
 if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata:'+name);
 const text=(await readFile(name,'utf8')).replaceAll('\r\n','\n');hashes[name]=createHash('sha256').update(text).digest('hex');
 if(/\.(mjs|js)$/.test(name))for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))
  await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
};
for(const seed of seeds)await visit(seed);
const record={schema:'coach-build-v1',experiment:'E084',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:['npm run research:coach-tests -- E084 E083 (focused dependency checks)',
 'npm run research:coach-tests -- E084 (22 focused checks, independent ray/reply checker)',
 'node research/experiments/E084-legal-line-clearance/code/pilot.mjs (18 synthetic cases, independent ray/reply checks)',
 'npm run verify:source','git diff --check'],
 deferredChecks:['combined cumulative regression','independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));
