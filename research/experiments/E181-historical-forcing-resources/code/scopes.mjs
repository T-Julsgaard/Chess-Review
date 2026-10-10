export const scopes={
 C0583:{context:'21. Initiative and dynamics',scope:'Genuine recorded checks preserve a complete finite mating resource through current check or checkmate.'},
 C0594:{context:'21. Initiative and dynamics',scope:'Genuine recorded checks preserve a complete finite mating resource into a live checking continuation.'},
 C0598:{context:'21. Initiative and dynamics',scope:'Actual live check compels legal defensive replies under a complete actor-mating policy, independently of earlier continuity.'},
};
export const ids=Object.keys(scopes);
export function decisions(statuses,proofs={}){return ids.map(id=>({id,...scopes[id],available:statuses[id]==='available',status:statuses[id],proof:statuses[id]==='available'?proofs[id]:null}));}
export const sameStatus=s=>Object.fromEntries(ids.map(id=>[id,s]));
