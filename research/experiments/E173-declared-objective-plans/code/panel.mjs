import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {describe,flags} from '../../E153-second-target-defense/code/panel.mjs';
const identity=(unit,m)=>m.captured&&describe(m).victim===unit?null:m.from===unit?m.to:unit;
export function collectPanel(ctx,limit){
  let nodes=0;const tick=()=>{if(++nodes>limit)throw Error('plan-budget');},i=ctx.config,c=legalPosition(i.history.fen),actor=ctx.actor;
  tick();for(const m of i.history.moves){tick();c.move(m);}
  const state=unit=>{const f=flags(c),live=!Object.values(f).some(Boolean);return{fen:c.fen(),unit,flags:f,goal:live&&unit!==null&&c.get(unit)?.type==='r'&&c.get(unit)?.color===actor&&unit[1]===(actor==='w'?'7':'2')};};
  function query(unit,plies){
    const trace=[];let claim=false;
    function visit(square,remaining){
      tick();const s=state(square);trace.push({fen:s.fen,unit:square,remaining});claim||=s.flags.fifty||s.flags.threefold;
      const moves=c.isGameOver()?[]:c.moves({verbose:true}).sort((a,b)=>uci(a).localeCompare(uci(b))),node={state:s,remaining,legal:moves.map(describe),win:false,kind:null,branches:[]};
      if(s.goal){node.win=true;node.kind='goal';return node;}
      if(c.isGameOver()){node.kind='terminal';return node;}
      if(!remaining){node.kind='limit';return node;}
      const own=c.turn()===actor;
      for(const m of moves){c.move(uci(m));let child;try{child=visit(identity(square,m),remaining-1);}finally{c.undo();}node.branches.push({played:describe(m),child});if(child.win===own){node.win=own;node.kind=own?'choice':'counterchoice';return node;}}
      node.win=!own;node.kind=own?'all-fail':'all';return node;
    }
    const tree=visit(unit,plies);return{actor,plies,tree,trace,claim};
  }
  const p={schema:'E173-objective-policy-panel-v1',config:i,actor,root:state(i.objective.unit),variants:[],nodes:0};
  for(const move of [i.move,i.alternative]){tick();const m=c.move(move),unit=identity(i.objective.unit,m);p.variants.push({played:describe(m),state:state(unit),query:query(unit,i.plies-1)});c.undo();}
  p.nodes=nodes;return p;
}
