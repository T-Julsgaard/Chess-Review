import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {replay as replayMate} from '../../E029-forced-mates/code/replay.mjs';
const values={p:1,n:3,b:3,r:5,q:9,k:0},code=m=>m.from+m.to+(m.promotion||'');
const board=f=>{const c=new Chess(f.history?.fen||f.fen);if(f.history)for(const m of f.history.moves)c.move(m);return c;};
function rays(before,after,m){
 const pieces=after.board().flat().filter(Boolean),king=pieces.find(p=>p.type==='k'&&p.color===after.turn()).square,result=[];
 for(const p of pieces.filter(p=>p.color===m.color&&['q','r','b'].includes(p.type)&&p.square!==m.to)){
  const x=p.square.charCodeAt(0),y=+p.square[1],dx=king.charCodeAt(0)-x,dy=+king[1]-y;if(!dx&&!dy)continue;
  const diagonal=Math.abs(dx)===Math.abs(dy);if(dx&&dy&&!diagonal||p.type==='r'&&diagonal||p.type==='b'&&!diagonal)continue;
  const line=[];for(let i=1;i<Math.max(Math.abs(dx),Math.abs(dy));i++)line.push(String.fromCharCode(x+i*Math.sign(dx))+(y+i*Math.sign(dy)));
  if(!line.includes(m.from)||before.get(p.square)?.type!==p.type||line.some(s=>after.get(s))||line.filter(s=>before.get(s)).length!==1)continue;
  result.push({slider:p.square,type:p.type,king,line,vacated:m.from});
 }return result.sort((a,b)=>a.slider.localeCompare(b.slider));
}
export const sacrificeIds=new Set(['mating-sacrifice','exchange-sacrifice','clearance-sacrifice']);
export function replay(f,event){
 assert.ok(sacrificeIds.has(event.id));const before=board(f),after=board(f),m=after.move(f.move),e=event.evidence;
 assert.notEqual(m.piece,'k');assert.ok(!m.promotion);assert.equal(e.played,code(m));assert.deepEqual(e.offered,{type:m.piece,color:m.color,square:m.to});assert.equal(e.captured,m.captured||null);assert.equal(e.nominalLoss,values[m.piece]-values[m.captured||'k']);assert.ok(e.nominalLoss>0);
 const accepted=after.moves({verbose:true}).filter(r=>r.captured&&(r.flags.includes('e')?r.to[0]+r.from[1]:r.to)===m.to).map(r=>({move:code(r),capturer:r.piece,square:r.flags.includes('e')?r.to[0]+r.from[1]:r.to}));assert.ok(accepted.length);const sorted=a=>[...a].sort((x,y)=>x.move.localeCompare(y.move));assert.deepEqual(sorted(e.acceptances),sorted(accepted));
 const counts=replayMate(f,{id:'forced-mate',evidence:{mateIn:e.mateIn,proof:e.proof,shorterFailures:e.shorterFailures,continuation:{kind:'branching',replies:e.proof.tree.branches.length}}});
 for(const a of accepted){const child=e.proof.tree.branches.find(b=>b.move===a.move);assert.ok(child?.child.win);}
 if(event.id==='exchange-sacrifice'){assert.equal(m.piece,'r');assert.ok(['n','b'].includes(m.captured));}
 if(event.id==='clearance-sacrifice'){const expected=rays(before,after,m);assert.ok(expected.length);assert.deepEqual([...e.rays].sort((a,b)=>a.slider.localeCompare(b.slider)),expected);}
 return counts;
}
