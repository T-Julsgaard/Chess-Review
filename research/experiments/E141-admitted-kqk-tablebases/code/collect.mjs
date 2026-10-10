import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {openResearchTablebases} from '../../../tablebase-data-policy.mjs';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
export async function collectPanel(input,python){
 const game=await openResearchData(['D001'],{purpose:'test'}),max=input.maxTablebaseProbes===undefined?128:input.maxTablebaseProbes;if(!Number.isSafeInteger(max)||max<0||max>256)throw Error('maxTablebaseProbes must be integer0..256');const h=validateHistory(input),c=legalPosition(h?.start||input.fen);for(const m of h?.moves||[])c.move(m);const units=c.board().flat().filter(Boolean);if(units.length>3||units.some(p=>!['k','q'].includes(p.type))||c.fen().split(' ')[2]!=='-'||c.fen().split(' ')[3]!=='-')throw Error('Unsupported T001 material/rights');c.move(input.move);c.undo();const required=1+c.moves().length;
 const bundle={schema:'E141-admitted-panel-v1',status:'pending',maxProbes:max,requiredProbes:required,gameGuardReceipt:game.receipt,tablebaseReceipt:null,rawStdout:null,panel:null,error:null};if(max<required){bundle.status='preflight-budget-unavailable';return bundle;}
 const data=await openResearchTablebases();bundle.tablebaseReceipt=data.receipt;const dir='research/experiments/E141-admitted-kqk-tablebases',lock=JSON.parse(await readFile(dir+'/vendor/dependency.json','utf8'));for(const [name,hash]of Object.entries(lock.files))if(sha256(await readFile(dir+'/vendor/'+name))!==hash)throw Error('Changed probe dependency '+name);
 try{bundle.rawStdout=execFileSync(python,[dir+'/code/probe.py'],{input:JSON.stringify({input:{fen:c.fen(),...(h?{history:{fen:h.start,moves:h.moves}}:{})},directory:data.directory,files:data.receipt.files}),encoding:'utf8',timeout:15000,maxBuffer:1024*1024,windowsHide:true,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});bundle.panel=JSON.parse(bundle.rawStdout);if(bundle.panel.positionProbes!==required||bundle.panel.positionProbes>max)throw Error('Probe ledger differs');bundle.status='complete';}
 catch(e){bundle.status='collection-error';bundle.error=e.message;}return bundle;
}
