import {Chess} from '../../../../lib/chess.js';
import {fixtures as seeds} from '../../E030-mating-sacrifices/code/fixtures.mjs';
import {mirror as historyMirror} from '../../E047-history-and-basic-mates/code/fixtures.mjs';
export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const seed=name=>seeds.find(f=>f.id===name);
const change=(f,sq,p)=>{const c=new Chess(f.fen);if(p)c.put(p,sq);else c.remove(sq);return{...f,fen:c.fen()};};
const piece=(type,color='w')=>({type,color});
function king(f,to){const c=new Chess(f.fen);c.remove('h1');c.put(piece('k'),to);return{...f,fen:c.fen()};}
function history(f,moves,root){const c=root||new Chess(f.fen),h={fen:c.fen(),moves};for(const m of moves)c.move(m);return{...f,history:h,fen:c.fen()};}
function preceding(f,quiet=false,from='a8'){const c=new Chess(f.fen);c.remove('f8');c.put(piece('r','b'),from);if(!quiet)c.put(piece('b'),'f8');const fields=c.fen().split(' ');fields[1]='b';return history(f,[from+'f8'],new Chess(fields.join(' ')));}
const copy=(id,f,positive=true,options={})=>({...f,id,intermediateSacrificeTags:true,expected:positive?['intermediate-sacrifice','mating-sacrifice']:[],absent:positive?[]:['intermediate-sacrifice'],...options,note:'Authored history-confirmed intermediate offer: '+id});
const rook=preceding(seed('rook-offer')),queen=preceding(change(seed('queen-offer'),'d7',piece('n'))),exchange=preceding(seed('exchange-offer'));
let noRecap=change(seed('rook-offer'),'e6',null);noRecap=change(noRecap,'h5',piece('n'));noRecap=preceding(noRecap);
let ep=change(seed('rook-offer'),'c5',piece('n'));ep=change(ep,'d2',piece('p'));ep=change(ep,'e4',piece('p','b'));ep=history(ep,['d2d4','e4d3']);
function promoted(type){let f=king(seed('rook-offer'),'h2');f=change(f,'c2',piece('n'));const c=new Chess(f.fen);c.put(piece('p','b'),'d2');c.put(piece('b'),'e1');const fields=c.fen().split(' ');fields[1]='b';return history(f,['d2e1'+type],new Chess(fields.join(' ')));}
let mateOne=seed('pawn-en-passant-offer');mateOne=change(mateOne,'c5',piece('n'));mateOne=change(mateOne,'d2',piece('p'));mateOne=change(mateOne,'g4',piece('p','b'));mateOne=history(mateOne,['d2d4','e4d3']);
let pinned=king(seed('rook-offer'),'e1');pinned=change(pinned,'e8',piece('r','b'));pinned=preceding(pinned,false,'f7');
const cases=[copy('rook-offer-after-capture',rook),copy('queen-offer-after-capture',queen),copy('exchange-offer-after-capture',exchange),
 copy('two-legal-recapturers',preceding(change(seed('rook-offer'),'d7',piece('n')))),copy('last-capture-en-passant',ep),copy('last-capturer-promoted-queen',promoted('q')),copy('last-capturer-promoted-knight',promoted('n')),
 copy('snapshot-history-missing',{...rook,history:undefined},false,{expected:['mating-sacrifice']}),copy('last-move-quiet',preceding(seed('rook-offer'),true),false,{expected:['mating-sacrifice']}),
 copy('old-capture-final-quiet',history(seed('rook-offer'),['a8f8','h1h2','f8e8','h2h1','e8f8'],new Chess(rook.history.fen)),false,{expected:['mating-sacrifice']}),
 copy('no-legal-recapture',noRecap,false,{expected:['mating-sacrifice']}),copy('pinned-recapture-illegal',pinned,false,{expected:['mating-sacrifice']}),copy('immediate-mate-available',mateOne,false,{expected:['mating-sacrifice']}),
 copy('actual-direct-recapture',rook,false,{move:'e6f8'}),copy('missing-helper',preceding(change(seed('rook-offer'),'h6',null)),false),
 copy('mate-proof-disabled',rook,false,{mateDepth:0}),copy('mate-proof-exhausted',rook,false,{maxMateNodes:0}),
 copy('profile-disabled',rook,false,{intermediateSacrificeTags:false,expected:['mating-sacrifice']}),copy('new-budget-zero',rook,false,{maxIntermediateSacrificeNodes:0,expected:['mating-sacrifice']})];
function mirror(f){const out=historyMirror(f),fields=out.fen.split(' '),ep=f.fen.split(' ')[3];fields[3]=ep==='-'?'-':String.fromCharCode(201-ep.charCodeAt(0))+ep[1];out.fen=fields.join(' ');return out;}
export const fixtures=cases.flatMap(f=>[f,mirror(f)]);
