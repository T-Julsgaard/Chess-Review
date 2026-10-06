import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {openResearchData} from '../../../data-policy.mjs';
import {explainMove,shortText} from './explain.mjs';
import {pawnFeatures,positionFeatures,segment} from './features.mjs';

await openResearchData(['D001'],{purpose:'test'});
const {fixtures,reflect,setup}=await import('./fixtures.mjs');
for(const f of fixtures.flatMap(f=>[f,reflect(f)]))test('structural '+f.id,()=>{
  const r=explainMove(f),ids=r.events.map(e=>e.id);
  for(const id of f.expected)assert.ok(ids.includes(id),`${f.id}: missing ${id}; got ${ids}`);
  for(const id of f.absent)assert.ok(!ids.includes(id),`${f.id}: unexpected ${id}`);
  assert.ok(!r.comment||r.comment.split(/\s+/).length<=24);
  const after=new Chess(f.fen);after.move(f.move);assert.equal(r.after,after.fen());
  for(const e of r.events){assert.equal(e.qualityClaim,false);assert.equal(e.text,shortText(e));}
});
test('independent pawn checks verify passed/isolated definitions including boundary files',()=>{
  const c=new Chess(setup({a3:'P',b4:'P',d4:'P',f5:'P',g6:'p',b6:'p',e3:'p'}));
  const b=c.board().flat().filter(Boolean),p=pawnFeatures(c,'w');
  for(const s of p.passed)assert.ok(!b.some(q=>q.type==='p'&&q.color==='b'&&Math.abs(q.square.charCodeAt(0)-s.charCodeAt(0))<=1&&+q.square[1]>+s[1]));
  for(const s of p.isolated)assert.ok(!b.some(q=>q.type==='p'&&q.color==='w'&&Math.abs(q.square.charCodeAt(0)-s.charCodeAt(0))===1));
  assert.ok(!p.passed.includes('a3'));assert.ok(!p.passed.includes('f5'));assert.ok(p.passed.includes('d4'));
});
test('branching chain retains exact bases and head instead of inventing one linear chain',()=>{
  const c=new Chess(setup({c3:'P',e3:'P',d4:'P'})),p=pawnFeatures(c,'w'),chain=p.components.find(g=>g.members.includes('d4'));
  assert.deepEqual(chain.bases,['c3','e3']);assert.deepEqual(chain.heads,['d4']);assert.equal(chain.edges.length,2);
});
test('battery witnesses use clear lines and correct movement families',()=>{
  for(const f of fixtures.filter(f=>f.expected.some(id=>id.includes('battery')))){
    const r=explainMove(f),c=new Chess(r.after);
    for(const e of r.events.filter(e=>e.id.endsWith('battery'))){const a=e.evidence.queen,b=e.evidence.rook||e.evidence.bishop,line=segment(a,b);assert.ok(line);assert.ok(line.every(s=>!c.get(s)));
      assert.ok(c.attackers(a,'w').includes(b));assert.ok(c.attackers(b,'w').includes(a));}
  }
});
test('rook blockade really occupies the passed pawn forward square, without a safety claim',()=>{
  const f=fixtures.find(f=>f.id==='rook-blockade'),r=explainMove(f),e=r.events.find(e=>e.id==='passed-pawn-blockade'),c=new Chess(r.after);
  assert.equal(e.evidence.square,e.evidence.pawn[0]+(+e.evidence.pawn[1]-1));assert.equal(c.get(e.evidence.square).type,'r');
});
test('king opposition is geometry only; pieces blocking the kings prevent the label',()=>{
  const c=new Chess(setup({a1:null,h8:null,d3:'K',d5:'k',d4:'P'}));assert.equal(positionFeatures(c,'w').opposition,null);
  const f=fixtures.find(f=>f.id==='direct-opposition'),r=explainMove(f);assert.match(r.events.find(e=>e.id==='king-opposition').text,/not who benefits/);
});
test('en-passant capture is an explicit exception to the level-rank passer shortcut',()=>{
  const f=fixtures.find(f=>f.id==='en-passant-vulnerable'),c=new Chess(f.fen);c.move(f.move);assert.ok(c.moves({verbose:true}).some(m=>m.isEnPassant()));assert.ok(!pawnFeatures(c,'w').passed.includes('e4'));
});
test('all frozen E020 concept IDs survive composition, including terminal precedence',async()=>{
  const {fixtures:old}=await import('../../E020-coach-concepts/code/fixtures.mjs');
  for(const f of old.filter(f=>!f.invalid)){const r=explainMove(f);for(const id of f.expected)assert.ok(r.events.some(e=>e.id===id),f.id+': '+id);}
});
test('majorities are exact side-relative counts, including 3:2 and 4:3 subsets',()=>{
  for(const f of fixtures.filter(f=>f.expected.includes('pawn-majority'))){const r=explainMove(f),c=new Chess(r.after),color=new Chess(f.fen).turn();
    for(const e of r.events.filter(e=>e.id==='pawn-majority')){const pawns=c.board().flat().filter(p=>p?.type==='p'&&e.evidence.files.includes(p.square[0]));assert.equal(e.evidence.own,pawns.filter(p=>p.color===color).length);assert.equal(e.evidence.enemy,pawns.filter(p=>p.color!==color).length);assert.ok(e.evidence.own>e.evidence.enemy);}
  }
  const counts=id=>explainMove(fixtures.find(f=>f.id===id)).events.find(e=>e.id==='pawn-majority').evidence;
  assert.equal(counts('three-two-queenside').own,3);assert.equal(counts('three-two-queenside').enemy,2);
  assert.equal(counts('four-three-kingside').own,4);assert.equal(counts('four-three-kingside').enemy,3);
});
test('short templates retain concept labels when there are many targets or pawn squares',()=>{
  const targets=['a2','b3','c4','d5','e6','f7','g8','h1'].map(square=>({square,type:'q'}));
  for(const e of [{id:'fork',evidence:{piece:'n',attacker:'d4',targets}},
    {id:'passed-pawn',evidence:{squares:targets.map(t=>t.square)}},
    {id:'isolated-pawn',evidence:{squares:targets.map(t=>t.square),iqp:['d5']}}])assert.ok(shortText(e).split(/\s+/).length<=24);
});
test('the head is the most advanced chain pawn, not every terminal branch',()=>{
  const p=pawnFeatures(new Chess(setup({d2:'P',c3:'P',e3:'P',f4:'P',g5:'P'})),'w'),chain=p.components.find(c=>c.members.includes('d2'));
  assert.deepEqual(chain.heads,['g5']);assert.deepEqual(chain.terminals,['c3','g5']);
});
