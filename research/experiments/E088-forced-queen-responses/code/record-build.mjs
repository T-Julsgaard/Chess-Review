// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E088-forced-queen-responses';
const claims={C0756:'New moved-piece legal queen threat: every actual reply removes its capture threat or allows certified positive net nominal gain from the threat root through every immediate counterreply; nonqueen tempo/deeper gain unresolved.',
 C0757:'Same bounded all-defense queen-response proof with at least one evasion and one certified loss branch; no globally won tempo.',
 C0376:'Two consecutive same-piece all-defense queen threats, actual tracked queen evasion in between; both complete bounded pressure trees proven.',
 C0850:'Existing E023 hanging-piece capture event reused unchanged and independently authenticated on actual full-history root/replies, no new label; broader tactical errors unresolved.'};
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
const record={schema:'coach-build-v1',experiment:'E088',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:['npm run research:coach-tests -- E088 E087 E022 (focused dependency checks)',
 'npm run research:coach-tests -- E088 (27 focused checks, independent all-defense material checker)',
 'node research/experiments/E088-forced-queen-responses/code/pilot.mjs (20 synthetic cases, independent all-defense queen pressure and parent proof reuse)',
 'npm run verify:source','git diff --check'],
 deferredChecks:['combined cumulative regression','independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));
