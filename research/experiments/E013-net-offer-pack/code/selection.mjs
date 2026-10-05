import {Chess} from '../../../../lib/chess.js';
import {sha256} from '../../../data-policy.mjs';
const move=(b,m)=>b.move({from:m.slice(0,2),to:m.slice(2,4),promotion:m[4]}),uci=m=>m.from+m.to+(m.promotion||''),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const matches=(source,ply)=>({pointBand:source.playedExpected<.7?'0.5-0.7':'0.7-0.9',phase:ply<=20?'<=20':ply<=80?'21-80':'>80'});
export function eligible(r){return r.legalChoices>=2&&r.bestMate===null&&r.playedMate===null&&Number.isFinite(r.loss)&&r.loss>=0&&r.loss<=.02&&r.playedExpected>=.5&&r.playedExpected<=.9;}
function sourceOf(r){return{loss:r.loss,playedExpected:r.playedExpected,bestMate:r.bestMate,playedMate:r.playedMate,legalChoices:r.legalChoices,color:r.color};}
export function contextIndex(evidence){const rows=new Map();for(const side of evidence.rows){if(side.split!=='train')throw Error('Nontraining context');for(const r of side.contextMoves){const key=side.gameId+':'+r.ply;if(rows.has(key))throw Error('Duplicate context');rows.set(key,sourceOf(r));}}return rows;}
export function reconstruct(game,ply,source,stratum){
  if(game.split!=='train'||!eligible(source)||!Number.isInteger(ply)||ply<1||ply>game.moves.length)throw Error('Changed source role/filter');
  const b=new Chess(),fens=[b.fen()],san=[],history=game.moves.slice(0,ply-1);for(const m of history){san.push(move(b,m).san);fens.push(b.fen());}
  const legalMoves=b.moves({verbose:true}).map(uci).sort(),played=game.moves[ply-1],m=move(b,played);
  if(legalMoves.length<2||legalMoves.length!==source.legalChoices||b.isGameOver()||m.color!==source.color)throw Error('Changed source mechanics');
  const caseId='NR-'+sha256('E013-case-v1:'+game.id+':'+ply).slice(0,12),presentation={caseId,before:m.before,after:m.after,san:m.san,color:m.color,history:san,from:m.from,to:m.to};
  return{caseId,gameId:game.id,split:'train',ply,stratum,color:m.color,history,played,legalMoves,source,match:matches(source,ply),presentation,
    move:{before:m.before,after:m.after,color:m.color,from:m.from,to:m.to,piece:m.piece,captured:m.captured||null,promotion:m.promotion||null,prior:ply>=2?fens[ply-2]:null}};
}
export function select(dataset,evidence,excluded,board,{maxMs=300000}={}){
  const started=performance.now(),check=()=>{if(performance.now()-started>maxMs)throw Error('Selection compute cap exceeded');},rows=contextIndex(evidence),byId=new Map(dataset.map(g=>[g.id,g])),pool=[];let excludedGames=0,predicateCalls=0;
  for(const g of dataset){if(g.split!=='train')continue;if(excluded.has(g.id)){excludedGames++;continue;}const b=new Chess();for(let i=0;i<g.moves.length;i++){const r=rows.get(g.id+':'+(i+1));move(b,g.moves[i]);if(r&&eligible(r)&&!b.isGameOver())pool.push({gameId:g.id,ply:i+1,source:r,hash:sha256('E013-case-v1:'+g.id+':'+(i+1))});}check();}
  pool.sort((a,b)=>a.hash.localeCompare(b.hash));const used=new Set(),offers=[],controls=[];
  const inspect=c=>{check();const item=reconstruct(byId.get(c.gameId),c.ply,c.source,'pending');predicateCalls++;return{item,localOffer:board.isSacrifice(item.move)};};
  for(const c of pool){if(used.has(c.gameId))continue;const {item,localOffer}=inspect(c);if(localOffer){item.stratum='net-offer';offers.push(item);used.add(item.gameId);if(offers.length===8)break;}}
  if(offers.length===8)for(const offer of offers){let found=false;for(const c of pool){if(used.has(c.gameId)||!same(matches(c.source,c.ply),offer.match))continue;const {item,localOffer}=inspect(c);if(!localOffer){item.stratum='nonoffer';controls.push(item);used.add(item.gameId);found=true;break;}}if(!found)break;}
  const selected=[...offers,...controls].sort((a,b)=>sha256('E013-order-v1:'+a.caseId).localeCompare(sha256('E013-order-v1:'+b.caseId)));
  return{complete:offers.length===8&&controls.length===8,selected,diagnostics:{cheapCandidates:pool.length,excludedGames,predicateCalls,netOffersSelected:offers.length,controlsSelected:controls.length,completePoolNetOfferCount:null},elapsedMs:performance.now()-started};
}
export function verifyPack(pack,key,dataset,evidence,excluded,board){
  if(pack.schema!=='E013-review-pack-v1'||key.schema!=='E013-private-selection-v1'||pack.packId!==key.packId||pack.packId!==sha256(JSON.stringify(pack.cases))||pack.cases.length!==16||key.cases.length!==16||new Set(key.cases.map(c=>c.gameId)).size!==16||new Set(pack.cases.map(c=>c.caseId)).size!==16)throw Error('Changed pack identity/coverage');
  const rows=contextIndex(evidence),byId=new Map(dataset.map(g=>[g.id,g])),cores=[];
  for(const [i,c] of key.cases.entries()){
    if(excluded.has(c.gameId)||!['net-offer','nonoffer'].includes(c.stratum))throw Error('Excluded/unknown source');const source=rows.get(c.gameId+':'+c.ply),want=reconstruct(byId.get(c.gameId),c.ply,source,c.stratum),core=Object.fromEntries(Object.keys(want).map(k=>[k,c[k]]));
    if(!same(core,want)||!same(pack.cases[i],want.presentation)||Object.keys(pack.cases[i]).sort().join()!==['caseId','before','after','san','color','history','from','to'].sort().join())throw Error('Changed source/presentation/blinding');
    if(board.isSacrifice(want.move)!==(c.stratum==='net-offer'))throw Error('Changed local-offer stratum');cores.push(want);
  }
  const offers=cores.filter(c=>c.stratum==='net-offer'),controls=cores.filter(c=>c.stratum==='nonoffer');if(offers.length!==8||controls.length!==8)throw Error('Changed strata');
  for(const match of offers.map(c=>JSON.stringify(c.match)))if(offers.filter(c=>JSON.stringify(c.match)===match).length!==controls.filter(c=>JSON.stringify(c.match)===match).length)throw Error('Unmatched controls');return cores;
}
