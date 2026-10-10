import {writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {openResearchData} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {fixtures} from './fixtures.mjs';
import {explainMove} from './freedom.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),dir='research/experiments/E151-piece-freedom-history',report={schema:'E151-smoke-v1',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes:await bindings([dir+'/code/smoke.mjs']),eligibilityReceipt:data.receipt,rows:[]};await mkdir('research/runs/E151/smoke',{recursive:true});for(const f of [fixtures[0],fixtures[2]]){const start=performance.now();let result=null,error=null;try{result=explainMove(f);}catch(e){error=e.message;}const elapsedMs=Math.round(performance.now()-start);report.rows.push({fixture:f,result,error,elapsedMs});await writeFile('research/runs/E151/smoke/results.json.gz',gzipSync(Buffer.from(JSON.stringify(report)+'\n'),{level:9}));console.log(JSON.stringify({id:f.id,elapsedMs,error,observed:result?.events.filter(e=>e.evidence?.experiment==='E151').map(e=>e.id),status:result?.pieceFreedomAnalysis.status,nodes:result?.pieceFreedomAnalysis.nodes,ranking:result?.pieceFreedomAnalysis.witness?.ranking.units.map(u=>({square:u.square,count:u.safeCount})),improvement:result?.pieceFreedomAnalysis.witness?.improvement}));}
