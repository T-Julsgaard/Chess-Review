import {renderStatus as previous} from '../../E023-broad-tactics/code/status.mjs';
const scopes=new Map();
function add(names,scope,checked=true){for(const name of names.split('|'))scopes.set(name,[checked,scope]);}
add('King and pawn versus king|Rook and pawn versus rook|Bishop and pawn versus bishop|Knight and pawn versus knight|Queen versus rook|Queen versus minor piece|Queen versus rook and pawn|Queen versus advanced pawn|Rook and bishop versus rook|Rook and knight versus rook|Two bishops versus knight|Queen-versus-pawn endings','exact pure remaining material counts; no win/draw or strategic-value claim');
add('Rook versus connected pawns|Rook versus passed pawns|Knight versus connected pawns','exact pure army and connected/passed pawn geometry; no outcome claim');
add('Exchange|Equal trade|Unequal trade|Queen trade|Minor-piece trade|Rook trade|The exchange','verified legal immediate recapture history; fixed captured-piece nominal values only; promotions excluded');
add('Rook trade into pawn ending','verified rook-for-rook recapture leaves only kings and pawns');
add('Endgame transition|Endgame simplification','capture changes to an enumerated pure ending class; count-based subset, not strategic desirability',false);
add('King-and-queen mate|King-and-rook mate|King and two bishops mate|Bishop-and-knight mate|Bishop and knight checkmate','actual played checkmate against lone king with exactly the stated mating army');
add('Queen-and-rook mate','actual lone-king mate with a checking queen supported by the rook; no merely present rook');
add('Queen check','moved/promoted queen is an actual checker');
add('Queen behind passed pawn','new same-file unobstructed queen behind own/enemy passer');
add('Queen with check','passed-pawn queen promotion giving actual check; race strategy deferred',false);
add('Passed-pawn checks|Promotion tactics','passed pawn advance/promotion itself gives check; broader tactical plans deferred',false);
add('Queen centralization','queen arrives on d4/e4/d5/e5; safety/usefulness not inferred',false);
add('Rook lift','arrival or horizontal movement on relative third/fourth rank; attack intent not inferred',false);
add('Knight outpost|Knight on a protected outpost|Creating an outpost','new pawn-supported knight on c–f relative ranks 4–6; no enemy pawn ahead on neighboring files; future exchanges/permanence deferred',false);
add('Rim knight','new knight placement on board edge, inherited E021 mechanics');
add('Knight on the fifth rank|Knight on the sixth rank','new relative-rank knight placement, inherited E021 mechanics');
add('Connected passers','adjacent-file passers at most one rank apart; safety and reciprocal protection not established',false);
export function renderStatus(source,report){
 const rows=previous(source,report).split('\n').filter(line=>line.startsWith('- ['));let verified=0,partial=0;const names=new Set();
 const updated=rows.map(line=>{const m=line.match(/^- \[([x ])\] (C\d+) \*\*(.*?)\*\* — (.*)$/),s=scopes.get(m[3]),checked=s?s[0]:m[1]==='x',description=s?`${checked?'Mechanics verified':'Partial'}: ${s[1]}.`:m[4];if(checked){verified++;names.add(m[3]);}else if(description.startsWith('Partial:'))partial++;return`- [${checked?'x':' '}] ${m[2]} **${m[3]}** — ${description}`;});
 return`# Cumulative coach concept tracker\n\nUpdated: 2026-10-07. [Original supplied list](../../E020-coach-concepts/CONCEPTS.md) is preserved; stable IDs retain every repeated entry.\n\n${rows.length} entries; ${verified} verified occurrences across ${names.size} names; ${partial} partial occurrences. Checked means the stated synthetic mechanics scope, not human benefit, real-game precision, best play or extension readiness.\n\n[Plan](../plan.md) · [Result](../RESULT.md) · [Demo](demo.html) · [Evidence](results.json)\n\n${report.fixtures} authored/reflected cases; short selected comments <=24 words. Trade comments require replayed supplied history. Endgame labels describe exact material, not outcome.\n\n## Per-entry status\n\n${updated.join('\n')}\n`;
}
