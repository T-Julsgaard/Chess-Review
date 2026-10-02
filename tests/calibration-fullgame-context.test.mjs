import test from 'node:test';
import assert from 'node:assert/strict';
import {fitFullgameContext,fullgameContextRating,fullgameContextMetrics} from '../tools/calibration/fullgame-context.mjs';
const rows=()=>Array.from({length:120},(_,i)=>({gameId:'g'+i,split:'train',color:'w',rating:1200+i*5,decisions:30,quality:40+i*.4}));
test('full-game equivalent context holds its reference fixed and identifies short-excerpt extrapolation',()=>{
 const m=fitFullgameContext(rows()),short=fullgameContextRating(1500,80,2,m),full=fullgameContextRating(1500,80,40,m);
 assert.equal(short.rating,full.rating);assert.equal(short.shortExcerpt,true);assert.equal(full.shortExcerpt,false);assert.match(short.reason,/extrapolated/);
 assert.ok(short.rating>fullgameContextRating(1500,60,40,m).rating);assert.ok(Number.isFinite(fullgameContextRating(1500,100,2,m).rating));
 assert.equal(fullgameContextRating(1500,80,0,m).adjusted,false);
});
test('equivalent context rejects review fields, heldout fitting and overlapping assessment',()=>{
 assert.throws(()=>fitFullgameContext(rows().map(r=>({...r,split:'validation'}))));assert.throws(()=>fitFullgameContext(rows().map(r=>({...r,suppliedRating:2000}))));
 assert.throws(()=>fitFullgameContext([...rows(),rows()[0]]));const m=fitFullgameContext(rows());assert.throws(()=>fullgameContextMetrics(rows(),m));
 const v=rows().map(r=>({...r,gameId:'v'+r.gameId,split:'validation'}));assert.ok(Number.isFinite(fullgameContextMetrics(v,m).crps));
 assert.deepEqual(fitFullgameContext([...rows()].reverse()),m);
});
