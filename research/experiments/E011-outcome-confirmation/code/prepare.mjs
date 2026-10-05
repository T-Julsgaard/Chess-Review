import {Chess} from '../../../../lib/chess.js';
import {sha256} from '../../../data-policy.mjs';
import {selection,queryKey,validateRoot,outcomePlies} from './queries.mjs';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),play=(b,m)=>b.move({from:m.slice(0,2),to:m.slice(2,4),promotion:m[4]});
export function prepare(evidence,dataset,configs){
  const games=dataset.filter(g=>g.split==='test');
  if(evidence.schema!=='E011-root-observations-v1'||!evidence.complete||games.length!==300||!same(evidence.games,games)||!same(evidence.engineConfigs,configs)||!same(evidence.protocol,{outcomePlies,roles:{test:300},budgets:[20000,80000]}))throw Error('Changed reserved cohort/protocol');
  const hashes=Object.fromEntries(Object.entries(configs).map(([mode,c])=>[mode,sha256(JSON.stringify(c))]));
  if(!same(evidence.configHashes,hashes)||configs['20k'].majorVersion!==19||configs['20k'].budget.kind!=='nodes'||configs['20k'].budget.value!==20000||configs['80k'].budget.kind!=='nodes'||configs['80k'].budget.value!==80000||!same({...configs['80k'],budget:configs['20k'].budget},configs['20k']))throw Error('Wrong frozen search configuration');
  const want=selection(games),queries=new Map(),used=new Set(),contexts=new Map(),rows=[],exclusions=[],emptyGames=[];let lowMates=0,highMates=0;
  for(const r of evidence.searches){validateRoot(r);if(!Object.values(hashes).includes(r.configHash)||queries.has(r.key))throw Error('Unknown/duplicate root query');queries.set(r.key,r);}
  if(evidence.positions.length!==300)throw Error('Missing root panel games');
  function lookup(key,history,mode,fen){
    const r=queries.get(key);if(!r||key!==queryKey(hashes[mode],history,null)||r.configHash!==hashes[mode]||!same(r.history,history))throw Error('Root query/history/budget differs');
    if(contexts.has(key)&&contexts.get(key)!==fen)throw Error('Inconsistent root board');contexts.set(key,fen);used.add(key);return r.score;
  }
  for(let i=0;i<games.length;i++){
    const g=games[i],position=evidence.positions[i],expected=want[i];
    if(position.gameId!==g.id||position.split!=='test'||!same(position.roots.map(r=>({ply:r.ply,history:r.history})),expected.roots))throw Error('Changed outcome root selection');
    const board=new Chess(),boards=new Map(),needed=new Set(expected.roots.map(r=>r.ply));
    for(let ply=1;ply<=Math.max(...needed);ply++){if(needed.has(ply))boards.set(ply,{fen:board.fen(),color:board.turn()});play(board,g.moves[ply-1]);}
    const white=g.result==='1-0'?1:g.result==='0-1'?0:g.result==='1/2-1/2'?.5:null;if(white===null)throw Error('Unknown game point target');
    const eligible=[];
    for(const r of position.roots){
      const context=boards.get(r.ply),low=lookup(r.keys['20k'],r.history,'20k',context.fen),high=lookup(r.keys['80k'],r.history,'80k',context.fen),a=low.mate!=null,b=high.mate!=null;
      lowMates+=Number(a);highMates+=Number(b);if(a||b){exclusions.push({gameId:g.id,ply:r.ply,reason:'mate-at-either-budget',lowMate:a,highMate:b});continue;}
      const rating=g.players.find(p=>p.color===context.color)?.rating;if(!Number.isFinite(rating))throw Error('Missing diagnostic rating');
      eligible.push({gameId:g.id,split:'test',ply:r.ply,color:context.color,rating,target:context.color==='w'?white:1-white,scores:{'20k':low,'80k':high}});
    }
    if(!eligible.length)emptyGames.push(g.id);else rows.push(...eligible.map(r=>({...r,weight:1/eligible.length})));
  }
  if(used.size!==queries.size)throw Error('Unused injected root evidence');
  for(const [key,r] of queries){const board=new Chess(contexts.get(key));for(const m of r.pv.split(' '))play(board,m);}
  return{rows,exclusions,emptyGames,diagnostics:{registeredGames:300,coveredGames:300-emptyGames.length,retainedRoots:rows.length,mateUnion:exclusions.length,matesByBudget:{'20k':lowMates,'80k':highMates},uniqueQueries:queries.size,
    byBudget:Object.fromEntries(Object.entries(hashes).map(([mode,h])=>{const rs=evidence.searches.filter(r=>r.configHash===h);return[mode,{queries:rs.length,earlierExactScores:rs.filter(r=>r.rawInfo!==r.finalSearchInfo).length,exactRecoveries:rs.filter(r=>r.exactRecovery).length,selectedNodes:[Math.min(...rs.map(r=>r.nodes)),Math.max(...rs.map(r=>r.nodes))],finalNodes:[Math.min(...rs.map(r=>r.finalNodes)),Math.max(...rs.map(r=>r.finalNodes))]}];}))}};
}
