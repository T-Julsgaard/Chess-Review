import {openResearchData,sha256} from '../../../data-policy.mjs';
await openResearchData(['D001'],{purpose:'test'});
const {readFile,writeFile,readdir,stat}=await import('node:fs/promises');
const {default:assert}=await import('node:assert/strict');
const base='research/experiments/E080-pawn-shield-defense/evidence';
const dirs=[base,'research/runs/E080/repeat',process.argv[3]];
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const runs=await Promise.all(dirs.map(d=>json(d+'/run.json'))),main=runs[0];
assert.equal(main.codeRevision,process.argv[2]);
assert.equal(runs[2].workingTreeStatus,'');for(const r of runs){assert.ok(['','?? research/experiments/E080-pawn-shield-defense/evidence/'].includes(r.workingTreeStatus),r.workingTreeStatus);for(const field of ['codeRevision','inputHashes','outputHashes','metrics','environment','config','eligibilityReceipt'])assert.deepEqual(r[field],main[field],field);}
for(const[file,hash]of Object.entries(main.inputHashes))assert.equal(sha256(file.endsWith('.gz')?await readFile(file):(await readFile(file,'utf8')).replaceAll('\r\n','\n')),hash,file);
for(let i=0;i<3;i++)for(const[file,hash]of Object.entries(runs[i].outputHashes))assert.equal(sha256(await readFile(dirs[i]+'/'+file)),hash,dirs[i]+'/'+file);
const argv=process.argv;process.argv=[argv[0],argv[1],base];
await import('./audit.mjs');process.argv=argv;
await writeFile(base+'/repeat-run.json',JSON.stringify(runs[1],null,2)+'\n');
await writeFile(base+'/clean-run.json',JSON.stringify(runs[2],null,2)+'\n');
let bytes=0;for(const file of await readdir(base))bytes+=(await stat(base+'/'+file)).size;
console.log(JSON.stringify({threeExactRuns:true,revision:main.codeRevision,inputCount:Object.keys(main.inputHashes).length,bytes,elapsedMs:runs.map(r=>Math.round(r.elapsedMs)),outputHashes:main.outputHashes},null,2));