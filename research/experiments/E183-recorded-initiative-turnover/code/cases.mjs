export const families=['positive','quiet-current','nonchecking-prior','missing-history','empty-history','missing-prior-alternative','zero-budget','same-prior-alternative'];
export function makeCase(row,index){
  const input=structuredClone(row.input),options=structuredClone(row.options),family=families[index];
  if(!family)throw Error('Invalid case family');
  if(index===1){
    if(row.source==='tempo')input.move=row.color==='w'?'g5h5':'g4h4';
    else{input.move=input.defenseAlternative;input.defenseAlternative=row.input.move;}
  }
  if(index===2)options.priorAlternative=row.source==='tempo'?(row.color==='w'?'h6h5':'h3h4'):(row.color==='w'?'h5h4':'h4h5');
  if(index===3)delete input.history;
  if(index===4)input.history={fen:input.fen,moves:[]};
  if(index===5)delete options.priorAlternative;
  if(index===6)options.maxTurnoverNodes=0;
  if(index===7)options.priorAlternative=input.history.moves.at(-1);
  return{id:row.source+'-'+row.color+'-'+family,source:row.source,input,options,sourceRole:index===1?'quiet':'original',expected:{C0595:index===0,C0596:index===0,C0597:index===0&&row.source==='defense'}};
}
