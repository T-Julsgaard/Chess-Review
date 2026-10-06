import {renderStatus as previous} from '../../E021-structural-concepts/code/status.mjs';
const scopes=new Map([
 ['Capture',[true,'actual removed piece and square, including en passant']],
 ['Piece simplification',[true,'non-pawn piece count decreases by one; no quality judgment']],
 ['Winning the exchange',[false,'played minor-for-rook capture retains positive nominal gain through every immediate reply only']],
 ['Discovered attack',[true,'stationary slider’s newly opened attack with legal same-side capture witness; opponent can respond']],
 ['Absolute skewer',[true,'king-first moved-slider skewer; every defense allows target capture with positive immediate net material']],
 ['Skewer',[false,'certified absolute king-first subset only']],
 ['Loose piece',[true,'new absence of geometric defenders; pinned defenders still counted']],
 ['En prise',[true,'legal same-side capture if target remains available next turn; no profit claim']],
 ['Interposition',[true,'legal non-king blocking response to existing check']],
 ['Blocking',[false,'check interposition only']],
 ['Line clearance',[false,'discovered attack subset with vacated square on slider line']],
 ['Clearance',[false,'discovered attack subset only; intent and broader uses deferred']],
 ['Removal of the defender',[false,'capture leaves enemy target with zero geometric defenders; tactical gain not established']],
 ['Removing protection',[false,'newly loose target after defender capture; no gain promise']],
 ['Only move',[false,'sole legal move only; other legal losing moves are not considered']],
 ['Forced move',[false,'sole legal move only; strategic compulsion deferred']],
 ['Smothered mate combination',[false,'actual final knight mate with every adjacent king square occupied by own pieces; combination history unknown']],
 ['Smothered mate',[true,'actual knight mate with every adjacent king square occupied by own pieces']],
 ['Back-rank mate',[true,'actual rook/queen rank mate with own pawns occupying all forward king neighbors']],
 ['Back-rank tactic',[false,'terminal back-rank mate only']],
 ['Insufficient mating material',[true,'chess.js insufficient-material classification after legal move']],
 ['Fifty-move rule',[false,'100-halfmove threshold from FEN counters; no adjudication or claim-history inference']],
]);
export function renderStatus(source,report){
 const old=previous(source,report),rows=old.split('\n').filter(line=>line.startsWith('- ['));let verified=0,partial=0;const names=new Set();
 const updated=rows.map(line=>{const m=line.match(/^- \[([x ])\] (C\d+) \*\*(.*?)\*\* — (.*)$/),s=scopes.get(m[3]);const checked=s?s[0]:m[1]==='x',description=s?`${checked?'Mechanics verified':'Partial'}: ${s[1]}.`:m[4];if(checked){verified++;names.add(m[3]);}else if(description.startsWith('Partial:'))partial++;return`- [${checked?'x':' '}] ${m[2]} **${m[3]}** — ${description}`;});
 return`# Cumulative coach concept tracker\n\nUpdated: 2026-10-07. [Original supplied list](../../E020-coach-concepts/CONCEPTS.md) is unchanged; stable occurrence IDs preserve duplicates.\n\n${rows.length} entries; ${verified} verified occurrences across ${names.size} names; ${partial} partial occurrences. Checked means stated synthetic mechanics only; human usefulness, real-game precision, optimal play and extension readiness remain unverified.\n\n[Plan](../plan.md) · [Result](../RESULT.md) · [Demo](demo.html) · [Evidence](results.json)\n\n${report.fixtures} authored/reflected cases. Selected comments stay within 24 words. Tactical material certificates cover explicitly finite replies, not long-term evaluation.\n\n## Per-entry status\n\n${updated.join('\n')}\n`;
}
