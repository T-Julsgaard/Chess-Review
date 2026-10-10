import {readFile,readdir} from 'node:fs/promises';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
export const dir='research/experiments/E182-material-activity-space';
export async function fullBindings(){
  const parent='research/experiments/E181-historical-forcing-resources/build.json';
  const manifest=JSON.parse(await readFile(parent,'utf8'));
  return bindings([parent,...Object.keys(manifest.inputHashes),...(await readdir(dir)).filter(n=>n.endsWith('.md')&&n!=='RESULT.md').map(n=>dir+'/'+n),...(await readdir(dir+'/code')).filter(n=>n.endsWith('.mjs')).map(n=>dir+'/code/'+n)]);
}
