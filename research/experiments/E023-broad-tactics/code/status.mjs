import {renderStatus as previous} from '../../E022-move-tactics/code/status.mjs';
const scopes=new Map([
 ['Fork',[true,'new all-piece target pairs, including pawns; every defense has a positive finite capture witness']],
 ['Double attack',[false,'certified moved-piece forks and discovered two-attacker target threats only']],
 ['Triple attack',[true,'three or more moved-piece targets with one finite capture witness per defense; not all targets won']],
 ['Double attack with discovered attack',[true,'new moved-piece and stationary revealed-slider attacks on distinct targets with finite capture witnesses']],
 ['Royal fork',[true,'king-and-queen target pair by any piece with a positive finite witness; king never captured']],
 ['Hanging piece',[false,'newly available opponent capture survives every immediate response with positive nominal gain; long-term profit unresolved']],
 ['X-ray attack',[false,'new slider/blocker/enemy-target alignment only; blocker prevents direct attack']],
 ['X-ray defense',[false,'new slider/blocker/friendly-target alignment only; blocker prevents direct defense']],
 ['Interference',[true,'played piece removes a specific enemy slider’s previously clear attack line to a friendly piece; geometry only']],
 ['Alignment',[false,'new x-ray and battery geometry subsets; tactical value not implied']],
 ['King-piece alignment',[false,'absolute pins/skewers and descriptive x-rays only']],
 ['Queen-king alignment',[false,'certified king-first queen-target skewers and x-ray geometry subsets']],
 ['Rook-queen alignment',[false,'descriptive x-ray alignment; no general relative-skewer proof']],
]);
export function renderStatus(source,report){
 const rows=previous(source,report).split('\n').filter(line=>line.startsWith('- ['));let verified=0,partial=0;const names=new Set();
 const updated=rows.map(line=>{const m=line.match(/^- \[([x ])\] (C\d+) \*\*(.*?)\*\* — (.*)$/),s=scopes.get(m[3]),checked=s?s[0]:m[1]==='x',description=s?`${checked?'Mechanics verified':'Partial'}: ${s[1]}.`:m[4];if(checked){verified++;names.add(m[3]);}else if(description.startsWith('Partial:'))partial++;return`- [${checked?'x':' '}] ${m[2]} **${m[3]}** — ${description}`;});
 return`# Cumulative coach concept tracker\n\nUpdated: 2026-10-07. [Original supplied list](../../E020-coach-concepts/CONCEPTS.md) remains unchanged; stable occurrence IDs retain repetitions.\n\n${rows.length} entries; ${verified} verified occurrences across ${names.size} names; ${partial} partial occurrences. Checked means stated synthetic mechanics, not human usefulness, real-game precision, optimal play or extension readiness.\n\n[Plan](../plan.md) · [Result](../RESULT.md) · [Demo](demo.html) · [Evidence](results.json)\n\n${report.fixtures} authored/reflected cases. Comments <=24 words. Finite material witnesses and geometric alignment descriptions have separate scopes. Immediate mate warnings have an actual legal mating reply.\n\n## Per-entry status\n\n${updated.join('\n')}\n`;
}
