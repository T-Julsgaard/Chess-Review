// Structural field audit only; never print cases, ratings or outcome summaries.
import {writeFile,readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {tagsFor} from '../../../fresh-format.mjs';
if(process.argv.length>2)throw Error('Unknown argument');
const access=await openResearchData(['D001','D002'],{purpose:'inspect'}),base='research/datasets/D002-fresh-prefix/';
const games=await access.readJson(base+'games.json.gz'),sources=await access.readJson(base+'sources.json'),frames=new Map();
for(const source of sources.sources)for(const frame of source.frames)frames.set(frame.artifact,await access.readFrame(frame.artifact));
const names=new Set();
for(const game of games){const raw=frames.get(game.locator.artifact).subarray(game.locator.start,game.locator.end);Object.keys(tagsFor(raw).tags).forEach(name=>names.add(name));}
const result={schema:'E007-metadata-field-audit-v1',selectedGames:games.length,tagNames:[...names].sort(),
  purpose:'Structural metadata only; no candidate metrics or manual case inspection',dataEligibility:access.receipt,auditorSha256:sha256(await readFile(fileURLToPath(import.meta.url)))};
await mkdir(new URL('../evidence/',import.meta.url),{recursive:true});await writeFile(new URL('../evidence/metadata-fields.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({selectedGames:games.length,tagNames:result.tagNames}));
