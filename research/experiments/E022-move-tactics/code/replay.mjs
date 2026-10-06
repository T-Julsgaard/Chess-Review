import {Chess} from '../../../../lib/chess.js';
import assert from 'node:assert/strict';
const value={p:1,n:3,b:3,r:5,q:9,k:0};
const uci=m=>m.from+m.to+(m.promotion||'');
const material=(c,color)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+value[p.type]*(p.color===color?1:-1),0);
const legal=c=>c.moves({verbose:true}).map(uci).sort();
function apply(c,m,fn){assert.ok(legal(c).includes(m),`Illegal witness ${m}`);c.move(m);try{return fn();}finally{c.undo();}}
export function replay(fixture,event){
  const c=new Chess(fixture.fen),color=c.turn(),initial=material(c,color),move=c.move(fixture.move),proof=event.evidence.proof;
  assert.deepEqual(proof.materialValues,value);
  const witnesses=proof.witnesses;
  assert.deepEqual(witnesses.map(w=>w.reply).sort(),legal(c),'Missing or duplicate defender reply');
  let minimum=material(c,color)-initial,replies=0,leaves=0;
  if(event.id==='absolute-skewer'){
    const e=event.evidence;
    assert.equal(move.to,e.attacker);assert.ok(c.isCheck());
    assert.equal(c.get(e.king)?.type,'k');assert.deepEqual(c.get(e.target.square),{type:e.target.type,color:e.target.color});assert.notEqual(e.target.color,color);
    const dx=e.target.square.charCodeAt(0)-e.attacker.charCodeAt(0),dy=+e.target.square[1]-+e.attacker[1];
    assert.ok(!dx||!dy||Math.abs(dx)===Math.abs(dy));
    const line=[];let x=e.attacker.charCodeAt(0)-97+Math.sign(dx),y=+e.attacker[1]+Math.sign(dy);
    while(x!==e.target.square.charCodeAt(0)-97||y!==+e.target.square[1]){line.push(String.fromCharCode(97+x)+y);x+=Math.sign(dx);y+=Math.sign(dy);}
    assert.deepEqual(e.line,line);assert.ok(line.includes(e.king));
    assert.deepEqual(line.filter(s=>c.get(s)),[e.king]);
    minimum=Infinity;
    for(const witness of witnesses)apply(c,witness.reply,()=>{
      replies++;assert.ok(!c.isGameOver());assert.equal(witness.capture.slice(0,2),e.attacker);assert.equal(witness.capture.slice(2,4),e.target.square);
      apply(c,witness.capture,()=>{
        assert.ok(!c.isDraw());assert.deepEqual(witness.responses.map(r=>r.reply).sort(),legal(c));
        let worst=material(c,color)-initial;
        for(const response of witness.responses)apply(c,response.reply,()=>{leaves++;assert.ok(!c.isCheckmate()&&!c.isDraw());const gain=material(c,color)-initial;assert.equal(response.gain,gain);assert.ok(gain>0);worst=Math.min(worst,gain);});
        assert.ok(worst>0);assert.equal(witness.worstGain,worst);minimum=Math.min(minimum,worst);
      });
    });
    assert.ok(witnesses.length);
  }else{
    assert.equal(event.evidence.capture,fixture.move);
    assert.ok(move.captured);assert.ok(!c.isDraw());
    for(const witness of witnesses)apply(c,witness.reply,()=>{replies++;assert.ok(!c.isCheckmate()&&!c.isDraw());const gain=material(c,color)-initial;assert.equal(witness.gain,gain);assert.ok(gain>0);minimum=Math.min(minimum,gain);});
    assert.ok(minimum>0);
  }
  assert.equal(proof.minimumGain,minimum);
  return{passed:true,replies,leaves,minimumGain:minimum};
}
