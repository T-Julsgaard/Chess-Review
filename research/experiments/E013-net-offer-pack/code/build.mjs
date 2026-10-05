import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {parents} from './inputs.mjs';
import {select} from './selection.mjs';
import {htmlFor} from '../../E005-category-review/code/build.mjs';
if(process.argv.length!==2)throw Error('No arguments supported');
try{await stat(new URL('../evidence/cases.json',import.meta.url));throw Error('Existing pack; preserve reviews and create a separate registered study');}catch(e){if(e.code!=='ENOENT')throw e;}
const access=await openResearchData(['D001'],{purpose:'examples'}),input=await parents(access),selection=select(input.dataset,input.context,input.excluded,input.board),out=new URL('../evidence/',import.meta.url);await mkdir(out,{recursive:true});
if(!selection.complete){await writeFile(new URL('inconclusive-selection.json',out),JSON.stringify({schema:'E013-selection-incomplete-v1',diagnostics:selection.diagnostics,elapsedMs:selection.elapsedMs,dataEligibility:access.receipt},null,2)+'\n');console.log(JSON.stringify({complete:false,diagnostics:selection.diagnostics}));process.exitCode=2;}else{
  const cases=selection.selected.map(c=>c.presentation),pack={schema:'E013-review-pack-v1',rubric:'v1',packId:sha256(JSON.stringify(cases)),cases},key={schema:'E013-private-selection-v1',packId:pack.packId,diagnostics:selection.diagnostics,cases:selection.selected.map(c=>({...c,origin:access.gameOrigin(c.gameId)}))},
    template=(await readFile(new URL('../../E005-category-review/code/review.html',import.meta.url),'utf8')).replaceAll('E005','E013'),script=(await readFile(new URL('../../E005-category-review/code/review.js',import.meta.url),'utf8')).replaceAll('E005','E013'),html=htmlFor(pack,template,script),review=new URL('../review/',import.meta.url);
  if(Buffer.byteLength(JSON.stringify(pack))+Buffer.byteLength(JSON.stringify(key))+Buffer.byteLength(html)>2*1024*1024)throw Error('Retained pack exceeds cap');
  await mkdir(review,{recursive:true});for(const [name,value] of [['cases.json',pack],['selection-key.json',key],['policy.json',input.policy]])await writeFile(new URL(name,out),JSON.stringify(value,null,2)+'\n');await writeFile(new URL('review.html',review),html);
  const run={schema:'research-run-v1',id:'E013-net-offer-pack',date:'2026-10-05',sourceRevision:execFileSync('git',['rev-parse','HEAD'],{cwd:fileURLToPath(new URL('../../../../',import.meta.url)),encoding:'utf8',windowsHide:true}).trim(),command:'node research/experiments/E013-net-offer-pack/code/build.mjs',environment:{node:process.version},dataEligibility:access.receipt,
    elapsedMs:selection.elapsedMs,diagnostics:selection.diagnostics,packId:pack.packId,boardBlockSha256:input.board.blockSha256,engineSearches:0,propertyAssessments:0,humanLabelsUsed:0,
    codeSha256:Object.fromEntries(await Promise.all(['build.mjs','selection.mjs','inputs.mjs','policy.mjs'].map(async name=>[name,sha256(await readFile(new URL(name,import.meta.url)))]))),presentationSources:{templateSha256:sha256(template),scriptSha256:sha256(script),namespaceTransformation:'E005->E013'},outputs:{}};
  run.outputs=Object.fromEntries(await Promise.all(['cases.json','selection-key.json','policy.json'].map(async name=>[name,sha256(await readFile(new URL(name,out)))])));run.outputs['review/review.html']=sha256(html);await writeFile(new URL('build-run.json',out),JSON.stringify(run,null,2)+'\n');console.log(JSON.stringify({complete:true,cases:16,packId:pack.packId,diagnostics:selection.diagnostics,elapsedMs:selection.elapsedMs,bytes:Buffer.byteLength(html)}));
}
