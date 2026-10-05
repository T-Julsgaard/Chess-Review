import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {Chess} from '../../../../lib/chess.js';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {engineConfig} from '../../../../tools/calibration/engine.mjs';
import {queryKey,validateSearch} from '../../E008-human-quality-curves/code/queries.mjs';
import {prepare} from '../../E008-human-quality-curves/code/prepare.mjs';
import {labels} from '../../E008-human-quality-curves/code/curves.mjs';
import {selectGames,decision,drift,summary} from './method.mjs';

export function evaluate(evidence,baseline,config){
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),games=selectGames(baseline.games);
  if(evidence.schema!=='E009-search-observations-v1'||!evidence.complete||!same(evidence.engineConfig,config)||evidence.configHash!==sha256(JSON.stringify(config))||evidence.baselineConfigHash!==baseline.configHash||!same(evidence.games,games)||evidence.positions.length!==45)throw Error('Changed cohort or search protocol');
  const basePositions=new Map(baseline.positions.map(p=>[p.gameId,p])),baseSearches=new Map(baseline.searches.map(r=>[r.key,r])),searches=new Map(),used=new Set(),records=[];
  for(const r of evidence.searches){
    validateSearch(r);if(searches.has(r.key)||r.key!==queryKey(evidence.configHash,r.history,r.restricted))throw Error('Duplicate/changed search key');
    if(r.nodes!==Number(/\bnodes (\d+)/.exec(r.rawInfo)?.[1])||r.depth!==Number(/\bdepth (\d+)/.exec(r.rawInfo)?.[1])||r.finalNodes!==Number(/\bnodes (\d+)/.exec(r.finalSearchInfo)?.[1])||r.pv!==/\bpv (.+)$/.exec(r.rawInfo)?.[1])throw Error('Raw diagnostics differ');searches.set(r.key,r);
  }
  function lookup(key,history,restricted,fen){
    const r=searches.get(key);if(!r||key!==queryKey(evidence.configHash,history,restricted)||!same(r.history,history)||r.restricted!==restricted)throw Error('Changed search binding');
    if(!used.has(key)){const board=new Chess(fen);for(const move of r.pv.split(' '))board.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]});used.add(key);}return r;
  }
  for(let i=0;i<games.length;i++){
    const game=games[i],p=evidence.positions[i],base=basePositions.get(game.id),core=['gameId','split','ply','history','color','played','legalMoves'];
    if(!core.every(k=>same(p[k],base[k]))||p.baselineRootKey!==base.rootKey||!same(p.alternatives.map(a=>({move:a.move,key:a.baselineKey})),base.alternatives))throw Error('Changed focal choice or alternatives');
    const board=new Chess();for(const move of p.history)board.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]});
    const low=decision(baseSearches.get(base.rootKey),base.alternatives.map(a=>({move:a.move,score:baseSearches.get(a.key).score})),p.played),
      high=decision(lookup(p.rootKey,p.history,null,board.fen()),p.alternatives.map(a=>({move:a.move,score:lookup(a.key,p.history,a.move,board.fen()).score})),p.played);
    records.push(drift(game,p,low,high));
  }
  if(used.size!==searches.size)throw Error('Injected unused searches');
  const groups=[...new Set(records.flatMap(labels))].sort().map(label=>{const rs=records.filter(r=>labels(r).includes(label));return{label,sparse:rs.length<20,...summary(rs)};});
  return{schema:'E009-search-stability-v1',summary:summary(records),roles:Object.fromEntries(['train','validation'].map(role=>[role,summary(records.filter(r=>r.split===role))])),groups,records,
    diagnostics:{uniqueSearches:searches.size,earlierExactScores:evidence.searches.filter(r=>r.rawInfo!==r.finalSearchInfo).length,exactRecoveries:evidence.searches.filter(r=>r.exactRecovery).length,
      selectedNodes:[Math.min(...evidence.searches.map(r=>r.nodes)),Math.max(...evidence.searches.map(r=>r.nodes))],finalNodes:[Math.min(...evidence.searches.map(r=>r.finalNodes)),Math.max(...evidence.searches.map(r=>r.finalNodes))]},
    confirmation:false,promoted:false,interpretation:'Fixed45-game development operational check; higher-budget scores are not human ground truth'};
}
async function main(){
  const root=fileURLToPath(new URL('../../../../',import.meta.url)),args=process.argv.slice(2);
  if(args.length&&!(args.length===2&&args[0]==='--out'&&args[1]))throw Error('Use --out <research directory>');
  const out=args.length?path.resolve(root,args[1]):fileURLToPath(new URL('../evidence/',import.meta.url));if(!out.startsWith(path.join(root,'research')+path.sep))throw Error('Output must stay in research');
  const started=performance.now(),access=await openResearchData(['D001','D002'],{purpose:'reuse'}),dataset=await access.readJson('research/datasets/D002-fresh-prefix/games.json.gz'),
    baseline=await access.readJson('research/experiments/E008-human-quality-curves/evidence/sf19-observations.json.gz'),evidence=await access.readJson('research/experiments/E009-search-stability/evidence/sf19-observations.json.gz'),
    file=path.join(root,'engine/stockfish-19-lite-single.js');
  prepare(baseline,dataset,await engineConfig(file,{kind:'nodes',value:20000}));
  const result=evaluate(evidence,baseline,await engineConfig(file,{kind:'nodes',value:80000})),bytes=JSON.stringify(result,null,2)+'\n';await mkdir(out,{recursive:true});await writeFile(path.join(out,'results.json'),bytes);
  await writeFile(path.join(out,'run.json'),JSON.stringify({schema:'research-run-v1',id:'E009-stability-assessment',date:'2026-10-05',sourceRevision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim(),
    command:'node research/experiments/E009-search-stability/code/evaluate.mjs'+(args.length?' --out '+args[1]:''),dataEligibility:access.receipt,
    codeSha256:Object.fromEntries(await Promise.all(['evaluate.mjs','method.mjs'].map(async p=>[p,sha256(await readFile(new URL(p,import.meta.url)))]))),
    environment:{node:process.version,platform:process.platform,arch:process.arch},engineSearches:0,elapsedMs:performance.now()-started,outputs:{'results.json':sha256(bytes)},evaluationRole:'Fixed45-game development operational stability; no human-validity/confirmation claim'},null,2)+'\n');
  console.log(JSON.stringify({summary:result.summary,diagnostics:result.diagnostics},null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
