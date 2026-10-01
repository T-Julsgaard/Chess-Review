import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {args,json,save,hashFile} from './io.mjs';
const categories=['brilliant','great','best','excellent','good','inacc','miss','mistake','blunder','book'];
export function categoryBenchmark(records) {
  if(!Array.isArray(records)||!records.length)throw Error('No independently reviewed labels');
  const ids=new Set(),matrix={},counts={},ambiguous=[];let correct=0,scored=0,predicted=0;
  for(const row of records) {
    if(!row.id||ids.has(row.id)||!row.gameId||row.labelSource!=='human-review'
      || !row.provenance?.url || !row.provenance?.license || !Array.isArray(row.reviews)||row.reviews.length<2
      || new Set(row.reviews.map(r=>r.reviewer)).size!==row.reviews.length
      || row.reviews.some(r=>!r.reviewer||!categories.includes(r.label)))throw Error('Missing independent review/provenance');
    ids.add(row.id);
    if(row.prediction!=null&&!categories.includes(row.prediction))throw Error('Invalid prediction');
    const labels=[...new Set(row.reviews.map(r=>r.label))];
    if(labels.length!==1){ambiguous.push(row.id);continue;}
    const label=labels[0],p=row.prediction??'unconfirmed';scored++;
    if(row.prediction!=null)predicted++;
    if(p===label)correct++;
    matrix[label]??={};matrix[label][p]=(matrix[label][p]??0)+1;
    counts[label]=(counts[label]??0)+1;
  }
  const perClass=categories.map(label=>{
    const tp=matrix[label]?.[label]??0,n=counts[label]??0;
    const assigned=Object.values(matrix).reduce((s,r)=>s+(r[label]??0),0);
    return {label,n,precision:assigned?tp/assigned:null,recall:n?tp/n:null};
  });
  return {records:records.length,scored,ambiguous,coverage:scored?predicted/scored:null,
    exactAgreement:scored?correct/scored:null,perClass,matrix,
    interpretation:'Agreement with supplied consensus labels. Reviewer independence and correctness require external audit; conflicting labels are reported, not treated as negative examples.'};
}
async function main(){
  const o=args({input:null,out:null});if(!o.input||!o.out)throw Error('Provide independently reviewed input and output');
  const input=await json(o.input);if(input.schema!=='category-benchmark-v1')throw Error('Unknown annotation schema');
  await save(o.out,{sourceSha256:await hashFile(o.input),...categoryBenchmark(input.records)});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
