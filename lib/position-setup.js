import {Chess, validateFen} from './chess.js';

export const START_FEN = new Chess().fen();
export const PIECE_NAMES = {k:'king',q:'queen',r:'rook',b:'bishop',n:'knight',p:'pawn'};

export function setupFromFen(fen = START_FEN) {
  const fields = fen.trim().split(/\s+/);
  if (fields.length === 1) fields.push('w','-','-','0','1');
  if (fields.length !== 6) throw Error('FEN needs a board, turn, castling rights, en-passant square, halfmove clock and move number.');
  const {ok,error} = validateFen(fields.join(' '));
  if (!ok) throw Error(error.replace('Invalid FEN: ',''));
  const board = {};
  fields[0].split('/').forEach((row,i) => {
    let file = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) file += Number(ch);
      else board['abcdefgh'[file++]+(8-i)] = ch;
    }
  });
  return {board,turn:fields[1],castling:fields[2],ep:fields[3],halfmove:fields[4],fullmove:fields[5]};
}

export function setupFen(setup) {
  const rows = [];
  for (let rank=8;rank>=1;rank--) {
    let row='',empty=0;
    for (const file of 'abcdefgh') {
      const piece=setup.board[file+rank];
      if (!piece) {empty++;continue;}
      if (empty) {row+=empty;empty=0;}
      row+=piece;
    }
    if (empty) row+=empty;
    rows.push(row);
  }
  return [rows.join('/'),setup.turn,setup.castling||'-',setup.ep||'-',setup.halfmove,setup.fullmove].join(' ');
}

// chess.js validates FEN syntax; these checks also protect the engine from
// impossible setups (in particular an attack on the king that just moved).
export function validateSetup(setup) {
  const fen=setupFen(setup), {ok,error}=validateFen(fen);
  if (!ok) return {error:error.replace('Invalid FEN: ','')};
  if (!/^\d+$/.test(String(setup.halfmove)) || !/^[1-9]\d*$/.test(String(setup.fullmove))
      || Number(setup.halfmove)>100000 || Number(setup.fullmove)>100000)
    return {error:'Use whole-number clocks between 0 and 100000, and a move number of at least 1.'};
  if (!/^(K?Q?k?q?|-)$/.test(setup.castling||'-')) return {error:'Castling rights must use KQkq order.'};
  for (const color of ['w','b']) {
    const pieces=Object.values(setup.board).filter(p=>(p===p.toUpperCase())===(color==='w'));
    if (pieces.length>16 || pieces.filter(p=>p.toLowerCase()==='p').length>8)
      return {error:`${color==='w'?'White':'Black'} has too many pieces or pawns.`};
  }
  const chess=new Chess(fen), other=setup.turn==='w'?'b':'w';
  const king=Object.entries(setup.board).find(([,p])=>p===(other==='w'?'K':'k'))[0];
  if (chess.isAttacked(king,setup.turn)) return {error:'The side that just moved cannot leave its own king in check. Check the pieces and whose turn it is.'};
  for (const [right,kingSquare,rookSquare,k,r] of [
    ['K','e1','h1','K','R'],['Q','e1','a1','K','R'],['k','e8','h8','k','r'],['q','e8','a8','k','r'],
  ]) if ((setup.castling||'').includes(right) && (setup.board[kingSquare]!==k || setup.board[rookSquare]!==r))
    return {error:`Remove the ${right} castling right or restore its king and rook to their starting squares.`};
  if (setup.ep && setup.ep!=='-') {
    const file=setup.ep[0], rank=setup.turn==='w'?'5':'4', origin=setup.turn==='w'?'7':'2';
    if (setup.board[setup.ep] || setup.board[file+rank] !== (setup.turn==='w'?'p':'P') || setup.board[file+origin])
      return {error:'The en-passant square must be empty, behind a pawn that just advanced two squares.'};
  }
  return {fen,chess};
}

export function importPosition(text) {
  text=text.trim();
  if (!text) throw Error('Paste a FEN position or a PGN game first.');
  if (text.length>1000000) throw Error('This PGN is too large. Paste a single game.');
  if (/^[prnbqkPRNBQK1-8/]+(?:\s|$)/.test(text)) {
    const setup=setupFromFen(text), result=validateSetup(setup);
    if (result.error) throw Error(result.error);
    return {setup,history:null};
  }
  const chess=new Chess();
  try {chess.loadPgn(text);} catch {throw Error('Could not read this FEN or PGN. Check the text and try again.');}
  const moves=chess.history({verbose:true});
  if (!moves.length && !chess.getHeaders().FEN) throw Error('This PGN has no moves or starting position.');
  const initialFen=moves[0]?.before||chess.fen(),initial=validateSetup(setupFromFen(initialFen));
  if(initial.error)throw Error('Invalid PGN starting position: '+initial.error);
  const setup=setupFromFen(chess.fen()),result=validateSetup(setup);
  if(result.error)throw Error(result.error);
  return {setup,history:{initialFen,moves:moves.map(m=>m.lan)}};
}

export function pieceLabel(piece) {
  return piece ? `${piece===piece.toUpperCase()?'White':'Black'} ${PIECE_NAMES[piece.toLowerCase()]}` : 'empty';
}

export function lineToSan(fen,pv,max=10) {
  const chess=new Chess(fen),result=[];
  for (const uci of (pv||'').trim().split(/\s+/).slice(0,max)) {
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) break;
    try {
      const number=chess.fen().split(' ')[5],side=chess.turn();
      const move=chess.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]});
      result.push({uci,san:`${side==='w'?number+'. ':result.length?'':number+'… '}${move.san}`});
    } catch {break;}
  }
  return result;
}
