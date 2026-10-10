import {Chess} from '../../../../lib/chess.js';
import {Engine,engineConfig} from '../../../../tools/calibration/engine.mjs';
import {openResearchData} from '../../../data-policy.mjs';
import {root,budgets,engineFile,parse,flags} from './observations.mjs';
class CountedEngine extends Engine{
  constructor(file,max){super(file);this.max=max;this.ledger=[];this.stack=[];this.initialCommands=[];}
  send(command){if(this.stack?.length)this.stack.at(-1).commands.push(command);else this.initialCommands?.push(command);return super.send(command);}
  async until(predicate,timeout){const lines=await super.until(predicate,timeout);if(lines.some(l=>l.startsWith('bestmove '))&&this.stack.length)this.stack.at(-1).wireLines=lines;return lines;}
  async search(moves,played,budget){if(this.ledger.length>=this.max)throw Error('engine-panel-search-budget');const row={moves:[...moves],played:played||null,budget:{...budget},commands:[],wireLines:[],result:null,error:null};this.ledger.push(row);this.stack.push(row);try{row.result=await super.search(moves,played,budget);return row.result;}catch(e){row.error=e.message;throw e;}finally{this.stack.pop();}}
}
export async function collectPanel(input){
  const data=await openResearchData(['D001'],{purpose:'test'}),max=input.maxEnginePanelSearches===undefined?256:input.maxEnginePanelSearches;if(!Number.isSafeInteger(max)||max<0||max>512)throw Error('maxEnginePanelSearches must be integer0..512');const r=root(input);if(!r)throw Error('Full standard-startpos history required');const played=r.c.move(input.move);r.c.undo();const required=2*r.c.moves().length+2,b={schema:'E138-engine-observations-v1',observationKind:'local-stockfish',status:'pending',before:r.before,actor:r.actor,played:played.from+played.to+(played.promotion||''),moves:r.moves,maxSearches:max,requiredSearches:required,searchCount:0,config:null,startup:null,eligibilityReceipt:data.receipt,panels:[],ledger:[],error:null};
  if(max<required){b.status='preflight-budget-unavailable';return b;}let engine;
  try{
    b.config=await engineConfig(engineFile,{kind:'nodes',values:budgets});if(b.config.majorVersion!==19)throw Error('Expected pinned Stockfish19');engine=new CountedEngine(engineFile,max);b.startup=await engine.init(b.config);b.startup.commands=[...engine.initialCommands];
    for(const budget of budgets){const p={budget,rows:[],endpoint:null};b.panels.push(p);const legal=r.c.moves({verbose:true}).sort((a,b)=>(a.from+a.to+(a.promotion||'')).localeCompare(b.from+b.to+(b.promotion||'')));
      for(const m of legal){const move=m.from+m.to+(m.promotion||''),observation=await engine.search(r.moves,move,{kind:'nodes',value:budget});p.rows.push({move,observation});}
      const actual=p.rows.find(row=>row.move===b.played),c=new Chess();for(const move of r.moves)c.move(move);const parsed=parse(actual.observation,c,b.played),f=flags(c),endpoint={fen:c.fen(),turn:c.turn(),flags:f,kind:null};p.endpoint=endpoint;
      if(f.mate||f.stalemate||f.insufficient||f.automatic75||f.automatic5)endpoint.kind='terminal';else if(f.fifty||f.threefold)endpoint.kind='claim-sensitive';else{endpoint.kind='searched';endpoint.observation=await engine.search([...r.moves,...parsed.states.map(s=>s.move)],null,{kind:'nodes',value:budget});}
    }
    b.status='complete';
  }catch(e){b.status=e.message==='engine-panel-search-budget'?'exhausted':'collection-error';b.error=e.message;}finally{if(engine){b.ledger=engine.ledger;b.searchCount=engine.ledger.length;engine.close();}}
  return b;
}
