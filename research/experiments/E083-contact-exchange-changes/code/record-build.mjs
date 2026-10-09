// Research source dependency fingerprints; never reads game or evidence contents.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const directory='research/experiments/E083-contact-exchange-changes';
const claims={C0057:'At least two newly created moved-piece legal capture contacts; no gain or usefulness inference.',
 C0405:'New legal contact with a target on files f-h; not a successful kingside attack.',
 C0406:'New legal contact with a target on files a-c; not a successful queenside attack.',
 C0407:'New legal contact with a target on files d-e; not a successful central attack.',
 C0430:'New legal capture contact on a dark square; no color-complex attack strength.',
 C0431:'New legal capture contact on a light square; no color-complex attack strength.',
 C0432:'New legal contact with enemy pawn on f7/f2 in actor-turn snapshot.',
 C0433:'New legal contact with enemy pawn on h7/h2 in actor-turn snapshot.',
 C0434:'New legal contact with enemy pawn on g7/g2 in actor-turn snapshot.',
 C0450:'Immediate history-confirmed recapture exchanges the piece checking the actor king; other attackers unresolved.',
 C0451:'Immediate history-confirmed queen-for-queen captures; no favorable-trade judgment.',
 C0464:'Recorded two-capture exchange decreases total non-pawn piece count; strategic simplification unresolved.',
 C0630:'Recorded immediate reciprocal exchange removes pieces from both armies; broader liquidation unresolved.',
 C0631:'Such an exchange leaves only kings, pawns and optional rooks; favorable ending unresolved.',
 C0540:'Actual legal move changes complete pawn-square inventory, including capture/EP/promotion.',
 C0526:'Actual pawn advance from a region with greater own pawn count; success and passed-pawn benefit unresolved.',
 C0527:'Actual pawn advance ends on files f-h; space/attack benefit unresolved.',
 C0528:'Actual pawn advance ends on files a-c; space/attack benefit unresolved.',
 C0529:'Actual pawn advance ends on files d-e; center-control benefit unresolved.'};
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
const record={schema:'coach-build-v1',experiment:'E083',stage:'code-ready',claims:Object.entries(claims).map(([id,scope])=>({id,scope})),
 inputHashes:Object.fromEntries(Object.entries(hashes).sort()),focusedChecks:['npm run research:coach-tests -- E083 E082 (25.5 seconds)',
 'npm run research:coach-tests -- E083 (39 focused checks, 8.3 seconds, final witness checker)',
 'node research/experiments/E083-contact-exchange-changes/code/pilot.mjs (33 cases, 21 witnesses, 4 expected errors)',
 'npm run verify:source','git diff --check'],
 deferredChecks:['combined cumulative regression','independent complete saved semantic replay','interaction/priority/history/budget matrix',
 'exact main/repeat/initially clean reproductions at combined freeze','original-occurrence scope audit','real-game precision and usefulness']};
await writeFile(directory+'/build.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({claims:record.claims.length,sourceInputs:Object.keys(hashes).length}));
