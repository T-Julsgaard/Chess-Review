export {globalUtility,rawScore,fit,temperature,choice,scoreCounts} from '../../E016-relative-cp-choice/code/model.mjs';
export function utility(score){
  if(score?.mate!=null){if(!Number.isInteger(score.mate)||score.mate===0||Object.hasOwn(score,'cp'))throw Error('Ambiguous mate');return score.mate>0?1:0;}
  if(!Number.isInteger(score?.cp))throw Error('Missing integer CP');
  const x=Math.max(-10000,Math.min(10000,score.cp))/100;
  return .5+Math.sign(x)*Math.log1p(Math.abs(x))/(2*Math.log(101));
}
