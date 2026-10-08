import {explainMove as baseline,legalPosition,uci} from './E020-concepts.mjs';
import {structuralEvents} from './E021-features.mjs';

const piece={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
const join = squares => squares.length>3?`${squares.slice(0,2).join(', ')} and ${squares.length-2} others`:squares.join(' and ');
export function shortText(event){
  const e=event.evidence;
  switch(event.id){
    case'fork':return e.targets.length>3?`${piece[e.piece]} fork on ${e.attacker}, attacking ${e.targets.length} targets. Every reply allows a target capture.`:`${piece[e.piece]} fork on ${e.attacker}: ${e.targets.map(t=>`${piece[t.type]} ${t.square}`).join(', ')}. Every reply allows a target capture.`;
    case'allows-fork':return`Watch out for ${e.threat.san}: a ${piece[e.threat.piece]} fork ${e.threat.targets.length>3?`of ${e.threat.targets.length} targets`: `of ${e.threat.targets.map(t=>`${piece[t.type]} ${t.square}`).join(' and ')}`}.`;
    case'avoids-fork':return`You prevent the ${piece[e.threat.piece]} fork with ${e.threat.san} that the alternative would allow.`;
    case'absolute-pin':return`Absolute pin: your piece on ${e.slider} pins ${piece[e.piece]} ${e.blocker} to king ${e.king}; it cannot leave that line.`;
    case'discovered-check':return`Discovered check: moving from ${e.vacated} uncovers the attack from ${join(e.revealed)}.`;
    case'double-check':return`Double check from ${join(e.attackers)}. Only a king move can answer.`;
    case'check':return`Check: your move attacks the king on ${e.king}.`;
    case'checkmate':return'Checkmate: the king is attacked with no legal escape.';
    case'stalemate':return'Stalemate: no legal move, but the king is not in check.';
    case'castling':return`You castled ${e.wing}.`;
    case'en-passant':return`En passant: pawn ${e.to} captures the pawn from ${e.capturedSquare}.`;
    case'promotion':return`${e.underpromotion?'Underpromotion':'Promotion'}: your pawn becomes a ${piece[e.piece]}.`;
    case'passed-pawn':return`Passed pawn on ${join(e.squares)}: no enemy pawn remains ahead on its file or neighboring files.`;
    case'passed-pawn-advance':return`Your passed pawn advances from ${e.from} to ${e.to}.`;
    case'passed-pawn-promotion':return`Your passed pawn promotes on ${e.square} to a ${piece[e.piece]}.`;
    case'protected-passed-pawn':return`Protected passed pawn on ${join(e.squares)}: another pawn attacks its square.`;
    case'connected-passed-pawns':return`Connected passed pawns on ${join(e.squares)}: adjacent files, no more than one rank apart.`;
    case'isolated-pawn':return`${e.iqp.length===e.squares.length?'Isolated queen’s pawn':e.squares.length>1?'Isolated pawns':'Isolated pawn'} on ${join(e.squares)}: no friendly pawn occupies an adjacent file.`;
    case'doubled-pawns':return`Doubled pawns on the ${e.file}-file: ${join(e.squares)}.`;
    case'tripled-pawns':return`Tripled pawns on the ${e.file}-file: ${e.squares.join(', ')}.`;
    case'pawn-islands':return`You now have ${e.after} pawn ${e.after===1?'island':'islands'}; occupied files form ${e.after} separate ${e.after===1?'group':'groups'}.`;
    case'pawn-chain':return`Pawn chain: ${e.newEdges[0].base} supports ${e.newEdges[0].head}; ${e.bases.length===1?'base':'bases'} ${join(e.bases)}, ${e.heads.length===1?'head':'heads'} ${join(e.heads)}.`;
    case'pawn-duo':return`Pawn duo: ${join(e.squares)} stand side by side.`;
    case'pawn-phalanx':return`Pawn phalanx: ${join(e.squares)} stand side by side on one rank.`;
    case'pawn-ram':return`Pawn ram: ${e.own} and ${e.enemy} block each other’s forward advance.`;
    case'pawn-tension':return`Pawn tension: ${e.own} and ${e.enemy} attack each other.`;
    case'resolves-pawn-tension':return`You resolve pawn tension by capturing from ${e.from} to ${e.to}.`;
    case'pawn-majority':return`${e.wing==='queenside'?'Queenside':'Kingside'} pawn majority: ${e.own} pawns against ${e.enemy}.`;
    case'opposite-wing-majorities':return'Opposite-wing pawn majorities: you have more pawns on one wing, and your opponent has more on the other.';
    case'file-opening':return`The ${e.file}-file is now open: no pawns remain on it.`;
    case'open-file':return`Your ${piece[e.piece]} occupies the open ${e.file}-file.`;
    case'semi-open-file':return`Your ${piece[e.piece]} occupies the semi-open ${e.file}-file: only enemy pawns remain there.`;
    case'connected-rooks':return`${e.file?'Doubled':'Connected'} rooks on ${join(e.squares)}, with a clear ${e.file?'file':'rank'} between them.`;
    case'queen-rook-battery':return`Queen–rook battery: ${e.queen} and ${e.rook} share an unobstructed line.`;
    case'queen-bishop-battery':return`Queen–bishop battery: ${e.queen} and ${e.bishop} share an unobstructed diagonal.`;
    case'tripling-file':return`Tripling on the ${e.file}-file: two rooks and a queen share the file.`;
    case'rook-behind-passer':return`Your rook on ${e.rook} stands behind ${e.pawnColor==='w'?'White’s':'Black’s'} passed pawn on ${e.pawn}.`;
    case'passed-pawn-blockade':return`${piece[e.piece]==='knight'?'Knight':'Rook'} blockade: ${e.square} blocks the passed pawn on ${e.pawn} from advancing straight ahead.`;
    case'rook-seventh':return`Your rook on ${join(e.squares)} reaches the opponent’s second rank.`;
    case'two-rooks-seventh':return`${e.squares.length===2?'Two':e.squares.length} rooks on the opponent’s second rank: ${join(e.squares)}.`;
    case'bishop-pair':return`You have the bishop pair, covering both light and dark squares.`;
    case'opposite-bishop-ending':return`Opposite-colored bishop ending: bishops ${e.own} and ${e.enemy} operate on different square colors.`;
    case'same-bishop-ending':return`Same-colored bishop ending: bishops ${e.own} and ${e.enemy} operate on the same square color.`;
    case'rook-two-minors':return'Material imbalance: your rook faces two minor pieces.';
    case'queen-two-rooks':return'Material imbalance: your queen faces two rooks.';
    case'queen-rook-minor':return'Material imbalance: your queen faces a rook and a minor piece.';
    case'rook-minor':return'Material imbalance: your rook faces a minor piece.';
    case'bishop-knight':return'Material imbalance: bishop versus knight.';
    case'material-balance':return`Nominal material balance: ${e.delta===0?'equal':`${Math.abs(e.delta)} pawn-value ${Math.abs(e.delta)===1?'point':'points'} ${e.delta>0?'ahead':'behind'}`}.`;
    case'fianchetto':return`Fianchetto bishop on ${e.square}.`;
    case'long-diagonal-bishop':return`Long-diagonal bishop: ${e.square} lies on ${e.diagonal}.`;
    case'centralized-knight':return`Centralized knight on ${e.square}, one of the four central squares.`;
    case'rim-knight':return`Rim knight on ${e.square}, at the edge of the board.`;
    case'advanced-knight':return`Your knight on ${e.square} reaches your ${e.relativeRank===5?'fifth':'sixth'} rank.`;
    case'central-king':return`King centralization: your king reaches the central square ${e.square}.`;
    case'king-opposition':return`${e.kind==='direct'?'Direct':e.kind==='distant'?'Distant':'Diagonal'} opposition: the kings on ${join(e.kings)} face each other. This identifies geometry, not who benefits.`;
    case'central-pawn-control':return`Center control: your pawn on ${e.pawn} attacks ${join(e.squares)}.`;
    case'pawn-center':return`Pawn center: your pawns occupy ${join(e.squares)}, among the four central squares.`;
    default:throw Error('No short template for '+event.id);
  }
}
const priority=id=>['checkmate','stalemate','allows-fork'].includes(id)?100:id==='fork'?90:['double-check','discovered-check','absolute-pin','avoids-fork'].includes(id)?80:['passed-pawn','protected-passed-pawn','connected-passed-pawns','passed-pawn-blockade','tripled-pawns','doubled-pawns','isolated-pawn'].includes(id)?60:['connected-rooks','queen-rook-battery','queen-bishop-battery','tripling-file','pawn-chain','bishop-pair','opposite-bishop-ending','same-bishop-ending'].includes(id)?50:id==='material-balance'?5:30;
export function explainMove(input){
  const inherited=baseline(input),before=legalPosition(input.fen),move=before.moves({verbose:true}).find(m=>uci(m)===input.move),after=legalPosition(inherited.after);
  // legalPosition enforces non-moving king safety, so after a checking move
  // the king that just moved remains safe even though the next king is checked.
  const extra=['checkmate','stalemate'].some(id=>inherited.events.some(e=>e.id===id))?[]:structuralEvents(before,after,move);
  const events=[...inherited.events,...extra].map(e=>({...e,text:shortText(e)})).sort((a,b)=>priority(b.id)-priority(a.id));
  const comment=events[0]?.text??null;
  if(comment&&comment.split(/\s+/).length>24)throw Error('Selected comment exceeds 24 words');
  return{...inherited,schema:'coach-concepts-v2',events,comment};
}
