import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
const pos=s=>[s.charCodeAt(0)-97,Number(s[1])-1],sq=(x,y)=>x>=0&&x<=7&&y>=0&&y<=7?String.fromCharCode(x+97)+(y+1):null;
const offset=(s,a,b=1)=>{const [x,y]=pos(s);return sq(x+a[0]*b,y+a[1]*b);},sum=(a,b)=>[a[0]+b[0],a[1]+b[1]],neg=a=>a.map(v=>-v||0);
const around=s=>{const [x,y]=pos(s),list=[];for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)if(dx||dy){const q=sq(x+dx,y+dy);if(q)list.push(q);}return list;};
const near=(a,b)=>Math.max(Math.abs(pos(a)[0]-pos(b)[0]),Math.abs(pos(a)[1]-pos(b)[1]))===1;
const corner=s=>'ah'.includes(s[0])&&'18'.includes(s[1]),code=m=>m.from+m.to+(m.promotion||'');
const sorted=a=>[...a].sort(),held=(c,color,s)=>s&&c.get(s)?.color===color;
const pairKeys=new Set(['qr','nq','bq','br','nr','bb']);
export const mateIds=new Set(['arabian-mate','anastasia-mate','boden-mate','epaulette-mate','dovetail-mate','swallow-tail-mate','opera-mate','morphy-mate','ladder-mate','pawn-supported-mate','mate-in-one','promotion-mate','underpromotion-mate','discovered-mate','double-check-mate',...[...pairKeys].map(k=>'mate-pair-'+k)]);
export function replay(fixture,event){
 const before=new Chess(fixture.fen),c=new Chess(fixture.fen),move=c.move(fixture.move),e=event.evidence,color=move.color,enemy=color==='w'?'b':'w';assert.ok(mateIds.has(event.id));assert.equal(e.after,c.fen());assert.equal(e.color,color);assert.equal(c.get(e.king)?.type,'k');assert.equal(c.get(e.king)?.color,enemy);assert.ok(c.isCheck()&&c.isCheckmate());assert.equal(c.moves().length,0);const checkers=c.attackers(e.king,color);assert.deepEqual(sorted(e.checkers),sorted(checkers));
 const result={replies:0,leaves:0,terminal:true};
 if(event.id==='mate-in-one'){assert.equal(e.move,code(move));return result;}
 if(['promotion-mate','underpromotion-mate'].includes(event.id)){assert.ok(move.promotion);assert.equal(e.promotion,move.promotion);assert.equal(e.move,code(move));assert.equal(c.get(move.to).type,move.promotion);if(event.id==='underpromotion-mate')assert.ok(['r','b','n'].includes(move.promotion));return result;}
 if(event.id==='double-check-mate'){assert.ok(checkers.length>=2);return result;}
 if(event.id==='discovered-mate'){const stationary=checkers.filter(s=>s!==move.to&&before.get(s)?.type===c.get(s)?.type&&before.get(s)?.color===color&&!before.attackers(e.king,color).includes(s));assert.ok(stationary.length);assert.deepEqual(sorted(e.stationary),sorted(stationary));assert.equal(e.move,code(move));return result;}
 const checker=e.checker;assert.ok(checker&&checkers.includes(checker.square));assert.equal(c.get(checker.square)?.type,checker.type);assert.equal(c.get(checker.square)?.color,color);assert.equal(checker.color,color);
 const flight=new Chess(c.fen());flight.remove(e.king);const attack=(s,p)=>!!s&&flight.attackers(s,color).includes(p.square),self=s=>held(c,enemy,s),vacant=s=>s&&!c.get(s);
 let helper,support=false,flights=[];
 if(e.helper){helper=e.helper;assert.notEqual(helper.square,checker.square);assert.equal(c.get(helper.square)?.type,helper.type);assert.equal(c.get(helper.square)?.color,color);assert.equal(helper.color,color);assert.notEqual(helper.type,'k');support=near(checker.square,e.king)&&c.attackers(checker.square,color).includes(helper.square);flights=around(e.king).filter(s=>vacant(s)&&attack(s,helper)&&!attack(s,checker));assert.equal(e.support,support);}
 let n,t,inward,sides,diagonals,shoulders,delta;
 if(e.frame){n=e.frame.normal;t=e.frame.tangent;assert.equal(n.length,2);assert.equal(t.length,2);assert.equal(Math.abs(n[0])+Math.abs(n[1]),1);assert.equal(Math.abs(t[0])+Math.abs(t[1]),1);assert.equal(n[0]*t[0]+n[1]*t[1],0);assert.equal(offset(e.king,neg(n)),null);inward=offset(e.king,n);sides=[offset(e.king,t),offset(e.king,sum(t,n))];diagonals=[offset(e.king,sum(n,t)),offset(e.king,sum(n,neg(t)))];shoulders=[offset(e.king,t),offset(e.king,neg(t))];delta=pos(checker.square).map((v,i)=>v-pos(e.king)[i]);}
 if(event.id.startsWith('mate-pair-')){const key=[checker.type,helper.type].sort().join('');assert.equal(event.id,'mate-pair-'+key);assert.ok(pairKeys.has(key));assert.deepEqual(e.flights,flights);assert.ok(support||flights.length);if(key==='bb')assert.notEqual(pos(checker.square).reduce((a,b)=>a+b,0)%2,pos(helper.square).reduce((a,b)=>a+b,0)%2);return result;}
 if(event.id==='pawn-supported-mate'){assert.equal(helper.type,'p');assert.ok(support);assert.deepEqual(e.flights,flights);return result;}
 assert.equal(checkers.length,1);
 switch(event.id){
  case 'arabian-mate':assert.ok(corner(e.king));assert.equal(checker.type,'r');assert.equal(helper.type,'n');assert.ok(support&&flights.length);assert.deepEqual(e.flights,flights);break;
  case 'anastasia-mate':assert.ok(!corner(e.king));assert.ok(['r','q'].includes(checker.type));assert.equal(helper.type,'n');assert.ok(delta[0]*n[0]+delta[1]*n[1]===0);assert.ok(self(inward));assert.ok(diagonals.every(s=>vacant(s)&&attack(s,helper)));assert.deepEqual(e.flights,diagonals);assert.deepEqual(e.blockers,[inward]);break;
  case 'boden-mate':assert.ok(!corner(e.king));assert.equal(checker.type,'b');assert.equal(helper.type,'b');assert.notEqual(pos(checker.square).reduce((a,b)=>a+b,0)%2,pos(helper.square).reduce((a,b)=>a+b,0)%2);assert.ok(flights.length>=2&&sides.every(self));assert.deepEqual(e.flights,flights);assert.deepEqual(e.blockers,sides);break;
  case 'epaulette-mate':assert.equal(checker.type,'q');assert.equal(offset(e.king,n,2),checker.square);assert.ok(shoulders.every(self));assert.deepEqual(e.blockers,shoulders);break;
  case 'dovetail-mate':case 'swallow-tail-mate':{
   assert.equal(checker.type,'q');assert.ok(support);const d=pos(checker.square).map((v,i)=>v-pos(e.king)[i]);assert.ok(event.id==='dovetail-mate'?Math.abs(d[0])===1&&Math.abs(d[1])===1:Math.abs(d[0])+Math.abs(d[1])===1);const uncovered=around(e.king).filter(s=>s!==checker.square&&!attack(s,checker));assert.equal(uncovered.length,2);assert.ok(uncovered.every(self));assert.deepEqual(e.blockers,uncovered);assert.deepEqual(e.flights,flights);break;
  }
  case 'opera-mate':assert.equal(checker.type,'r');assert.equal(helper.type,'b');assert.ok(support&&vacant(inward)&&attack(inward,helper)&&sides.every(self));assert.deepEqual(delta,neg(t));assert.deepEqual(e.blockers,sides);assert.deepEqual(e.flights,[inward]);break;
  case 'morphy-mate':{
   assert.ok(corner(e.king));assert.equal(checker.type,'b');assert.equal(helper.type,'r');const orth=around(e.king).filter(s=>pos(s).filter((v,i)=>v!==pos(e.king)[i]).length===1),sealed=orth.find(s=>vacant(s)&&attack(s,helper)&&!attack(s,checker)),blocked=orth.find(self);assert.ok(sealed&&blocked);assert.deepEqual(e.flights,[sealed]);assert.deepEqual(e.blockers,[blocked]);break;
  }
  case 'ladder-mate':{
   assert.equal(checker.type,'r');assert.equal(helper.type,'r');assert.ok(delta[0]*n[0]+delta[1]*n[1]===0);const d=pos(helper.square).map((v,i)=>v-pos(e.king)[i]);assert.equal(d[0]*n[0]+d[1]*n[1],1);const squares=[offset(e.king,sum(n,t)),inward,offset(e.king,sum(n,neg(t)))].filter(vacant);assert.ok(squares.length&&squares.every(s=>attack(s,helper)));assert.deepEqual(e.flights,squares);break;
  }
  default:assert.fail('Unhandled mate label');
 }
 return result;
}
