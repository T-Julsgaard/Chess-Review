import {Chess} from '../../../../lib/chess.js';
export function queryChecks(c,node,actor){
  if(!node.win)return false;
  if(node.kind==='mate')return c.isCheckmate()&&c.turn()!==actor;
  const own=c.turn()===actor;if(own&&node.kind!=='choice'||!own&&node.kind!=='all')return false;
  const branches=own?[{move:node.move,child:node.child}]:node.branches;
  return branches.length>0&&branches.every(b=>{c.move(b.move);try{return(!own||c.isCheck())&&queryChecks(c,b.child,actor);}finally{c.undo();}});
}
export function solvePrior(graph,actor,tick){
  const values=Array(graph.tree.length);
  for(let i=graph.tree.length-1;i>=0;i--){
    tick();const n=graph.tree[i];let win=n.kind==='mate'&&n.outcome===actor,checkingWin=win,rank=win?0:null;
    if(n.kind==='branch'){
      const own=n.turn===actor,children=n.edges.map(e=>values[e.child]);win=own?children.some(v=>v.win):children.every(v=>v.win);
      const eligible=n.edges.filter(e=>values[e.child].checkingWin&&(!own||new Chess(graph.tree[e.child].fen).isCheck()));
      checkingWin=own?eligible.length>0:eligible.length===n.edges.length;
      if(checkingWin)rank=1+(own?Math.min(...eligible.map(e=>values[e.child].rank)):Math.max(...eligible.map(e=>values[e.child].rank)));
    }
    values[i]={win,checkingWin,rank};
  }
  const policy=[];
  function walk(id){if(!values[id].checkingWin)return;const n=graph.tree[id],edges=n.edges.filter(e=>n.turn!==actor||values[e.child].checkingWin&&new Chess(graph.tree[e.child].fen).isCheck());policy.push({node:id,fen:n.fen,turn:n.turn,rank:values[id].rank,moves:edges.map(e=>e.move)});for(const e of edges)walk(e.child);}
  walk(0);return{values,policy};
}
