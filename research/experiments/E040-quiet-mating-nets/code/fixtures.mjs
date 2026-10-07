import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';import {fixtures as previous} from '../../E029-forced-mates/code/fixtures.mjs';export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const copy=(id,name,expected=[],absent=['quiet-mating-net'],options={})=>({...previous.find(f=>f.id===name),id,expected,absent,compareAlternatives:false,...options});
export const fixtures=[
 copy('quiet-net-many-defenses','quiet-forced-two',['quiet-mating-net','forced-mate'],[]),
 copy('quiet-three-only-not-next-move','quiet-forced-three',['forced-mate']),
 copy('checking-mate-not-quiet','checking-multiple-defenses',['forced-mate']),
 copy('countermate-breaks-net','countermate-refutation',['allows-mate']),
 copy('immediate-mate-not-net','mate-already-played',['checkmate']),
 copy('quiet-clock-draw-not-net','quiet-clock-draw',['fifty-move-threshold']),
 copy('quiet-exhausted-not-net','exhausted'),
 copy('quiet-disabled-not-net','quiet-forced-two',[],['quiet-mating-net'],{mateDepth:0}),
 copy('quiet-short-bound-not-net','insufficient-depth'),
 copy('quiet-history-draw-not-net','known-repetition-deep'),
 {id:'capture-forced-mate-not-quiet',fen:setup({a1:null,a7:null,h2:null,g6:'K',g5:'Q',d8:'N',e7:'p'}),move:'g5e7',mateDepth:2,compareAlternatives:false,expected:['forced-mate'],absent:['quiet-mating-net'],note:'Capture can force mate, but does not count as a quiet move.'},
];
