import {fixtures as old} from '../../E120-mating-move-order/code/fixtures.mjs';
export const fixtures=[];
for(let color=0;color<2;color++){
 const f=old[color],good={fen:f.fen,move:f.move,followup:f.orderFollowup,history:{fen:f.fen,moves:[]}},negative=old[2+color];
 fixtures.push({id:'checking-first-'+color,input:good,options:{enabled:true},expected:['C0768','C0776']},{id:'quiet-first-'+color,input:{...good,move:good.followup,followup:good.move},options:{enabled:true},expected:['C0771']},{id:'both-orders-win-'+color,input:{fen:negative.fen,move:negative.move,followup:negative.orderFollowup,history:{fen:negative.fen,moves:[]}},options:{enabled:true},expected:[]});
}
