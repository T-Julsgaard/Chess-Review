import test from 'node:test';
import assert from 'node:assert/strict';
import {fitHumanOutcome,humanExpected,outcomeMetrics,fitHumanChoice,choiceStats,choiceMetrics,humanMoveQuality,humanGameAccuracy,policyVersion} from '../tools/calibration/human-policy.mjs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const curve={schema:'human-outcome-v1',slopePerPawn:.6};
const sigmoid=x=>1/(1+Math.exp(-x));
const rows=()=>[-400,-200,-100,0,100,200,400].map((cp,i)=>({gameId:'g'+i,split:'train',cp,target:sigmoid(.6*cp/100),weight:1}));
test('human expected-points curve recovers a known fractional-outcome model and is symmetric',()=>{
 const model=fitHumanOutcome(rows());assert.ok(Math.abs(model.slopePerPawn-.6)<1e-10);assert.equal(model.boundary,null);
 assert.equal(humanExpected({cp:0},model),.5);
 assert.ok(Math.abs(humanExpected({cp:200},model)+humanExpected({cp:-200},model)-1)<1e-12);
 assert.equal(humanExpected({mate:3},model),1);assert.equal(humanExpected({mate:-3},model),0);
 assert.throws(()=>humanExpected({mate:0},model));assert.throws(()=>humanExpected({cp:NaN},model));
 assert.ok(outcomeMetrics(rows(),model).logLoss<outcomeMetrics(rows(),{...model,slopePerPawn:0}).logLoss);
});
test('outcome fits reject heldout targets and unexpected score/identity predictors',()=>{
 assert.throws(()=>fitHumanOutcome(rows().map(r=>({...r,split:'validation'}))));
 for(const field of ['rating','accuracy','label','coefficient'])assert.throws(()=>fitHumanOutcome(rows().map(r=>({...r,[field]:123}))));
 assert.throws(()=>fitHumanOutcome([{...rows()[0],target:2}]));
 assert.equal(fitHumanOutcome(rows().map(r=>({...r,target:.5}))).boundary,'lower');
 assert.equal(fitHumanOutcome(rows().filter(r=>r.cp!==0).map(r=>({...r,target:Number(r.cp>0)}))).boundary,'upper');
});
test('choice temperature estimates likelihood from observed alternatives and reports boundary fits',()=>{
 const r=Array.from({length:100},(_,i)=>({gameId:'p'+i,split:'train',utilities:[0,1],playedIndex:i<80?1:0}));
 const model=fitHumanChoice(r);assert.ok(Math.abs(model.temperature-Math.log(4))<1e-10);assert.equal(model.boundary,null);
 assert.ok(choiceMetrics(r,model).logLoss<choiceMetrics(r,model).uniformLogLoss);
 assert.equal(fitHumanChoice(r.map(x=>({...x,playedIndex:1}))).boundary,'upper');
 assert.throws(()=>fitHumanChoice(r.map(x=>({...x,split:'validation'}))));
 assert.throws(()=>fitHumanChoice([r[0],r[0]]));assert.throws(()=>fitHumanChoice([{...r[0],rating:2000}]));
 assert.throws(()=>fitHumanChoice([{...r[0],utilities:[0,2]}]));
});
test('softmax loss remains finite with extreme temperature and is invariant to alternative ordering',()=>{
 const a=choiceStats([0,.5,1],0,1000),b=choiceStats([1,0,.5],1,1000);assert.equal(a.logLoss,b.logLoss);assert.ok(Number.isFinite(a.logLoss));
});
test('quality is bounded and monotone, excludes forced dilution, and handles retained mate',()=>{
 const model={outcome:curve,choice:{schema:'human-choice-v1',temperature:10}};
 const a=humanMoveQuality({cp:100},{cp:50},model),b=humanMoveQuality({cp:100},{cp:-100},model);assert.ok(a.quality>b.quality);
 const top=humanMoveQuality({cp:100},{cp:50},model,{top:true});assert.equal(top.quality,100);
 const forced=humanMoveQuality({cp:100},{cp:-100},model,{forced:true});assert.equal(forced.quality,100);assert.equal(forced.eligible,false);
 assert.equal(humanGameAccuracy([a,forced]),a.quality);assert.equal(humanGameAccuracy([forced]),null);
 const retained=humanMoveQuality({mate:2},{mate:8},model);assert.equal(retained.quality,100);
 const lost=humanMoveQuality({mate:2},{mate:-2},model);assert.ok(lost.quality>=0&&lost.quality<retained.quality);
 const unstable=humanMoveQuality({cp:0},{cp:100},model);assert.ok(unstable.residual<0);assert.equal(unstable.quality,100);
 assert.equal(humanMoveQuality({cp:100,rating:600},{cp:50,accuracy:1},model).quality,a.quality);
 assert.throws(()=>humanGameAccuracy([{quality:101,eligible:true}]));
});
test('candidate identity binds definitions, fitted parameters, engine and independent dataset',()=>{
 const a={outcome:curve,choice:{schema:'human-choice-v1',temperature:10},engineConfig:{version:18},datasetSha256:'data',selectionSha256:'ids'};
 assert.equal(policyVersion(a),policyVersion(structuredClone(a)));assert.notEqual(policyVersion(a),policyVersion({...a,selectionSha256:'changed'}));
});
test('pure outcome fitting works while file permissions deny application and external-data reads',()=>{
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const moduleUrl=new URL('../tools/calibration/human-policy.mjs',import.meta.url).href;
 const script=`import {readFile} from 'node:fs/promises'; import {fitHumanOutcome} from ${JSON.stringify(moduleUrl)};
 const blocked=[]; for(const file of ${JSON.stringify([path.join(root,'data/calibration.json'),path.join(root,'analysis.js')])}){try{await readFile(file);throw Error('Unexpected file access');}catch(e){if(e.code!=='ERR_ACCESS_DENIED')throw e;blocked.push(e.code);}}
 console.log(JSON.stringify({blocked,model:fitHumanOutcome(${JSON.stringify(rows())})}));`;
 const run=spawnSync(process.execPath,['--permission','--allow-fs-read='+path.join(root,'tools/calibration'),'--input-type=module','-e',script],{encoding:'utf8',windowsHide:true});
 assert.equal(run.status,0,run.stderr);const output=JSON.parse(run.stdout);assert.deepEqual(output.blocked,['ERR_ACCESS_DENIED','ERR_ACCESS_DENIED']);assert.deepEqual(output.model,fitHumanOutcome(rows()));
});
