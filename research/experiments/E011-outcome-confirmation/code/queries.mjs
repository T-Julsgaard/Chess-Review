import {queryKey,validateSearch,outcomePlies} from '../../E008-human-quality-curves/code/queries.mjs';
export {queryKey,outcomePlies};
export function selection(games){
  if(!games.length||games.some(g=>g.split!=='test')||new Set(games.map(g=>g.id)).size!==games.length)throw Error('Confirmation requires distinct test-role games');
  return games.map(g=>({gameId:g.id,split:g.split,roots:outcomePlies.filter(p=>p<=g.moves.length).map(ply=>({ply,history:g.moves.slice(0,ply-1)}))}));
}
export function validateRoot(r){
  validateSearch(r);if(r.restricted!==null||r.key!==queryKey(r.configHash,r.history,null))throw Error('Unrestricted root binding differs');
  const keys=Object.keys(r.score);if(keys.some(k=>!['cp','mate','wdl'].includes(k))||Object.hasOwn(r.score,'cp')===Object.hasOwn(r.score,'mate'))throw Error('Ambiguous score fields');
  if(r.nodes!==Number(/\bnodes (\d+)/.exec(r.rawInfo)?.[1])||r.depth!==Number(/\bdepth (\d+)/.exec(r.rawInfo)?.[1])||r.finalNodes!==Number(/\bnodes (\d+)/.exec(r.finalSearchInfo)?.[1])||!Number.isInteger(r.finalNodes)||r.finalNodes<1||r.pv!==/\bpv (.+)$/.exec(r.rawInfo)?.[1])throw Error('Raw root diagnostics differ');return true;
}
