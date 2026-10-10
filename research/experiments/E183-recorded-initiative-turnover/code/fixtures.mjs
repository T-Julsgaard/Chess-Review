import {Chess} from '../../../../lib/chess.js';
import {reflect,flip} from '../../FRIEND-shared/lib.mjs';
import {fixtures as tempo} from '../../E143-forcing-tempo-initiative/code/fixtures.mjs';
import {white as defense} from '../../E169-passive-defense-counterplay/code/fixtures.mjs';
const move=m=>flip(m.slice(0,2))+flip(m.slice(2,4))+m.slice(4);
function historical(source,base,from,to,recorded,priorAlternative){
  const c=new Chess(base.fen),piece=c.remove(from);c.put(piece,to);
  if(source==='defense')c.remove('h3'); // Registered AMENDMENT.md: clear Qh5-h1.
  const start=c.fen().replace(' w ',' b '),history={fen:start,moves:[recorded]},root=new Chess(start);root.move(recorded);
  return {source,input:{...base,id:'recorded-'+source+'-w',fen:root.fen(),history},options:{priorAlternative,priorPlies:0}};
}
const white=[historical('tempo',tempo[0],'h7','h6','h6h7','d2e1'),historical('defense',defense[1],'g5','h5','h5g5','h5h1')];
export const positiveFixtures=white.flatMap(f=>{
  const reflected=reflect(f.input),replayed=new Chess(reflected.history.fen);
  for(const recorded of reflected.history.moves)replayed.move(recorded);
  // Reflection swaps which color increments the fullmove counter; the actual
  // reflected history, rather than the old counter, defines its root FEN.
  reflected.fen=replayed.fen();
  return [f,{source:f.source,input:{...reflected,...(f.source==='defense'?{defenseAlternative:move(f.input.defenseAlternative)}:{})},options:{...f.options,priorAlternative:move(f.options.priorAlternative)}}];
});
