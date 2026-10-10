import {mkdir,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {openResearchData} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {white} from './fixtures.mjs';
import {explainMove} from './queen.mjs';
import {checkWitness} from './check-witness.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),rows=[];for(const f of white.slice(0,6)){const result=explainMove(f);if(result.queenPlacementAnalysis.witness)checkWitness(f,result);rows.push({input:f,result});console.log(JSON.stringify({id:f.id,status:result.queenPlacementAnalysis.status,ids:result.events.filter(e=>e.evidence?.experiment==='E162').map(e=>e.id),nodes:result.queenPlacementAnalysis.nodes,policy:result.queenPlacementAnalysis.witness?.policies}));}const dir='research/experiments/E162-queen-placement-threats';await mkdir(dir+'/evidence',{recursive:true});await writeFile(dir+'/evidence/smoke.json.gz',gzipSync(JSON.stringify({receipt:data.receipt,sourceHashes:await bindings([dir+'/code/smoke.mjs']),rows}),{level:9}));
