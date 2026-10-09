// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E099-material-offers-exchange-history';
const claims={"C0452":"Recorded prior own capture gain remains; selected current unit acceptance returns positive net material while every immediate counterreply retains pre-gain nominal balance; purpose and conversion quality unresolved.","C0453":"Same recorded return with rook accepted by minor and exactly two-point net return no greater than prior gain; broader exchange-conversion strategy unresolved.","C0036":"Recorded enemy rook captured own minor; played move captures that same rook and E022 all-immediate-reply certificate retains at least two net points across both plies; broader strategic exchange gain unresolved.","C0044":"At least four consecutive recorded captures including two identity-bound recapture pairs on distinct squares with exact nominal ledger; mass-exchange value unresolved.","C0091":"Actual moved-unit offer has legal identified acceptance with positive net loss through every immediate counterreply; longer-term nonrecovery and deliberate sacrifice unknown.","C0472":"Recorded last enemy move has independently certified net-loss unit acceptance; current move independently offers own unit with positive immediate net loss; intent and attack compensation unresolved.","C0679":"Actual rook captures pawn and selected legal capture of that rook leaves positive net loss through every immediate counterreply; forced acceptance or compensation unresolved.","C0694":"Same bishop records two pawn captures separated by actual enemy reply; selected acceptance loses material relative to pre-pair position through every immediate counterreply, including intervening gains/losses; strategic compensation unresolved."};const seeds=[directory+'/PLAN.md',directory+'/EXPOSURE.md','package.json','research/AGENTS.md',
 'research/concepts/BUILD-FIRST.md',... (await readdir(directory+'/code')).filter(f=>f.endsWith('.mjs')).map(f=>directory+'/code/'+f)];
const hashes={},visit=async name=>{
 name=name.replaceAll('\\','/');if(hashes[name])return;
 if(name.startsWith('../')||/^(research\/(datasets|runs)\/)|\/evidence\//.test(name))throw Error('Not source metadata:'+name);
 const text=(await readFile(name,'utf8')).replaceAll('\r\n','\n');hashes[name]=createHash('sha256').update(text).digest('hex');
 if(/\.(mjs|js)$/.test(name))for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))
  await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1])));
};
for(const seed of seeds)await visit(seed);
const record={schema:'coach-build-v1',experiment:'E099',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:['npm run research:coach-tests -- E099 E098 E022 E024',
 'node research/experiments/E099-material-offers-exchange-history/code/pilot.mjs --out research/runs/E099/normalized-zero',
 'node research/experiments/E099-material-offers-exchange-history/code/replay-saved.mjs research/runs/E099/normalized-zero',
 'npm run verify:source','git diff --check'],
 deferredChecks:['combined cumulative regression','independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));
