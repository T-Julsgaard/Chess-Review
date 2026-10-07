import {renderStatus as previous} from '../../E027-defensive-resources/code/status.mjs';
const scopes=new Map();
const add=(names,scope)=>names.split('|').forEach(name=>scopes.set(name,scope));
add("Arabian mate",'actual corner checkmate by adjacent rook; same knight protects rook and controls vacant flight outside rook coverage');
add("Anastasia's mate",'actual edge-file/rank rook or queen mate; knight controls both inward diagonal flights and own king-side blocker closes inward step');
add("Boden's mate",'actual edge bishop mate with opposite-color bishop controlling two uncovered vacant flights and two king-side self-blockers');
add('Epaulette mate','actual edge queen mate from two squares inward with both parallel shoulders occupied by king-side pieces');
add('Dovetail mate',"protected diagonal-adjacent queen; exactly two on-board uncovered flights are self-blocked, with actual mate");
add("Swallow's-tail mate",'protected orthogonal-adjacent queen; two on-board rear-diagonal uncovered flights are self-blocked, with actual mate');
add('Opera mate','actual edge mate by adjacent parallel rook, supported bishop sealing inward flight, two opposite-side self-blockers');
add("Morphy's mate",'actual corner bishop mate; rook cuts an empty orthogonal flight and own king-side piece blocks other orthogonal flight');
add('Ladder mate|Rook roller mate','actual edge rook mate; a second rook on inner parallel line controls all vacant inward neighboring flights; sequence not inferred');
add('Queen-and-rook mate|Queen-and-knight mating pattern|Queen-and-bishop mating pattern|Bishop-and-rook mating pattern|Rook-and-knight mating pattern|Double-bishop mate','actual mate with checker and named distinct helper protecting adjacent checker or controlling uncovered vacant flight; opposite-color bishops for B/B');
add('Pawn-supported mate','actual mate with pawn geometrically protecting adjacent checking piece');
add('Discovered mate','played legal move newly exposes a stationary original checking piece and actually checkmates');
add('Double-check mate','actual checkmate with at least two distinct checking pieces');
add('Promotion mate','played legal promotion actually checkmates; mere promotion is insufficient');
add('Underpromotion mate','played legal rook, bishop or knight promotion actually checkmates; necessity not inferred');
add('Mate in one','the played legal move is an actual mate with zero legal opponent replies; no longer sequence inferred');
export function renderStatus(source,report){
 const rows=previous(source,report).split('\n').filter(l=>l.startsWith('- ['));let verified=0,partial=0;const names=new Set();
 const updated=rows.map(line=>{const m=line.match(/^- \[([x ])\] (C\d+) \*\*(.*?)\*\* — (.*)$/),scope=scopes.get(m[3]),checked=!!scope||m[1]==='x',description=scope?`Mechanics verified: ${scope}.`:m[4];if(checked){verified++;names.add(m[3]);}else if(description.startsWith('Partial:'))partial++;return`- [${checked?'x':' '}] ${m[2]} **${m[3]}** — ${description}`;});
 return`# Cumulative coach concept tracker\n\nUpdated: 2026-10-07. [Original list](../../E020-coach-concepts/CONCEPTS.md) is unchanged; repeated occurrence IDs stay intact.\n\n${rows.length} entries; ${verified} verified occurrences across ${names.size} names; ${partial} partial occurrences. Checked means stated synthetic mechanics, not real-game precision, teaching benefit or extension readiness.\n\n[Plan](../plan.md) · [Result](../RESULT.md) · [Definitions](../SOURCES.md) · [Demo](demo.html) · [Evidence](results.json)\n\n${report.fixtures} authored/reflected cases. Selected comments <=24 words. Every new mating label requires actual legal checkmate and explicit checker/helper/blocker or move witnesses. Named templates are conservative subsets; no historic combination, sacrifice or castling history is inferred.\n\n## Per-entry status\n\n${updated.join('\n')}\n`;
}
