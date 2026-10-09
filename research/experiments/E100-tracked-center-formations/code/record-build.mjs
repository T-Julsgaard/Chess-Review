// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E100-tracked-center-formations';
const claims={"C0241":"Strict full-home history and tracked origins match own d4/e5 versus enemy c6/d5, with concrete legal central pawn capture or one-advance contact; Caro-Kann strategic value unresolved.","C0242":"Strict home history, tracked own c4/d4/e2 versus enemy c6/d5/e7 and legal central pawn activity; conservative Slav-type subset, transpositions and strategy unresolved.","C0243":"Strict home history, tracked own c4/d4 versus enemy d5/e6/c7 and legal central pawn activity; Queen Gambit-type subset only.","C0245":"Tracked own c-pawn captured enemy b/a-pawns then was captured by c8 bishop; current own d5/e4 versus c5/d6 with legal activity; Benko compensation and optimal play unresolved.","C0246":"Strict tracked own c4/d4/e4 versus d6/e5/g6/Bg7 plus legal central pawn activity; King Indian-type subset, attacking plans unresolved.","C0247":"Recorded c/d pawn and central knight exchange identities; own b-pawn c3,d4/e4,Ng1-f3 versus g6/Bg7 plus legal activity; Grunfeld center value unresolved.","C0249":"Recorded d/c exchange identities; own e4/Nd4/Nc3/Be3 versus d6/a6/Nf6 plus legal activity; Najdorf-type subset, optimal plans unresolved.","C0172":"Actual own d4/e4/d5/e5 pawn occupation combined with concrete legal central pawn capture or one-advance contact; sustained center quality unresolved.","C0174":"At least two own core-center pawns plus concrete legal central activity; classical center subset without superiority claim.","C0169":"Same two-pawn active classical center from full-home-board history within ten own turns; classical opening tendency and quality unresolved.","C0175":"Actual nonpawn mover outside core center newly enables legal capture of central enemy pawn in labelled next-actor-turn frame, with positive E022 all-immediate-counterreply proof; sustained influence unresolved.","C0168":"Same new positive remote central-pawn capture with recorded enemy central arrival, no own core pawn, full-home-board history within ten own turns; hypermodern opening subset, broader strategic intentions unresolved."};const seeds=[directory+'/PLAN.md',directory+'/EXPOSURE.md','package.json','research/AGENTS.md',
 'research/concepts/BUILD-FIRST.md',... (await readdir(directory+'/code')).filter(f=>f.endsWith('.mjs')).map(f=>directory+'/code/'+f)];
const hashes={},visit=async name=>{
 name=name.replaceAll('\\','/');if(hashes[name])return;
 if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata:'+name);
 const text=(await readFile(name,'utf8')).replaceAll('\r\n','\n');hashes[name]=createHash('sha256').update(text).digest('hex');
 if(/\.(mjs|js)$/.test(name))for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))
  await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
};
for(const seed of seeds)await visit(seed);
const record={schema:'coach-build-v1',experiment:'E100',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:['npm run research:coach-tests -- E100 E099 E094 E035 E022','npm run research:coach-tests -- E100',
 'node research/experiments/E100-tracked-center-formations/code/pilot.mjs --out research/runs/E100/history-normalized',
 'node research/experiments/E100-tracked-center-formations/code/replay-saved.mjs research/runs/E100/history-normalized',
 'npm run verify:source','git diff --check'],
 deferredChecks:['combined cumulative regression','independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));
