import {sha256} from '../../../data-policy.mjs';
export const baselineRevision='becc0629688ef8814c247f94fa449dc3e4247faf';
export function makePolicy(configs,boardHash){
  if(!/^[a-f0-9]{64}$/.test(boardHash)||configs['20k'].majorVersion!==18||configs['20k'].budget.kind!=='nodes'||configs['20k'].budget.value!==20000||configs['80k'].budget.kind!=='nodes'||configs['80k'].budget.value!==80000||JSON.stringify({...configs['80k'],budget:configs['20k'].budget})!==JSON.stringify(configs['20k']))throw Error('Wrong frozen engine/board configuration');
  return{schema:'E012-policy-v1',baselineRevision,boardBlockSha256:boardHash,engineConfigs:configs,
    configHashes:Object.fromEntries(Object.entries(configs).map(([k,c])=>[k,sha256(JSON.stringify(c))])),thresholds:{nearBest:.02,minPlayedCp:-50,clearlyWinningCp:500,offersRequired:7,stableCasesRequired:22},
    rules:'E012-offer-evidence-v1',modelFits:0,humanLabelsUsed:0};
}
export function validatePolicy(policy,configs,boardHash){if(JSON.stringify(policy)!==JSON.stringify(makePolicy(configs,boardHash)))throw Error('Frozen offer policy differs');return true;}
