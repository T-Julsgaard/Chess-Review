import {Chess} from '../../../../lib/chess.js';
import {sha256} from '../../../data-policy.mjs';
import {cohort} from './cohort.mjs';
import {queryKey,validateQuery} from './queries.mjs';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function prepare(evidence,pack,key,dataset,policy){
  const selected=cohort(pack,key,dataset),games=selected.map(c=>dataset.find(g=>g.id===c.gameId));
  if(evidence.schema!=='E012-root-observations-v1'||!evidence.complete||evidence.packId!==pack.packId||evidence.policySha256!==sha256(JSON.stringify(policy))||!same(evidence.engineConfigs,policy.engineConfigs)||!same(evidence.configHashes,policy.configHashes)||!same(evidence.games,games)||evidence.positions.length!==24)throw Error('Changed/incomplete offer panel');
  const queries=new Map(),used=new Set(),fens=new Map();
  for(const r of evidence.searches){validateQuery(r);if(!Object.values(policy.configHashes).includes(r.configHash)||queries.has(r.key))throw Error('Unknown/duplicate query');queries.set(r.key,r);}
  function lookup(key,c,mode,restricted){const r=queries.get(key);if(!r||key!==queryKey(policy.configHashes[mode],c.history,restricted)||!same(r.history,c.history)||r.restricted!==restricted||r.configHash!==policy.configHashes[mode])throw Error('Changed query/history/budget/restriction');used.add(key);fens.set(key,c.move.before);return r.score;}
  const cases=selected.map((c,i)=>{const p=evidence.positions[i],core=Object.fromEntries(Object.keys(c).map(k=>[k,p[k]]));if(!same(core,c))throw Error('Changed case/history/board');
    const scores=Object.fromEntries(['20k','80k'].map(mode=>{const k=p.keys[mode];if(!k||!same(k.alternatives.map(r=>r.move),c.legalMoves))throw Error('Incomplete legal alternatives');return[mode,{root:lookup(k.rootKey,c,mode,null),alternatives:k.alternatives.map(r=>({move:r.move,score:lookup(r.key,c,mode,r.move)})),playedIndex:c.legalMoves.indexOf(c.played)}];}));return{...c,scores};});
  if(used.size!==queries.size)throw Error('Unused injected query');
  for(const [key,r] of queries){const board=new Chess(fens.get(key));for(const m of r.pv.split(' '))board.move({from:m.slice(0,2),to:m.slice(2,4),promotion:m[4]});}
  return{cases,diagnostics:{cases:24,uniqueGames:games.length,uniqueQueries:queries.size,legalAlternatives:cases.reduce((n,c)=>n+c.legalMoves.length,0),
    budgets:Object.fromEntries(Object.entries(policy.configHashes).map(([mode,h])=>{const rs=evidence.searches.filter(r=>r.configHash===h);return[mode,{queries:rs.length,earlierExactScores:rs.filter(r=>r.rawInfo!==r.finalSearchInfo).length,exactRecoveries:rs.filter(r=>r.exactRecovery).length,selectedNodes:[Math.min(...rs.map(r=>r.nodes)),Math.max(...rs.map(r=>r.nodes))],finalNodes:[Math.min(...rs.map(r=>r.finalNodes)),Math.max(...rs.map(r=>r.finalNodes))]}];}))}};
}
