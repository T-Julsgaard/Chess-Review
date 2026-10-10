import {openResearchData} from '../../../data-policy.mjs';
import {fixtures} from './fixtures.mjs';
import {explainMove} from './minority.mjs';
await openResearchData(['D001'],{purpose:'test'});
for(const f of fixtures.slice(0,4)){const start=performance.now(),r=explainMove(f);console.log(JSON.stringify({id:f.id,elapsedMs:Math.round(performance.now()-start),observed:r.events.filter(e=>e.evidence?.experiment==='E149').map(e=>e.id),status:r.minorityStructureAnalysis.status,nodes:r.minorityStructureAnalysis.nodes,health:r.minorityStructureAnalysis.witness?.health,recorded:r.minorityStructureAnalysis.witness?.recorded?.target}));}
