import test from 'node:test';
import assert from 'node:assert/strict';
import {empiricalCrps,fitPeerQuality,peerContextRating,peerQualityMetrics} from '../tools/calibration/peer-quality.mjs';
const rows=()=>Array.from({length:120},(_,i)=>({gameId:'p'+i,color:'w',split:'train',rating:1200+i*5,decisions:30,quality:40+i*.4}));
test('weighted empirical CRPS equals direct pairwise proper score',()=>{
 const peers=[{quality:10},{quality:30},{quality:90}],w=[.2,.5,.3],y=45;
 const expected=peers.reduce((s,p,i)=>s+w[i]*Math.abs(p.quality-y),0)-.5*peers.reduce((s,p,i)=>s+peers.reduce((t,q,j)=>t+w[i]*w[j]*Math.abs(p.quality-q.quality),0),0);
 assert.ok(Math.abs(empiricalCrps(peers,w,y)-expected)<1e-12);
 assert.throws(()=>empiricalCrps([...peers].reverse(),w,y));assert.throws(()=>empiricalCrps(peers,[.1,.1,.1],y));
});
test('peer context fits on public game quality, retains bounds and abstains on short games',()=>{
 const m=fitPeerQuality(rows()),a=peerContextRating(1500,60,30,m),b=peerContextRating(1500,90,30,m);
 assert.ok(b.rating>a.rating);assert.ok(a.percentile>0&&a.percentile<1);assert.ok(Number.isFinite(peerContextRating(1500,0,30,m).rating));
 assert.deepEqual(peerContextRating(1500,50,3,m),{rating:1500,deviation:0,percentile:null,effectiveSides:0,adjusted:false,reason:'Insufficient nonforced decisions'});
 const v=rows().slice(0,10).map(r=>({...r,gameId:'v'+r.gameId,split:'validation'}));assert.ok(Number.isFinite(peerQualityMetrics(v,m).crps));
 assert.throws(()=>peerQualityMetrics(rows(),m));assert.throws(()=>fitPeerQuality(v));assert.throws(()=>fitPeerQuality(rows().map(r=>({...r,suppliedRating:1000}))));
 assert.throws(()=>fitPeerQuality([...rows(),rows()[0]]));
});
test('peer fitting is deterministic across input order and tied quality uses midpoint probability',()=>{
 const r=rows().map(x=>({...x,quality:60})),a=fitPeerQuality(r),b=fitPeerQuality([...r].reverse());assert.deepEqual(a,b);
 const e=peerContextRating(1500,60,30,a);assert.ok(Math.abs(e.percentile-.5)<1e-12);assert.ok(Math.abs(e.deviation)<1e-9);
});
test('unsupported peer contexts abstain and do not count null percentiles as coverage',()=>{
 const m={schema:'peer-quality-context-v1',bandwidth:{rating:200,logLength:.35},peers:rows().map(r=>({...r,weight:1}))};
 const v={gameId:'unsupported',color:'w',split:'validation',rating:5000,decisions:30,quality:70};
 const e=peerContextRating(v.rating,v.quality,v.decisions,m);assert.equal(e.adjusted,false);assert.equal(e.percentile,null);assert.equal(e.rating,5000);
 const assessment=peerQualityMetrics([v],m);assert.equal(assessment.adjustmentCoverage,0);assert.ok(Object.values(assessment.percentileCoverage).every(x=>x===null));
});
