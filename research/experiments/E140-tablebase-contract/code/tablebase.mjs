import {explainMove as parent,priority} from '../../E139-recorded-geometric-traps/code/traps.mjs';
import {normalizeSynthetic} from './contract.mjs';
export {priority};
export function explainMove(input){
 const enabled=input.tablebaseContractTags===undefined?false:input.tablebaseContractTags;if(typeof enabled!=='boolean')throw Error('tablebaseContractTags must be boolean');if(!enabled)return parent(input);
 const limit=input.maxTablebaseContractNodes===undefined?50000:input.maxTablebaseContractNodes;if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxTablebaseContractNodes must be integer0..50000');const base=parent(input);let nodes=0,status='missing-contract',view=null;const budget={tick(){if(++nodes>limit)throw Error('tablebase-contract-budget');}},done=()=>({...base,schema:'coach-concepts-E140-prerequisite',tablebaseContractAnalysis:{limit,nodes,status,view}});
 if(base.error||base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted'){status='not-applicable';return done();}const record=input.tablebaseContract;if(record===undefined)return done();
 if(record?.kind!=='synthetic-contract'){status='admission-unavailable';return done();}
 try{view=normalizeSynthetic(input,record,budget);status='synthetic-contract-checked';}catch(e){if(e.message!=='tablebase-contract-budget')throw e;status='exhausted';view=null;}return done();
}
