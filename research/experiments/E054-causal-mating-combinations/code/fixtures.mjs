import {Chess} from '../../../../lib/chess.js';
import {fixtures as seeds} from '../../E043-mating-decoys/code/fixtures.mjs';
import {fixtures as offers} from '../../E030-mating-sacrifices/code/fixtures.mjs';
import {mirror as historyMirror} from '../../E047-history-and-basic-mates/code/fixtures.mjs';
export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const ids=['attraction-combination','decoy-combination','blocking-combination'],attract=ids.slice(0,2),block=ids.slice(1);
const seed=name=>seeds.find(f=>f.id===name);
const copy=(id,source,expected=[],options={})=>({...source,id,namedDecoyTags:true,decoyTags:true,expected,absent:ids.filter(x=>!expected.includes(x)),...options,note:'Authored named causal mating combination: '+id});
const change=(f,square,piece)=>{const c=new Chess(f.fen);if(piece)c.put(piece,square);else c.remove(square);return{...f,fen:c.fen()};};
const self=seed('self-blocking-decoy-no-old-duty'),queen=seed('deflection-rook-from-mate-square'),king=seed('king-attraction-bishop');
const cases=[
 copy('attraction-bishop-offer',king,attract),copy('queen-self-blocking-with-deflection',queen,block),
 copy('rook-self-blocking-with-deflection',seed('rook-offer-deflection'),block),copy('self-blocking-without-old-duty',self,block),
 copy('two-acceptors-both-self-block',change(self,'e7',{type:'n',color:'b'}),block),
 copy('exchange-capture-self-block',offers.find(f=>f.id==='exchange-offer'),block),
 copy('bishop-capture-attraction',change(king,'g7',{type:'p',color:'b'}),attract),
 copy('pure-deflection-no-flight-role',change(queen,'e7',{type:'n',color:'w'}),['mating-decoy','mating-sacrifice']),
 copy('second-acceptor-refutes-mate',change(queen,'e7',{type:'n',color:'b'})),
 copy('ordinary-quiet-mating-offer',offers.find(f=>f.id==='pawn-en-passant-offer'),['forced-mate','mating-sacrifice']),
 copy('countercheck-declines-offer',change(offers.find(f=>f.id==='pawn-en-passant-offer'),'h4',{type:'r',color:'b'})),
 copy('equal-trade-not-positive-offer',seed('equal-trade-not-decoy-sacrifice'),['forced-mate']),
 copy('missing-mate-helper',seed('failed-offer-no-decoy')),
 copy('no-legal-acceptance',seed('no-acceptance-no-decoy'),['forced-mate']),
 copy('disabled-parent-role',queen,['mating-sacrifice'],{decoyTags:false}),
 copy('exhausted-parent-role',queen,['mating-sacrifice'],{maxDecoyTagNodes:0}),
 copy('exhausted-mate-proof',seed('exhausted-mate-proof-no-decoy')),
 copy('disabled-new-profile',queen,['mating-decoy','mating-sacrifice'],{namedDecoyTags:false}),
 copy('zero-new-budget',queen,['mating-decoy','mating-sacrifice'],{maxNamedDecoyNodes:0})
];
const root=new Chess(self.fen);root.remove('d8');root.put({type:'r',color:'b'},'c8');const fields=root.fen().split(' ');fields[1]='b';
const history={fen:fields.join(' '),moves:['c8d8']},current=new Chess(history.fen);current.move('c8d8');
cases.push(copy('history-self-blocking',{...self,fen:current.fen(),history},block));
function mirror(f){const out=historyMirror(f),fields=out.fen.split(' '),ep=f.fen.split(' ')[3];fields[3]=ep==='-'?'-':String.fromCharCode(201-ep.charCodeAt(0))+ep[1];out.fen=fields.join(' ');return out;}
export const fixtures=cases.flatMap(f=>[f,mirror(f)]);
