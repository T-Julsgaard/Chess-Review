// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E097-promotion-race-restraint';
const claims={"C0647":"Own and rival passed pawns with all-defense surviving own-queen route within1..6own pushes and positive gain after next response; first promotion and optimal race outcome unresolved.","C0729":"Same complete legal queen-race resource, rival advances/promotions/checks covered; general queen-race strategy unresolved.","C0680":"Same positive race route when each side has rooks and only kings/pawns/rooks; broader rook races unresolved.","C0648":"Same rival-pawn race certificate with every selected surviving queen-promotion leaf giving actual check; general race strategy unresolved.","C0726":"Same future checking passed-pawn queen-route resource covering every legal defense; broad pawn-check tactics unresolved.","C0705":"Outside passer certified route against sole enemy nonpawn knight, or actual knight captures outside passed pawn with positive all-counterreply gain; broader knight-distance/theory unresolved.","C0783":"Actual nonking move removes every current legal enemy passed-pawn advance; before advances existed and deleting only moved unit restores one; immediate causal restraint, permanent prevention unresolved."};const seeds=[directory+'/PLAN.md',directory+'/EXPOSURE.md','package.json','research/AGENTS.md',
 'research/concepts/BUILD-FIRST.md',... (await readdir(directory+'/code')).filter(f=>f.endsWith('.mjs')).map(f=>directory+'/code/'+f)];
const hashes={},visit=async name=>{
 name=name.replaceAll('\\','/');if(hashes[name])return;
 if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata:'+name);
 const text=(await readFile(name,'utf8')).replaceAll('\r\n','\n');hashes[name]=createHash('sha256').update(text).digest('hex');
 if(/\.(mjs|js)$/.test(name))for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))
  await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
};
for(const seed of seeds)await visit(seed);
const record={schema:'coach-build-v1',experiment:'E097',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:['npm run research:coach-tests -- E097 E096 E037 E022',
 'node research/experiments/E097-promotion-race-restraint/code/pilot.mjs',
 'npm run verify:source','git diff --check'],
 deferredChecks:['combined cumulative regression','independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));
