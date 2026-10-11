import {fixtures as tempos} from '../../E143-forcing-tempo-initiative/code/fixtures.mjs';
import {fixtures as kings} from '../../E164-king-hunt-shelter/code/fixtures.mjs';
import {flip} from '../../FRIEND-shared/lib.mjs';
const clean=f=>({fen:f.fen,move:f.move,history:f.history}),flipMove=m=>flip(m.slice(0,2))+flip(m.slice(2,4))+m.slice(4);
export const cases=[];
for(let color=0;color<2;color++){
 const good=tempos[color],input={...clean(good),alternative:color?flipMove('g5h5'):'g5h5'},options={enabled:true,family:'tempo'};
 cases.push({id:'useful-'+color,input,options,expected:['C0758']},{id:'wasted-'+color,input:{...input,move:input.alternative,alternative:input.move},options,expected:['C0759']});
 for(const [name,index,H]of [['no-counterattack',10,2],['short-horizon',4,1]]){const f=tempos[index+color];cases.push({id:name+'-'+color,input:{...clean(f),alternative:input.alternative},options:{...options,plies:H},expected:[]});}
 for(const [name,index]of [['queen',10],['generic',6],['extra-minor',12]]){const f=kings[index+color],safe=clean(f),bad=f.kingShelterAlternative,base={...safe,move:bad,alternative:safe.move},o={enabled:true,family:'exposure'};cases.push({id:name+'-exposed-'+color,input:base,options:o,expected:name==='queen'?['C0724']:[]},{id:name+'-reverse-'+color,input:{...safe,alternative:bad},options:o,expected:[]});}
}
