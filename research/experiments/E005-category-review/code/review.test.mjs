import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {Chess} from '../../../../lib/chess.js';
import {caseCandidates,blind,htmlFor} from './build.mjs';

// Authored synthetic mechanics fixtures, not observed games or human evidence.
function synthetic(){
  const moves=['e2e4','e7e5','d1h5','b8c6','h5e5'];
  const games=Array.from({length:24},(_,i)=>({id:'synthetic-'+i,split:'train',moves}));
  const rows=games.map(g=>({gameId:g.id,split:'train',contextMoves:[
    {ply:1,color:'w',bestMate:null,loss:.01},{ply:2,color:'b',bestMate:null,loss:.2},{ply:5,color:'w',bestMate:null,loss:0}]}));
  return caseCandidates(games,{rows});
}
test('deterministic enriched selection is legal, game-disjoint and blinded',()=>{
  const a=synthetic(),b=synthetic();assert.deepEqual(a,b);assert.equal(a.selected.length,24);assert.equal(new Set(a.selected.map(c=>c.gameId)).size,24);
  for(const item of a.selected){const chess=new Chess(item.before);const played=chess.move(item.san);assert.ok(played);assert.equal(chess.fen(),item.after);}
  for(const item of a.selected.filter(c=>c.stratum==='offer')){const chess=new Chess(item.after),v={p:1,n:3,b:3,r:5,q:9,k:100};assert.ok(chess.moves({verbose:true}).some(m=>m.to===item.to&&m.captured&&v[m.captured]>v[m.piece]));}
  assert.deepEqual(Object.fromEntries(['offer','loss','control'].map(s=>[s,a.selected.filter(c=>c.stratum===s).length])),{offer:8,loss:8,control:8});
  for(const item of blind(a.selected)){assert.equal(item.loss,undefined);assert.equal(item.gameId,undefined);assert.equal(item.stratum,undefined);}
});
test('reviewer can persist partial assessments, navigate and export bound reviews',async()=>{
  const cases=blind(synthetic().selected).slice(0,2),pack={schema:'E005-review-pack-v1',packId:'synthetic-pack',rubric:'v1',cases};
  const template=await readFile(new URL('review.html',import.meta.url),'utf8'),script=await readFile(new URL('review.js',import.meta.url),'utf8');
  let exported;
  const dom=new JSDOM(htmlFor(pack,template,script),{runScripts:'dangerously',url:'https://synthetic.invalid/',beforeParse(w){w.URL.createObjectURL=blob=>{exported=blob;return 'blob:synthetic';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};}});
  const w=dom.window,$=id=>w.document.getElementById(id);
  assert.equal(w.document.querySelectorAll('.square').length,64);
  for(const [name,value]of Object.entries({reviewer:'Synthetic reviewer',consequence:'sound',exceptional:'notable',confidence:'medium',usefulness:'high',reason:'Synthetic mechanics check'})){$(name).value=value;$(name).dispatchEvent(new w.Event('input'));}
  assert.match($('progress').textContent,/1 \/ 2/);$('next').click();assert.equal($('reason').value,'');$('previous').click();assert.equal($('reason').value,'Synthetic mechanics check');
  const originalFen=$('fen').textContent;$('after').click();assert.notEqual($('fen').textContent,originalFen);$('before').click();assert.equal($('fen').textContent,originalFen);
  const saved=JSON.parse(w.localStorage.getItem('ChessReview.E005.synthetic-pack'));assert.equal(saved.reviews[cases[0].caseId].consequence,'sound');
  $('export').click();const text=await new Promise((resolve,reject)=>{const reader=new w.FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsText(exported);});
  const result=JSON.parse(text);assert.equal(result.packId,'synthetic-pack');assert.deepEqual(result.caseIds,cases.map(c=>c.caseId));assert.equal(result.reviewer,'Synthetic reviewer');assert.equal(result.index,undefined);
  dom.window.close();
});
