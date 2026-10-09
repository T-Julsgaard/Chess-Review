import {legalPosition, uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {turnBoard} from '../../E027-defensive-resources/code/defense.mjs';
import {explainMove as parent, priority as inherited} from '../../E082-rook-ending-facts/code/endings.mjs';
const men = c => c.board().flat().filter(Boolean).map(({square,type,color}) => ({square,type,color})).sort((a,b)=>a.square.localeCompare(b.square));
const pawns = c => men(c).filter(p=>p.type==='p');
const nonpawns = c => men(c).filter(p=>!['p','k'].includes(p.type)).length;
const region = s => 'abc'.includes(s[0]) ? 'queenside' : 'fgh'.includes(s[0]) ? 'kingside' : 'central';
export const priority = e => e.evidence?.experiment === 'E083' ? 39 : inherited(e);
export function explainMove(input) {
  const enabled = input.changeTags === undefined ? false : input.changeTags;
  if (typeof enabled !== 'boolean') throw Error('changeTags must be boolean');
  if (!enabled) return parent(input);
  const limit = input.maxChangeNodes === undefined ? 50000 : input.maxChangeNodes;
  if (!Number.isSafeInteger(limit)||limit<0||limit>50000) throw Error('maxChangeNodes must be integer 0..50000');
  const base=parent(input); let nodes=0, status='no-new-fact', events=base.events, witness=null;
  const done=()=>({...base,schema:'coach-concepts-E083-prototype',events,
    comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,
    changeAnalysis:{limit,nodes,status,witness}});
  if (base.error || base.foundationAnalysis && base.foundationAnalysis.status!=='accepted') {status='not-applicable';return done();}
  const tick=()=>{if(++nodes>limit)throw Error('change-budget');};
  try {
    tick(); const h=validateHistory(input), c=legalPosition(h?.start||input.fen);
    for(const m of h?.moves||[]){tick();c.move(m);}
    if(c.isGameOver()){status='not-live';return done();}
    const actor=c.turn(), before=c.fen(), beforePieces=men(c), beforePawns=pawns(c), beforeCount=nonpawns(c);
    tick(); const played=c.move(input.move);
    if(c.fen()!==base.after)throw Error('Parent played position differs');
    if(c.isGameOver()){status='not-live';return done();}
    const after=c.fen(), afterPieces=men(c), afterPawns=pawns(c), afterCount=nonpawns(c);
    const extra=[], root=legalPosition(before);
    witness={experiment:'E083',actor,history:h?{fen:h.start,moves:h.moves}:null,before,after,beforePieces,afterPieces,
      played:{uci:uci(played),san:played.san,piece:played.piece,captured:played.captured||null,promotion:played.promotion||null},
      beforePawns,afterPawns,beforeCount,afterCount,contacts:[],exchange:null};
    const add=(id,text,details={})=>{tick();if(text.split(/\s+/).length>24)throw Error('Comment exceeds24words');
      extra.push({id,text,qualityClaim:false,evidence:{...witness,...details}});};
    // Hypothetical next actor turn is a contact witness, never a guaranteed gain.
    if(!root.isCheck()&&!c.isCheck()) {
      tick();const hypothetical=turnBoard(c,actor);tick();const legal=hypothetical.moves({verbose:true});
      const contacts=[];
      for(const m of legal){tick();if(m.from!==played.to||!m.captured||m.isEnPassant())continue;
        if(root.attackers(m.to,actor).includes(played.from))continue;
        if(!contacts.some(t=>t.square===m.to))contacts.push({square:m.to,type:m.captured,capture:uci(m)});}
      contacts.sort((a,b)=>a.square.localeCompare(b.square));
      witness.contacts=contacts;witness.hypotheticalActorFen=hypothetical.fen();
      if(contacts.length>=2)add('double-legal-contact',`Double attack: the piece on ${played.to} has legal capture contacts with ${contacts.slice(0,2).map(t=>t.square).join(' and ')}.`);
      for(const t of contacts){
        const r=region(t.square), shade=(t.square.charCodeAt(0)-97+Number(t.square[1]))%2===0?'light':'dark';
        add(r+'-attack-contact',`${r[0].toUpperCase()+r.slice(1)} attack contact: ${played.to} can capture the enemy piece on ${t.square} in an actor-turn snapshot.`,{target:t});
        add(shade+'-square-contact',`${shade[0].toUpperCase()+shade.slice(1)}-square attack contact: ${played.to} can capture on ${t.square} in an actor-turn snapshot.`,{target:t});
        if(t.type==='p'&&t.square[1]===(actor==='w'?'7':'2')&&'fgh'.includes(t.square[0]))
          add('attack-'+t.square[0]+'-pawn',`Pawn attack: ${played.to} has a legal capture contact with the pawn on ${t.square}.`,{target:t});
      }
    }
    const last=h?.records.at(-1), lm=last?.move;
    if(lm?.captured&&played.captured&&!lm.promotion&&!played.promotion&&lm.color!==actor&&played.to===lm.to&&played.captured===lm.piece&&!played.isEnPassant()) {
      const prior=legalPosition(last.before), prePairCount=nonpawns(prior);
      witness.exchange={previous:uci(lm),previousBefore:last.before,previousAfter:last.after,lost:lm.captured,captured:played.captured,prePairCount,afterCount};
      if(lm.captured==='q'&&played.captured==='q')add('trading-queens-fact','Trading queens: both queens were captured in this immediate exchange.');
      if(root.isCheck()&&root.attackers(men(root).find(p=>p.type==='k'&&p.color===actor).square,lm.color).includes(lm.to))
        add('trading-checking-attacker','Trading attackers: this recapture removes the piece that was checking your king.');
      if(prePairCount>afterCount){
        add('exchange-simplification',`Simplification by exchange: non-pawn pieces fall from ${prePairCount} to ${afterCount} across the two captures.`);
        add('exchange-liquidation','Liquidation fact: this recorded exchange removes pieces from both armies.');
        if(afterPieces.filter(p=>!['p','k'].includes(p.type)).every(p=>p.type==='r'))
          add('endgame-exchange-simplification','Endgame simplification fact: this exchange leaves only kings, pawns and optional rooks.');
      }
    }
    if(JSON.stringify(beforePawns)!==JSON.stringify(afterPawns))add('pawn-structure-change',`Pawn structure changed: the legal move ${played.san} changes the pawn-square inventory.`);
    if(played.piece==='p'&&!played.promotion) {
      const r=region(played.to);add(r+'-pawn-expansion',`${r[0].toUpperCase()+r.slice(1)} pawn advance: your pawn moves from ${played.from} to ${played.to}.`);
      const wing=p=>region(p.square)===region(played.from), own=beforePawns.filter(p=>p.color===actor&&wing(p)).length,
        enemy=beforePawns.filter(p=>p.color!==actor&&wing(p)).length;
      if(own>enemy)add('majority-pawn-advance',`Majority advance: this pawn belonged to a ${own}-against-${enemy} pawn majority in the ${region(played.from)} region.`,{majority:{own,enemy,region:region(played.from)}});
    }
    if(extra.length){events=[...base.events,...extra];status='proven';}else witness=null;
  }catch(e){if(e.message!=='change-budget')throw e;status='exhausted';witness=null;events=base.events;}
  return done();
}
