import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {selectCohort,normalize} from '../../../fresh-format.mjs';

const root=fileURLToPath(new URL('../../../../',import.meta.url)),base='research/datasets/D002-fresh-prefix/';
const args=process.argv.slice(2);if(args.length&&!(args.length===2&&args[0]==='--out'))throw Error('Only --out <research path> is allowed');
const out=args.length?path.resolve(root,args[1]):fileURLToPath(new URL('../evidence/',import.meta.url));if(!out.startsWith(path.join(root,'research')+path.sep))throw Error('Output escapes research');
const access=await openResearchData(['D001','D002'],{purpose:'reuse'}),sources=await access.readJson(base+'sources.json'),games=await access.readJson(base+'games.json.gz'),excluded=await access.readJson(base+'exclusions.json'),run=await access.readJson(base+'run.json');
const frames=[];
for(const source of sources.sources)for(const frame of source.frames)frames.push({name:frame.artifact,month:source.month,decoded:await access.readFrame(frame.artifact)});
const rebuilt=selectCohort(frames,excluded);
if(JSON.stringify(rebuilt.games)!==JSON.stringify(games))throw Error('Rebuilt normalized records differ');
const rebuiltBytes=gzipSync(JSON.stringify(rebuilt.games)+'\n');if(sha256(rebuiltBytes)!==access.receipt.inputHashes[base+'games.json.gz'])throw Error('Compressed reconstruction differs');
const players=new Set(),seen=new Set(),splits={};
for(const game of games){
  if(seen.has(game.id)||game.players.some(p=>players.has(p.id)||excluded.playerIds.includes(p.id))||excluded.gameIds.includes(game.id))throw Error('Repeated or previously used identity');seen.add(game.id);game.players.forEach(p=>players.add(p.id));
  splits[game.split]=(splits[game.split]||0)+1;
  const frame=frames.find(f=>f.name===game.locator.artifact),raw=frame.decoded.subarray(game.locator.start,game.locator.end);
  const {sha256:pgnhash,...locator}=game.locator,normalized=normalize(raw,game.sourceMonth,locator),{split,...original}=game;
  if(sha256(raw)!==pgnhash||JSON.stringify(normalized)!==JSON.stringify(original)||access.gameOrigin(game.id).rawPGN.sha256!==pgnhash)throw Error('Individual raw PGN locator differs');
}
if(JSON.stringify(splits)!==JSON.stringify({train:450,validation:150,test:300}))throw Error('Split counts differ');
for(const [name,h]of Object.entries(run.outputs))if(access.receipt.inputHashes[name]!==h)throw Error('Acquisition output hash differs');
const result={schema:'E007-provenance-verification-v1',passed:true,games:seen.size,uniquePlayers:players.size,splits,priorGamePlayerOverlap:0,
  exactNormalizedRebuild:true,exactCompressedRebuild:true,individualRawLocators:true,modelEvaluations:0,exclusionCounts:rebuilt.exclusions,
  acquisitionRevision:run.sourceRevision,acquisitionCodeHashes:run.codeSha256,dataEligibility:access.receipt,verifierSha256:sha256(await readFile(fileURLToPath(import.meta.url)))};
await mkdir(out,{recursive:true});await writeFile(path.join(out,'verification.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:true,games:seen.size,uniquePlayers:players.size,splits,priorGamePlayerOverlap:0,exactCompressedRebuild:true,modelEvaluations:0}));
