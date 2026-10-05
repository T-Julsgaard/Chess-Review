import {sha256} from '../../../data-policy.mjs';
export function curveFreeze(source){
  if(source.schema!=='E010-model-freeze-v1'||source.models.fixed.curve.coefficient!==.368208||source.models.cp.curve.coefficient!==.22349935786891822||['fixed','cp'].some(k=>source.models[k].curve.schema!=='E008-curve-v1'||source.models[k].curve.kind!=='cp'||source.models[k].curve.boundary!==null))throw Error('Frozen outcome source differs');
  const curves={fixed:source.models.fixed.curve,cp:source.models.cp.curve};
  return{schema:'E011-curve-freeze-v1',curves,curvesSha256:sha256(JSON.stringify(curves)),primaryConfig:source.engineConfig,primaryConfigHash:source.configHash,
    source:'research/experiments/E010-candidate-stability/evidence/models.json',sourceModelsSha256:source.modelsSha256,modelFits:0,choiceModelIncluded:false};
}
export function validateFreeze(freeze,source,config){if(JSON.stringify(freeze)!==JSON.stringify(curveFreeze(source))||JSON.stringify(config)!==JSON.stringify(freeze.primaryConfig))throw Error('Outcome freeze/configuration differs');return true;}
