import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {openResearchData} from '../../../data-policy.mjs';
import {curveFreeze} from './models.mjs';
if(process.argv.length!==2)throw Error('No arguments supported');
const access=await openResearchData(['D001','D002'],{purpose:'reuse'}),source=await access.readJson('research/experiments/E010-candidate-stability/evidence/models.json'),freeze=curveFreeze(source),
  out=fileURLToPath(new URL('../evidence/',import.meta.url));await mkdir(out,{recursive:true});await writeFile(out+'models.json',JSON.stringify(freeze,null,2)+'\n');
console.log(JSON.stringify({curvesSha256:freeze.curvesSha256,modelFits:0,choiceModelIncluded:false,registered:false}));
