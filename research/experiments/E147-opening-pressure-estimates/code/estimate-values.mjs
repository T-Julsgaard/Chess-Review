// Numerical rule only; synthetic inputs here are never engine observations.
export function estimateValues(initialWhite,currentActor,actor){
  if(!['w','b'].includes(actor)||![initialWhite,currentActor].every(a=>Array.isArray(a)&&a.length===2&&a.every(v=>v===null||Number.isSafeInteger(v))))throw Error('Expected two finite CP observations per role');const currentWhite=currentActor.map(v=>v===null?null:actor==='w'?v:-v),status=[...initialWhite,...currentActor].includes(null)?'non-cp-estimate':'observed';return{initialWhite,currentActor,currentWhite,status,favorable:status==='observed'&&currentActor.every(cp=>cp>=100),equalized:status==='observed'&&actor==='b'&&initialWhite.every((cp,i)=>cp>=15&&Math.abs(currentWhite[i])<=30&&cp-currentWhite[i]>=15)};
}
