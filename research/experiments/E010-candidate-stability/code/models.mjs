import {sha256} from '../../../data-policy.mjs';
export function makeFreeze(report,engineConfig){
  if(report.schema!=='E008-human-curves-v1'||report.developmentShortlist!=='cp'||!report.roles.validation.comparisons.cp.passed)throw Error('No accepted CP development shortlist');
  const models={fixed:report.models.fixed,cp:report.models.cp};
  if(models.fixed.curve.coefficient!==.368208||models.fixed.choice.temperature!==15.464491662877624||models.cp.curve.coefficient!==.22349935786891822||models.cp.choice.temperature!==20.939735269175777||models.cp.curve.boundary||models.cp.choice.boundary)throw Error('Registered model constants differ');
  return{schema:'E010-model-freeze-v1',models,modelsSha256:sha256(JSON.stringify(models)),engineConfig,configHash:sha256(JSON.stringify(engineConfig)),
    source:'research/experiments/E008-human-quality-curves/evidence/results.json',fits:0,confirmation:false};
}
export function validateFreeze(freeze,report,engineConfig){
  if(JSON.stringify(freeze)!==JSON.stringify(makeFreeze(report,engineConfig)))throw Error('Model freeze differs from registered source');return true;
}
