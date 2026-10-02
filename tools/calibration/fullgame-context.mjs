import {hash} from './io.mjs';
import {empiricalCrps} from './peer-quality.mjs';

export const fullgameContextDefinition={schema:'fullgame-equivalent-context-v1',
  meaning:'Equivalent full-game quality performance: recorded rating plus log odds of the observed quality exceeding comparable public full-game player-sides, in 400/ln(10) rating units.',
  reference:'Public complete training games with at least ten nonforced decisions; Gaussian recorded-rating kernels. Game length does not change the reference quality distribution.',
  selection:'Rating bandwidth [200,400,800] selected by five game-disjoint training-fold CRPS; each game has unit total weight.',
  interpretation:'An extrapolation of observed quality to a full-game standard, distinct from length-matched game performance and moves-only ability estimation.',
  shortGames:'With 1..9 nonforced decisions the point is explicitly marked as a short excerpt extrapolation. Zero decisions or fewer than twenty effective peer sides retain recorded rating.',
  limitations:'Not an official rating update, validated ability interval, or evidence that a short game established the displayed strength. Pool/time-control transfer is unvalidated.',
};
function prepare(rows){
  if(!Array.isArray(rows)||!rows.length)throw Error('No public full-game quality rows');const ids=new Set(),counts=new Map(),roles=new Map();
  for(const r of rows){const keys=['gameId','color','split','rating','decisions','quality'];
    if(Object.keys(r).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(r,k))||!r.gameId||!['w','b'].includes(r.color)||!['train','validation'].includes(r.split)||!Number.isFinite(r.rating)||r.rating<0||r.rating>5000||!Number.isInteger(r.decisions)||r.decisions<0||!Number.isFinite(r.quality)||r.quality<0||r.quality>100)throw Error('Invalid full-game quality observation');
    const id=r.gameId+':'+r.color;if(ids.has(id))throw Error('Duplicate public side');ids.add(id);if(roles.has(r.gameId)&&roles.get(r.gameId)!==r.split)throw Error('Game crosses roles');roles.set(r.gameId,r.split);
    if(r.decisions>=10)counts.set(r.gameId,(counts.get(r.gameId)||0)+1);
  }
  return rows.filter(r=>r.decisions>=10).map(r=>({...r,weight:1/counts.get(r.gameId)})).sort((a,b)=>a.quality-b.quality||a.gameId.localeCompare(b.gameId)||a.color.localeCompare(b.color));
}
function distribution(peers,rating,bandwidth){
  const logits=peers.map(p=>Math.log(p.weight)-.5*((p.rating-rating)/bandwidth)**2),max=Math.max(...logits),weights=logits.map(x=>Math.exp(x-max)),sum=weights.reduce((s,x)=>s+x,0),normalized=weights.map(w=>w/sum);
  return{weights:normalized,effectiveSides:1/normalized.reduce((s,w)=>s+w*w,0)};
}
export function fitFullgameContext(rows){
  const peers=prepare(rows);if(rows.some(r=>r.split!=='train'))throw Error('Only training quality fits context');const games=new Set(peers.map(r=>r.gameId));if(games.size<100)throw Error('Insufficient public full games');
  const foldOf=id=>parseInt(hash('fullgame-context-fold-v1:'+id).slice(0,8),16)%5,candidates=[];
  for(const bandwidth of [200,400,800]){let score=0,weight=0;const folds=[];
    for(let fold=0;fold<5;fold++){const training=peers.filter(r=>foldOf(r.gameId)!==fold),heldout=peers.filter(r=>foldOf(r.gameId)===fold);if(!training.length||!heldout.length)throw Error('Empty public fold');let loss=0,total=0;
      for(const r of heldout){const d=distribution(training,r.rating,bandwidth);loss+=r.weight*empiricalCrps(training,d.weights,r.quality);total+=r.weight;}
      folds.push({fold,crps:loss/total,games:new Set(heldout.map(r=>r.gameId)).size});score+=loss;weight+=total;
    }candidates.push({bandwidth,crps:score/weight,folds});
  }
  candidates.sort((a,b)=>a.crps-b.crps||a.bandwidth-b.bandwidth);
  return{schema:fullgameContextDefinition.schema,bandwidth:candidates[0].bandwidth,peers,games:games.size,sides:peers.length,trainingCandidates:candidates,definition:fullgameContextDefinition};
}
function validateModel(model){if(model?.schema!==fullgameContextDefinition.schema||![200,400,800].includes(model.bandwidth)||!Array.isArray(model.peers)||!model.peers.length)throw Error('Invalid full-game context model');}
export function fullgameContextRating(rating,quality,decisions,model){
  validateModel(model);if(!Number.isFinite(rating)||rating<0||rating>5000||!Number.isFinite(quality)||quality<0||quality>100||!Number.isInteger(decisions)||decisions<0)throw Error('Invalid full-game context inputs');
  const shortExcerpt=decisions>0&&decisions<10;
  if(!decisions)return{rating,deviation:0,percentile:null,effectiveSides:0,adjusted:false,shortExcerpt,reason:'No nonforced decision evidence'};
  const d=distribution(model.peers,rating,model.bandwidth);
  if(d.effectiveSides<20)return{rating,deviation:0,percentile:null,effectiveSides:d.effectiveSides,adjusted:false,shortExcerpt,reason:'Insufficient effective public peers'};
  let percentile=0;for(let i=0;i<model.peers.length;i++)if(model.peers[i].quality<=quality)percentile+=d.weights[i]*(model.peers[i].quality===quality?.5:1);
  percentile=(percentile*d.effectiveSides+.5)/(d.effectiveSides+1);const deviation=400/Math.log(10)*(Math.log(percentile)-Math.log1p(-percentile));
  return{rating:rating+deviation,deviation,percentile,effectiveSides:d.effectiveSides,adjusted:true,shortExcerpt,reason:shortExcerpt?'Short excerpt extrapolated to a full-game quality standard':null};
}
export function fullgameContextMetrics(rows,model){
  validateModel(model);const peers=prepare(rows);if(!peers.length||peers.some(r=>model.peers.some(p=>p.gameId===r.gameId)))throw Error('Empty or overlapping assessment');let score=0,weight=0,covered=0;const coverage=Object.fromEntries([.1,.25,.5,.75,.9].map(p=>[p,0]));
  for(const r of peers){const d=distribution(model.peers,r.rating,model.bandwidth),estimate=fullgameContextRating(r.rating,r.quality,r.decisions,model);score+=r.weight*empiricalCrps(model.peers,d.weights,r.quality);weight+=r.weight;
    if(estimate.percentile!=null){covered+=r.weight;for(const p of Object.keys(coverage))if(estimate.percentile<=Number(p))coverage[p]+=r.weight;}
  }
  for(const p of Object.keys(coverage))coverage[p]=covered?coverage[p]/covered:null;
  return{games:new Set(peers.map(r=>r.gameId)).size,sides:peers.length,crps:score/weight,adjustmentCoverage:covered/weight,percentileCoverage:coverage,
    interpretation:'Conditional full-game quality distribution; this assessment does not validate the short-excerpt extrapolation or true rating.'};
}
