import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
export function between(a,b,type){const dx=b.charCodeAt(0)-a.charCodeAt(0),dy=+b[1]-+a[1],diagonal=Math.abs(dx)===Math.abs(dy),straight=!dx||!dy;if(!(type==='q'&&(diagonal||straight)||type==='b'&&diagonal||type==='r'&&straight))return[];const squares=[];let x=a.charCodeAt(0)+Math.sign(dx),y=+a[1]+Math.sign(dy);while(x!==b.charCodeAt(0)||y!==+b[1]){squares.push(String.fromCharCode(x)+y);x+=Math.sign(dx);y+=Math.sign(dy);}return squares;}
export function context(i,A,D){
  const h=validateHistory(i),work=3+(h?.moves.length||0);if(!h)return{status:'history-prerequisite',work};if(i.defenseAlternative===undefined)return{status:'defenseAlternative-prerequisite',work};
  const c=legalPosition(h.start);for(const m of h.moves)c.move(m);if(c.isGameOver())return{status:'not-live',work};if(!c.isCheck())return{status:'checked-root-prerequisite',work};
  const actor=c.turn(),king=c.board().flat().find(p=>p?.type==='k'&&p.color===actor).square,checkers=c.attackers(king,actor==='w'?'b':'w').sort().map(square=>({square,type:c.get(square).type,color:c.get(square).color})),legal=c.moves({verbose:true}),pair=[i.move,i.defenseAlternative].sort().map(code=>legal.find(m=>uci(m)===code));
  if(pair.some(m=>!m)||i.move===i.defenseAlternative)throw Error('defenseAlternative must be distinct legal defense');
  const quiet=pair.find(m=>m.piece!=='k'&&!m.captured&&!m.promotion&&!/[+#]/.test(m.san)),active=pair.find(m=>m.captured&&/[+#]/.test(m.san)&&checkers.some(p=>p.square===(m.isEnPassant()?m.to[0]+m.from[1]:m.to)));
  if(!quiet||!active)throw Error('Comparison requires quiet interposition and checking capture of checker');
  const blocks=checkers.map(p=>({checker:p.square,between:between(p.square,king,p.type)})).filter(p=>p.between.includes(quiet.to));if(!blocks.length)throw Error('Quiet defense must interpose on slider check');
  c.move(uci(active));const terminal=c.isGameOver();c.undo();if(terminal)return{status:'nonterminal-counterplay-prerequisite',work};
  return{status:'ready',work,config:{fen:i.fen,history:i.history,moves:pair.map(uci),counterplayPlies:A,passiveLossPlies:D},roles:{quiet:uci(quiet),active:uci(active),king,checkers,blocks}};
}
