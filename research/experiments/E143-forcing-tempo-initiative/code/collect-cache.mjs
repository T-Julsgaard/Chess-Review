import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {openResearchData} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {fixtures} from './fixtures.mjs';
import {collectPanel} from './panel.mjs';
await openResearchData(['D001'],{purpose:'test'});const dir='research/experiments/E143-forcing-tempo-initiative',sourceHashes=await bindings([dir+'/code/panel.mjs',dir+'/code/fixtures.mjs']);let prior=null;try{const {gunzipSync}=await import('node:zlib');prior=JSON.parse(gunzipSync(await readFile(dir+'/evidence/observations.json.gz')));}catch(e){if(e.code!=='ENOENT')throw e;}const matched=prior&&prior.schema==='E143-saved-panels-v2'&&JSON.stringify(prior.sourceHashes)===JSON.stringify(sourceHashes),panels=matched?[...prior.panels]:[];
for(const f of fixtures){if(!f.history||f.maxForcingTempoNodes===0)continue;const key={fen:f.fen,history:f.history,plies:f.forcingTempoPlies};if(!panels.some(r=>JSON.stringify(r.key)===JSON.stringify(key)))panels.push({key,panel:collectPanel(f,key.plies,50000)});}
await mkdir(dir+'/evidence',{recursive:true});await writeFile(dir+'/evidence/observations.json.gz',gzipSync(Buffer.from(JSON.stringify({schema:'E143-saved-panels-v2',revision:matched?prior.revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes,panels})+'\n'),{level:9}));console.log(JSON.stringify({panels:panels.length,reused:matched?panels.length:0,sourceInputs:Object.keys(sourceHashes).length,nodes:panels.map(r=>r.panel.nodes)}));
