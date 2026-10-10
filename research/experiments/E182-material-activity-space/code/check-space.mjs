import assert from 'node:assert/strict';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {verifyPanel} from './verify-space-panel.mjs';
const live=s=>Object.values(s.flags).every(value=>value===false);
// Rebuild all decision fields without importing the runtime or causal derive.
export function checkSpace(input,decision,mode='inspect'){
  assert.ok(['inspect','evaluate'].includes(mode));
  const limit=input.maxMaterialSpaceNodes===undefined?50000:input.maxMaterialSpaceNodes;
  assert.ok(Number.isSafeInteger(limit)&&limit>=0&&limit<=50000);
  if(input.materialAlternative!==undefined)assert.match(input.materialAlternative,/^[a-h][1-8][a-h][1-8][qrbn]?$/);
  if(input.materialSpacePanel!==undefined)assert.ok(input.materialSpacePanel&&typeof input.materialSpacePanel==='object'&&!Array.isArray(input.materialSpacePanel));
  const expected={experiment:'E182',claim:'C0590',status:'history-prerequisite',limit,nodes:0,available:false,witness:null};
  const done=()=>{assert.deepEqual(decision,expected);return true;};
  if(!validateHistory(input))return done();
  if(input.materialAlternative===undefined){expected.status='alternative-prerequisite';return done();}
  if(mode==='evaluate'&&limit<3){expected.status='exhausted';expected.nodes=limit+1;return done();}
  const panel=input.materialSpacePanel;
  if(panel===undefined){expected.status='panel-prerequisite';return done();}
  assert.ok(Number.isSafeInteger(panel.nodes)&&panel.nodes>=0);
  if(limit<3||3+panel.nodes>limit){expected.status='exhausted';expected.nodes=limit+1;return done();}
  expected.nodes=3+verifyPanel(input,panel).nodes;
  const actual=panel.variants.find(v=>v.move===input.move),alternative=panel.variants.find(v=>v.move===input.materialAlternative);
  const summaries=[];
  for(const variant of panel.variants){
    const units=[];
    for(const unit of variant.profile.units){
      const options=variant.profile.options.filter(o=>o.from===unit.square);
      const safeMoves=[];
      for(const option of options)if(live(option.state)&&option.replies.length&&option.replies.every(r=>live(r.state)&&r.present===true))safeMoves.push(option.move);
      units.push({...unit,legalCount:options.length,safeMoves,safeCount:safeMoves.length});
    }
    summaries.push({move:variant.move,units});
  }
  const actor=panel.actor,enemy=actor==='w'?'b':'w',own=actual.control[actor].controlled,other=alternative.control[actor].controlled;
  const added=own.filter(s=>!other.includes(s)),removed=other.filter(s=>!own.includes(s));
  const witness={experiment:'E182',panel,before:panel.before,after:actual.state.fen,actor,played:input.move,san:actual.san,summaries,controlComparison:{own,enemy:actual.control[enemy].controlled,alternativeOwn:other,added,removed},room:null,spaceAdvantage:null,cramped:null};
  const a=summaries.find(s=>s.move===input.move).units,b=summaries.find(s=>s.move===input.materialAlternative).units;
  let valid=!panel.claimContexts.length&&live(actual.state)&&live(alternative.state)&&added.length>0&&removed.length===0&&a.length===b.length;
  const vector=[],losses=[];
  for(const unit of a){
    const previous=b.find(p=>p.square===unit.square&&p.type===unit.type);
    if(!previous||unit.safeCount>previous.safeCount){valid=false;continue;}
    vector.push({square:unit.square,type:unit.type,actual:unit.safeCount,alternative:previous.safeCount});
    for(const move of previous.safeMoves){
      if(unit.safeMoves.includes(move))continue;
      const option=actual.profile.options.find(o=>o.move===move);
      if(!option||!added.includes(option.to)){valid=false;continue;}
      const captures=[];
      for(const r of option.replies)if(r.piece==='p'&&r.from===actual.to&&r.victim===option.to&&r.captured===unit.type&&live(r.state)&&r.present===false)captures.push({move:r.move,san:r.san,from:r.from,to:r.to,victim:r.victim,after:r.state.fen});
      if(!captures.length)valid=false;
      losses.push({unit:unit.square,type:unit.type,option:move,destination:option.to,captures});
    }
  }
  if(valid&&losses.length&&vector.some(v=>v.actual<v.alternative)){
    witness.room={vector,actualTotal:a.reduce((n,u)=>n+u.safeCount,0),alternativeTotal:b.reduce((n,u)=>n+u.safeCount,0),losses};
    if(own.length>actual.control[enemy].controlled.length)witness.spaceAdvantage={ownCount:own.length,enemyCount:actual.control[enemy].controlled.length,alternativeOwnCount:other.length,added};
    const cramped=vector.filter(v=>v.actual<=1&&v.actual<v.alternative);if(cramped.length>=2)witness.cramped={units:cramped};
  }
  witness.material={before:panel.balance,actual:actual.balance,alternative:alternative.balance,foregone:alternative.balance-actual.balance,alternativeGain:alternative.balance-panel.balance};
  expected.available=Boolean(witness.room&&witness.material.foregone>0&&witness.material.alternativeGain>=1);
  expected.status=panel.claimContexts.length?'claim-rule-prerequisite':expected.available?'proven':'compared';expected.witness=witness;
  return done();
}
