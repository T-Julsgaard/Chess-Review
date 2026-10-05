import {queryKey,validateSearch} from '../../E008-human-quality-curves/code/queries.mjs';
export {queryKey};
export function validateQuery(r){
  validateSearch(r);if(r.key!==queryKey(r.configHash,r.history,r.restricted)||Object.keys(r.score).some(k=>!['cp','mate','wdl'].includes(k))||Object.hasOwn(r.score,'cp')===Object.hasOwn(r.score,'mate'))throw Error('Ambiguous or changed query binding');
  if(r.nodes!==Number(/\bnodes (\d+)/.exec(r.rawInfo)?.[1])||r.depth!==Number(/\bdepth (\d+)/.exec(r.rawInfo)?.[1])||r.finalNodes!==Number(/\bnodes (\d+)/.exec(r.finalSearchInfo)?.[1])||!Number.isInteger(r.finalNodes)||r.finalNodes<1||r.pv!==/\bpv (.+)$/.exec(r.rawInfo)?.[1])throw Error('Changed raw query diagnostics');return true;
}
