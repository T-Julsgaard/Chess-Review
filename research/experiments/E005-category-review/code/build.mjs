import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {Chess} from '../../../../lib/chess.js';
import {openResearchData,sha256} from '../../../data-policy.mjs';

const values={p:1,n:3,b:3,r:5,q:9,k:100};
const uci=move=>({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]});
export function caseCandidates(games,evidence){
  const byGame=new Map();
  for(const side of evidence.rows){
    if(side.split!=='train')throw Error('Nontraining side');
    if(!byGame.has(side.gameId))byGame.set(side.gameId,new Map());
    for(const row of side.contextMoves){
      if(byGame.get(side.gameId).has(row.ply))throw Error('Duplicate ply');
      byGame.get(side.gameId).set(row.ply,row);
    }
  }
  const pools={offer:[],loss:[],control:[]},excluded={mate:0,forced:0,terminal:0,unselected:0};
  for(const game of games){
    if(game.split!=='train')continue;
    const rows=byGame.get(game.id);if(!rows)continue;
    const chess=new Chess(),history=[];
    for(let i=0;i<game.moves.length;i++){
      const row=rows.get(i+1),before=chess.fen(),legal=chess.moves().length;
      if(row&&row.color!==chess.turn())throw Error('Color/ply mismatch');
      const played=chess.move(uci(game.moves[i]));if(!played)throw Error('Illegal source move');
      if(row){
        if(row.bestMate!==null)excluded.mate++;
        else if(legal<2)excluded.forced++;
        else if(chess.isGameOver())excluded.terminal++;
        else{
          if(!Number.isFinite(row.loss)||row.loss<0)throw Error('Invalid loss');
          const offered=chess.moves({verbose:true}).some(m=>m.to===played.to&&m.captured&&values[m.captured]>values[m.piece]);
          const stratum=row.loss<=.02?(offered?'offer':'control'):row.loss>=.10?'loss':null;
          if(stratum){
            const caseId='CR-'+sha256('E005-case-v1:'+game.id+':'+(i+1)).slice(0,12);
            pools[stratum].push({caseId,gameId:game.id,ply:i+1,stratum,loss:row.loss,offered,
              before,after:chess.fen(),san:played.san,color:played.color,history:history.slice(),from:played.from,to:played.to});
          }else excluded.unselected++;
        }
      }
      history.push(played.san);
    }
  }
  for(const pool of Object.values(pools))pool.sort((a,b)=>a.caseId.localeCompare(b.caseId));
  const selected=[],used=new Set();
  for(const stratum of ['offer','loss','control']){
    const chosen=[];
    for(const candidate of pools[stratum])if(!used.has(candidate.gameId)){chosen.push(candidate);used.add(candidate.gameId);if(chosen.length===8)break;}
    if(chosen.length!==8)throw Error('Insufficient distinct games for '+stratum);
    selected.push(...chosen);
  }
  selected.sort((a,b)=>sha256('E005-order-v1:'+a.caseId).localeCompare(sha256('E005-order-v1:'+b.caseId)));
  return{selected,counts:Object.fromEntries(Object.entries(pools).map(([k,v])=>[k,{positions:v.length,games:new Set(v.map(c=>c.gameId)).size}])),excluded};
}
export function blind(selected){return selected.map(({caseId,before,after,san,color,history,from,to})=>({caseId,before,after,san,color,history,from,to}));}
export function htmlFor(pack,template,script){
  const json=JSON.stringify(pack).replaceAll('<','\\u003c');
  return template.replace('<!--PACK-->', '<script id="pack" type="application/json">'+json+'</script>').replace('<!--APP-->', '<script>'+script+'</script>');
}
async function main(){
  if(process.argv.length>2)throw Error('Unknown argument');
  const access=await openResearchData(['D001'],{purpose:'examples'}),dataset=await access.readJson('tools/calibration/public/dataset.json.gz');
  const evidence=await access.readJson('tools/calibration/public/sf18-rating-evidence.json.gz'),selection=caseCandidates(dataset,evidence);
  const cases=blind(selection.selected),pack={schema:'E005-review-pack-v1',rubric:'v1',packId:sha256(JSON.stringify(cases)),cases};
  const template=await readFile(new URL('review.html',import.meta.url),'utf8'),script=await readFile(new URL('review.js',import.meta.url),'utf8');
  const html=htmlFor(pack,template,script),folder=new URL('../review/',import.meta.url),out=new URL('../evidence/',import.meta.url);
  await mkdir(folder,{recursive:true});await mkdir(out,{recursive:true});
  await writeFile(new URL('review.html',folder),html);await writeFile(new URL('cases.json',out),JSON.stringify(pack,null,2)+'\n');
  const key={schema:'E005-private-selection-v1',packId:pack.packId,counts:selection.counts,excluded:selection.excluded,
    cases:selection.selected.map(({caseId,gameId,ply,stratum,loss,offered})=>({caseId,gameId,ply,stratum,loss,offered,origin:access.gameOrigin(gameId)}))};
  await writeFile(new URL('selection-key.json',out),JSON.stringify(key,null,2)+'\n');
  const root=fileURLToPath(new URL('../../../../',import.meta.url));
  const run={schema:'research-run-v1',id:'E005-pack-v1',date:'2026-10-05',sourceRevision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim(),
    command:'node research/experiments/E005-category-review/code/build.mjs',environment:{node:process.version},dataEligibility:access.receipt,
    packId:pack.packId,engineSearches:0,reviewsReceived:0,evidenceMaturity:'instrument development; no human findings',
    codeSha256:Object.fromEntries(await Promise.all(['build.mjs','review.html','review.js'].map(async name=>[name,sha256(await readFile(new URL(name,import.meta.url)))]))),
    rubricSha256:sha256(await readFile(new URL('../rubric.md',import.meta.url))),outputs:{}};
  for(const name of ['cases.json','selection-key.json'])run.outputs['evidence/'+name]=sha256(await readFile(new URL(name,out)));
  run.outputs['review/review.html']=sha256(html);
  await writeFile(new URL('run.json',out),JSON.stringify(run,null,2)+'\n');
  console.log(JSON.stringify({cases:cases.length,packId:pack.packId,counts:selection.counts,excluded:selection.excluded,bytes:Buffer.byteLength(html)}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
