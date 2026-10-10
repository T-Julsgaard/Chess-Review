import {Chess} from '../../../../lib/chess.js';
import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';
import {reflect} from '../../E024-transitions/code/fixtures.mjs';
import {mockContract} from './mock.mjs';
const f=(id,fen,options={},history)=>{const input={fen,...(history?{history}:{})};return {id,input,envelope:mockContract(input,options)};};
export const live={fen:setup({a7:null,h2:null,d1:'Q'}),move:'d1d2',scanReplies:false};
const history={fen:live.fen,moves:['d1d2','h8h7','d2d1','h7h8','d1d2','h8h7','d2d1','h7h8']},repeated=new Chess(history.fen);for(const m of history.moves)repeated.move(m);
export const fixtures=[f('authored-live-mock',live.fen),f('black-perspective-mock',reflect({...live,id:'reflect'}).fen),
 f('promotion-underpromotion-mock',setup({a7:null,h2:null,c7:'P'})),
 f('en-passant-mock','7k/8/8/3pP3/8/8/8/K7 w - d6 0 1'),
 f('terminal-mate-mock','7k/6Q1/5K2/8/8/8/8/8 b - - 0 1',{category:'loss',dtz:-1,precise:-1}),
 f('terminal-stalemate-mock','7k/5K2/6Q1/8/8/8/8/8 b - - 0 1'),
 f('insufficient-material-mock','7k/8/8/8/8/8/8/K7 w - - 0 1'),
 f('fifty-move-context-mock',live.fen.replace(' 0 1',' 100 1')),
 f('full-threefold-context-mock',repeated.fen(),{},history),
 f('cursed-blessed-mock',live.fen,{category:'cursed-win',dtz:103,precise:null,rowCategory:'blessed-loss',rowDtz:-104}),
 f('uncertain-rounding-mock',live.fen,{category:'maybe-win',dtz:4,precise:null,rowCategory:'maybe-loss',rowDtz:-5}),
 f('unknown-mock',live.fen,{category:'unknown',dtz:null,precise:null,rowCategory:'unknown',rowDtz:null}),
 f('syzygy-categorical-mock',live.fen,{category:'syzygy-win',dtz:9,precise:9,rowCategory:'syzygy-loss',rowDtz:-8})];
