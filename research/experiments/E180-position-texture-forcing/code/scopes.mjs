export const scopes = {
  C0578: {family:'forcing',context:'20. Evaluation of a position',scope:'Complete same-horizon legal-root own-mate/enemy-mate choice contrast.'},
  C0962: {family:'forcing',context:'38. Chess terminology for position types',scope:'Complete same-horizon legal-root own-mate/enemy-mate choice contrast.'},
  C0584: {family:'forcing',context:'21. Initiative and dynamics',scope:'Actual checking all-defense immediate mate contrasted with same-unit quiet enemy mate.'},
  C0752: {family:'forcing',context:'30. Tempo and move-order concepts',scope:'Actual checking all-defense immediate mate contrasted with same-unit quiet enemy mate.'},
  C0586: {family:'forcing',context:'21. Initiative and dynamics',scope:'Actual checking all-defense immediate mate, independently of quiet losing alternatives.'},
  C0579: {family:'quiet',context:'20. Evaluation of a position',scope:'Live actual-after frame with no capture, promotion or check in any next two-ply continuation.'},
  C0965: {family:'quiet',context:'38. Chess terminology for position types',scope:'Live actual-after frame with no capture, promotion or check in any next two-ply continuation.'},
};
export const forcingIds=Object.keys(scopes).filter(id=>scopes[id].family==='forcing');
export const quietIds=Object.keys(scopes).filter(id=>scopes[id].family==='quiet');
export function validateIds(ids,family){if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||scopes[id]?.family!==family))throw Error('Unique supported '+family+' scope IDs required');}
export function decisions(ids,status,proof){return ids.map(id=>({id,context:scopes[id].context,scope:scopes[id].scope,available:status==='available',status,proof:status==='available'?proof:null}));}
