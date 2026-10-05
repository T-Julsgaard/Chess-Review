import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {Chess} from '../../../../lib/chess.js';
import {openResearchData,sha256} from '../../../data-policy.mjs';

const access=await openResearchData(['D001'],{purpose:'reuse'}),base='research/experiments/E005-category-review/';
const pack=await access.readJson(base+'evidence/cases.json'),key=await access.readJson(base+'evidence/selection-key.json');
const run=await access.readJson(base+'evidence/run.json'),html=await readFile(new URL('../review/review.html',import.meta.url),'utf8');
for(const [name,digest]of Object.entries(run.outputs))if(sha256(await readFile(new URL('../'+name,import.meta.url)))!==digest)throw Error('Output hash differs');
const embedded=JSON.parse(html.match(/<script id="pack" type="application\/json">([\s\S]*?)<\/script>/)[1]);
if(JSON.stringify(embedded)!==JSON.stringify(pack)||sha256(JSON.stringify(pack.cases))!==pack.packId||key.packId!==pack.packId)throw Error('Pack identity differs');
if(pack.cases.length!==24||new Set(key.cases.map(c=>c.gameId)).size!==24||new Set(pack.cases.map(c=>c.caseId)).size!==24)throw Error('Coverage differs');
const games=await access.readJson('tools/calibration/public/dataset.json.gz'),byId=new Map(games.map(g=>[g.id,g]));
for(const item of pack.cases){
  if(Object.keys(item).sort().join()!==['caseId','before','after','san','color','history','from','to'].sort().join())throw Error('Unblinded fields');
  const privateCase=key.cases.find(c=>c.caseId===item.caseId),game=byId.get(privateCase?.gameId);
  if(!game||game.split!=='train'||sha256('E005-case-v1:'+game.id+':'+privateCase.ply).slice(0,12)!==item.caseId.slice(3))throw Error('Case source differs');
  const chess=new Chess(),history=[];
  for(let i=0;i<privateCase.ply-1;i++)history.push(chess.move({from:game.moves[i].slice(0,2),to:game.moves[i].slice(2,4),promotion:game.moves[i][4]}).san);
  if(chess.fen()!==item.before||JSON.stringify(history)!==JSON.stringify(item.history)||chess.moves().length<2)throw Error('History or legal choice differs');
  const raw=game.moves[privateCase.ply-1],played=chess.move({from:raw.slice(0,2),to:raw.slice(2,4),promotion:raw[4]});
  if(chess.fen()!==item.after||played.san!==item.san||played.color!==item.color||chess.isGameOver())throw Error('Played move differs');
  if(JSON.stringify(access.gameOrigin(game.id))!==JSON.stringify(privateCase.origin))throw Error('Origin differs');
}
const result={schema:'E005-pack-verification-v1',passed:true,cases:24,uniqueTrainingGames:24,legalHistoryBindings:true,blindedFields:true,
  reviewsReceived:0,packId:pack.packId,verifiedOutputHashes:run.outputs,dataEligibility:access.receipt,verifierSha256:sha256(await readFile(fileURLToPath(import.meta.url)))};
await writeFile(new URL('../evidence/verification.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:true,cases:24,legalHistoryBindings:true,blindedFields:true,reviewsReceived:0}));
