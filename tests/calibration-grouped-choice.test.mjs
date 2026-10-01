import test from 'node:test';
import assert from 'node:assert/strict';
import {fitGroupedHumanChoice,groupedChoiceMetrics} from '../tools/calibration/grouped-human-choice.mjs';
const rows=()=>Array.from({length:100},(_,i)=>({gameId:'g'+i,positionId:'1',split:'train',utilities:[0,1],playedIndex:i<80?1:0}));
test('grouped fitting recovers known choices without giving long games extra influence',()=>{
 const a=rows(),b=a.flatMap((r,i)=>i<80?Array.from({length:4},(_,j)=>({...r,positionId:String(j)})):[r]);
 const ma=fitGroupedHumanChoice(a),mb=fitGroupedHumanChoice(b);
 assert.ok(Math.abs(ma.temperature-Math.log(4))<1e-10);assert.ok(Math.abs(ma.temperature-mb.temperature)<1e-10);
 assert.equal(mb.games,100);assert.equal(mb.observations,340);
 assert.equal(groupedChoiceMetrics(a,ma).logLoss,groupedChoiceMetrics(b,ma).logLoss);
});
test('grouped choices reject duplicate positions, crossed roles, heldout fitting and unknown targets',()=>{
 const r=rows()[0];assert.throws(()=>fitGroupedHumanChoice([r,r]));
 assert.throws(()=>fitGroupedHumanChoice([r,{...r,positionId:'2',split:'validation'}]));
 assert.throws(()=>fitGroupedHumanChoice([{...r,split:'validation'}]));
 assert.throws(()=>fitGroupedHumanChoice([{...r,accuracy:90}]));
 assert.equal(fitGroupedHumanChoice(rows().map(r=>({...r,playedIndex:1}))).boundary,'upper');
});
