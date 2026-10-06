// One priority policy for the cumulative research prototype. New wrappers can
// import it rather than flattening the earlier candidate's specific priorities.
export function priority(e){
 const id=e.id;
 if(id==='allows-mate')return 200;
 if(['smothered-mate','back-rank-mate','king-rook-mate','king-queen-mate','king-bishops-mate','bishop-knight-mate','queen-rook-mate'].includes(id))return 190;
 if(['checkmate','stalemate','insufficient-material'].includes(id))return 180;
 if(id==='fifty-move-threshold')return 175;
 if(id==='allows-fork')return 170;
 if(id==='hanging-piece')return 160;
 if(id==='discovered-double-attack'||id==='absolute-skewer')return 147;
 if(id==='triple-attack')return 146;
 if(['fork','broad-fork'].includes(id))return e.evidence.royal?145:140;
 if(id==='double-check')return 130;
 if(id==='discovered-check')return 125;
 if(['absolute-pin','avoids-fork'].includes(id))return 120;
 if(['queen-trade','rook-trade-pawn-ending','minor-trade','rook-trade','exchange-difference'].includes(id))return 115;
 if(id==='promotion')return 110;
 if(id==='open-center')return 106;
 if(['equal-trade','unequal-trade','exchange','winning-exchange','castling'].includes(id))return 105;
 if(id==='pawn-ending-transition')return 101;
 if(id.startsWith('ending-'))return 100;
 if(id==='hanging-pawns')return 97;
 if(['closed-center','undermining-center','removal-defender'].includes(id))return 96;
 if(['central-break','interference','discovered-attack'].includes(id))return 95;
 if(id==='protected-knight-outpost')return 94;
 if(id==='fixed-center')return 93;
 if(id==='passed-pawn-check'||id==='pawn-lever')return 91;
 if(['protected-passed-pawn','connected-passed-pawns','passed-pawn-blockade','tripled-pawns','passed-pawn-promotion','queen-check'].includes(id))return 90;
 if(id==='pawn-cover')return 89;
 if(id==='bishop-behind-chain')return 88;
 if(['pawn-chain','queen-behind-passer','connected-rooks','queen-rook-battery','queen-bishop-battery','tripling-file','bishop-pair'].includes(id))return 85;
 if(['pawn-cover','pawn-cover-capture','symmetric-pawns','asymmetric-pawns','locked-pawn-chains','open-center'].includes(id))return 80;
 if(['rook-lift','rook-lift-preparation'].includes(id))return 76;
 if(['check','capture-checker','interposition','king-check-evasion','only-legal-move'].includes(id))return 75;
 if(id==='profitable-capture')return 72;
 if(['passed-pawn','passed-pawn-advance','isolated-pawn','doubled-pawns'].includes(id))return 70;
 if(id==='bishop-pawn-color')return 20;
 if(id==='capture'||id==='material-balance')return 10;
 return 60;
}
export function selectComment(events){return events.map((e,i)=>({e,i})).sort((a,b)=>priority(b.e)-priority(a.e)||a.i-b.i)[0]?.e.text||null;}
export function contextualText(e){
 if(!['fork','broad-fork'].includes(e.id)||!e.evidence.royal)return e;
 const evidence=e.evidence,targets=evidence.targets,king=targets.find(t=>t.type==='k'),queen=targets.find(t=>t.type==='q'),piece=evidence.piece||evidence.attackers[0].type,square=evidence.attacker||evidence.attackers[0].square;
 const names={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
 return{...e,text:`Royal ${names[piece]} fork on ${square}: king ${king.square} and queen ${queen.square}. Every defense permits a capture with immediate material gain.`};
}
