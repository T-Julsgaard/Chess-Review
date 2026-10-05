import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {collectPanel,sharedHashes} from '../../../root-panel.mjs';
import {loadCohort} from './inputs.mjs';
if(process.argv.length!==2)throw Error('No arguments supported');
const root=fileURLToPath(new URL('../../../../',import.meta.url)),access=await openResearchData(['D001'],{purpose:'collect'}),input=await loadCohort(access),codeSha256=Object.fromEntries(await Promise.all(['collect.mjs','inputs.mjs','selection.mjs','policy.mjs'].map(async name=>[name,sha256(await readFile(new URL(name,import.meta.url)))]))),
  sharedCodeSha256=await sharedHashes(root,['research/root-panel.mjs','research/experiments/E012-offer-evidence/code/board.mjs','research/experiments/E012-offer-evidence/code/queries.mjs','research/experiments/E012-offer-evidence/code/policy.mjs']);
await collectPanel({root,id:'E013',selected:input.selected,games:input.selected.map(c=>input.dataset.find(g=>g.id===c.gameId)),policy:input.policy,packId:input.pack.packId,access,codeSha256,sharedCodeSha256,engineFile:path.join(root,'engine/stockfish-nnue.js'),out:fileURLToPath(new URL('../evidence/',import.meta.url)),command:'node research/experiments/E013-net-offer-pack/code/collect.mjs'});
