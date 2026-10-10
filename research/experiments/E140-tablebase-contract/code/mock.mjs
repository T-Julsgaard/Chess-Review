import {Chess} from '../../../../lib/chess.js';
// Fabricated API fields, deliberately not outcome evidence. No network/probe calls.
export function mockContract(input,{category='draw',dtz=0,precise=0,rowCategory='loss',rowDtz=-5,rowPrecise=null}={}){
 const c=new Chess(input.history?.fen||input.fen);for(const m of input.history?.moves||[])c.move(m);
 const fields=(category,dtz,precise)=>{if(c.isCheckmate()){category='loss';dtz=-1;precise=-1;}else if(c.isStalemate()||c.isInsufficientMaterial()){category='draw';dtz=0;precise=0;}return {dtz,precise_dtz:precise,dtc:null,dtm:null,dtw:null,category,checkmate:c.isCheckmate(),stalemate:c.isStalemate(),insufficient_material:c.isInsufficientMaterial(),variant_win:false,variant_loss:false};};
 const response={...fields(category,dtz,precise),moves:[]};for(const move of c.moves({verbose:true}).reverse()){c.move(move);response.moves.push({uci:move.from+move.to+(move.promotion||''),san:move.san,zeroing:move.piece==='p'||!!move.captured,...fields(rowCategory,rowDtz,rowPrecise)});c.undo();}
 return {schema:'E140-synthetic-tablebase-v1',kind:'synthetic-contract',source:'authored mock contract; not a probe',queriedFen:c.fen(),responseText:JSON.stringify(response)};
}
