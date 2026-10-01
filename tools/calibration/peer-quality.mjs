import {hash} from './io.mjs';

const RATING_UNIT=400/Math.log(10),MIN_DECISIONS=10;
export const peerQualityDefinition={schema:'peer-quality-context-v1',
  meaning:'Recorded rating plus the log odds of game quality exceeding comparable public player-sides, expressed in conventional logistic rating units (400 / ln(10)).',
  targets:'Independently computed whole-game move quality; recorded public ratings and decision counts are conditioning covariates.',
  distribution:'Conditional empirical quality distribution, Gaussian kernels on recorded rating and log nonforced decision count; tied quality uses its midpoint percentile.',
  selection:'Five game-disjoint training folds minimize continuous ranked probability score. Fixed rating bandwidths [200,400,800] and log-length bandwidths [0.35,0.7,1.4].',
  finiteResolution:'Percentile uses half an observation at each boundary with effective weighted sample size. At least 20 effective peer sides and 10 nonforced decisions are required for an adjustment.',
  limitation:'A declared relative game-quality performance scale, not an official rating update, actual result-based performance rating, or known true ability.',
};
function validate(r){
  const keys=['gameId','color','split','rating','decisions','quality'];
  if(!r||Object.keys(r).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(r,k))||!r.gameId||!['w','b'].includes(r.color)||!['train','validation'].includes(r.split)||!Number.isFinite(r.rating)||r.rating<0||r.rating>5000||!Number.isInteger(r.decisions)||r.decisions<0||!Number.isFinite(r.quality)||r.quality<0||r.quality>100)throw Error('Invalid public peer-quality observation');
}
function prepare(rows){
  if(!Array.isArray(rows)||!rows.length)throw Error('No peer-quality observations');
  const ids=new Set(),splits=new Map(),counts=new Map();
  rows.forEach(r=>{validate(r);const id=r.gameId+':'+r.color;if(ids.has(id))throw Error('Duplicate player-side');ids.add(id);
    if(splits.has(r.gameId)&&splits.get(r.gameId)!==r.split)throw Error('Game crosses fitting roles');splits.set(r.gameId,r.split);
    if(r.decisions>=MIN_DECISIONS)counts.set(r.gameId,(counts.get(r.gameId)||0)+1);
  });
  return rows.filter(r=>r.decisions>=MIN_DECISIONS).map(r=>({...r,weight:1/counts.get(r.gameId)})).sort((a,b)=>a.quality-b.quality||a.gameId.localeCompare(b.gameId)||a.color.localeCompare(b.color));
}
function distribution(peers,rating,decisions,bandwidth){
  if(!peers.length)throw Error('No eligible peers');
  const logs=peers.map(p=>Math.log(p.weight)-.5*((p.rating-rating)/bandwidth.rating)**2-.5*((Math.log(p.decisions)-Math.log(decisions))/bandwidth.logLength)**2);
  const maximum=Math.max(...logs),weights=logs.map(x=>Math.exp(x-maximum)),sum=weights.reduce((s,x)=>s+x,0);
  const normalized=weights.map(x=>x/sum),effectiveSides=1/normalized.reduce((s,w)=>s+w*w,0);
  return{weights:normalized,effectiveSides};
}
// CRPS of the complete weighted empirical distribution, in quality points.
export function empiricalCrps(peers,weights,quality){
  if(peers.length!==weights.length||!peers.length||!Number.isFinite(quality)||weights.some(w=>!Number.isFinite(w)||w<0)||Math.abs(weights.reduce((s,w)=>s+w,0)-1)>1e-8||peers.some((p,i)=>!Number.isFinite(p.quality)||(i&&peers[i-1].quality>p.quality)))throw Error('Invalid sorted empirical distribution');
  let absolute=0,pair=0,cumulativeWeight=0,cumulativeQuality=0;
  for(let i=0;i<peers.length;i++){const x=peers[i].quality,w=weights[i];absolute+=w*Math.abs(x-quality);pair+=w*(x*cumulativeWeight-cumulativeQuality);cumulativeWeight+=w;cumulativeQuality+=w*x;}
  return Math.max(0,absolute-pair);
}
export function fitPeerQuality(rows){
  const peers=prepare(rows);if(rows.some(r=>r.split!=='train'))throw Error('Only training game quality may fit context');
  const games=new Set(peers.map(r=>r.gameId));if(games.size<100)throw Error('Insufficient public training games');
  const folds=new Map([...games].map(id=>[id,parseInt(hash('peer-quality-fold-v1:'+id).slice(0,8),16)%5]));
  const candidates=[];
  for(const rating of [200,400,800])for(const logLength of [.35,.7,1.4]){
    let loss=0,totalWeight=0;const byFold=[];
    for(let fold=0;fold<5;fold++){
      const training=peers.filter(r=>folds.get(r.gameId)!==fold),heldout=peers.filter(r=>folds.get(r.gameId)===fold);
      if(!training.length||!heldout.length)throw Error('Empty training fold');
      let value=0,weight=0;
      for(const r of heldout){const d=distribution(training,r.rating,r.decisions,{rating,logLength});value+=r.weight*empiricalCrps(training,d.weights,r.quality);weight+=r.weight;}
      byFold.push({fold,crps:value/weight,games:new Set(heldout.map(r=>r.gameId)).size});loss+=value;totalWeight+=weight;
    }
    candidates.push({rating,logLength,crps:loss/totalWeight,folds:byFold});
  }
  candidates.sort((a,b)=>a.crps-b.crps||a.rating-b.rating||a.logLength-b.logLength);
  const selected=candidates[0];
  return{schema:peerQualityDefinition.schema,bandwidth:{rating:selected.rating,logLength:selected.logLength},peers,
    games:games.size,sides:peers.length,trainingCandidates:candidates,definition:peerQualityDefinition};
}
function validateModel(model){
  if(model?.schema!==peerQualityDefinition.schema||![200,400,800].includes(model.bandwidth?.rating)||![.35,.7,1.4].includes(model.bandwidth?.logLength)||!Array.isArray(model.peers)||!model.peers.length)throw Error('Invalid peer-quality model');
}
export function peerContextRating(rating,quality,decisions,model){
  validateModel(model);
  if(!Number.isFinite(rating)||rating<0||rating>5000||!Number.isFinite(quality)||quality<0||quality>100||!Number.isInteger(decisions)||decisions<0)throw Error('Invalid peer-quality inputs');
  if(decisions<MIN_DECISIONS)return{rating,deviation:0,percentile:null,effectiveSides:0,adjusted:false,reason:'Insufficient nonforced decisions'};
  const d=distribution(model.peers,rating,decisions,model.bandwidth);
  if(d.effectiveSides<20)return{rating,deviation:0,percentile:null,effectiveSides:d.effectiveSides,adjusted:false,reason:'Insufficient effective public peers'};
  let percentile=0;
  for(let i=0;i<model.peers.length;i++)if(model.peers[i].quality<=quality)percentile+=d.weights[i]*(model.peers[i].quality===quality?.5:1);
  percentile=(percentile*d.effectiveSides+.5)/(d.effectiveSides+1);
  const deviation=RATING_UNIT*(Math.log(percentile)-Math.log1p(-percentile));
  return{rating:rating+deviation,deviation,percentile,effectiveSides:d.effectiveSides,adjusted:true,reason:null};
}
export function peerQualityMetrics(rows,model){
  validateModel(model);const prepared=prepare(rows);if(!prepared.length)throw Error('No eligible assessment sides');
  if(prepared.some(r=>model.peers.some(p=>p.gameId===r.gameId)))throw Error('Assessment game overlaps model peers');
  let loss=0,weight=0,percentileWeight=0;const coverage=Object.fromEntries([.1,.25,.5,.75,.9].map(x=>[x,0])),estimates=[];
  for(const r of prepared){const d=distribution(model.peers,r.rating,r.decisions,model.bandwidth),estimate=peerContextRating(r.rating,r.quality,r.decisions,model);
    loss+=r.weight*empiricalCrps(model.peers,d.weights,r.quality);weight+=r.weight;
    if(estimate.percentile!=null){percentileWeight+=r.weight;for(const p of Object.keys(coverage))if(estimate.percentile<=Number(p))coverage[p]+=r.weight;}
    estimates.push({gameId:r.gameId,color:r.color,recordedRating:r.rating,quality:r.quality,decisions:r.decisions,...estimate});
  }
  for(const p of Object.keys(coverage))coverage[p]=percentileWeight?coverage[p]/percentileWeight:null;
  return{games:new Set(prepared.map(r=>r.gameId)).size,sides:prepared.length,crps:loss/weight,adjustmentCoverage:percentileWeight/weight,percentileCoverage:coverage,estimates,
    interpretation:'Development-validation conditional quality distribution; percentiles are diagnostic and do not validate single-game true rating.'};
}
