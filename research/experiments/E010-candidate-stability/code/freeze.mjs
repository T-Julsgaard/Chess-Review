import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {openResearchData} from '../../../data-policy.mjs';
import {makeFreeze} from './models.mjs';
if(process.argv.length!==2)throw Error('No arguments supported');
const access=await openResearchData(['D001','D002'],{purpose:'reuse'}),base='research/experiments/E008-human-quality-curves/evidence/',
  report=await access.readJson(base+'results.json'),collection=await access.readJson(base+'collection-run.json'),
  verified=await access.readJson(base+'verification.json'),clean=await access.readJson(base+'clean-replay.json');
if(!verified.passed||!clean.passed||!verified.exactReport||!clean.exactReport)throw Error('Source verification unavailable');
const freeze=makeFreeze(report,collection.engineConfig),directory=fileURLToPath(new URL('../evidence/',import.meta.url));
await mkdir(directory,{recursive:true});await writeFile(directory+'models.json',JSON.stringify(freeze,null,2)+'\n');
console.log(JSON.stringify({modelsSha256:freeze.modelsSha256,configHash:freeze.configHash,modelFits:0,engineSearches:0,registered:false}));
