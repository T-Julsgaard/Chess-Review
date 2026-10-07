import {renderStatus as previous} from '../../E029-forced-mates/code/status.mjs';
const scopes=new Map([
 ['Sacrifice',[true,'actual material offer retains all-defense mate within two/three moves, including every legal acceptance and decline; no necessity or intention inferred']],
 ['Queen sacrifice',[true,'legally capturable moved queen costs more than the played capture, while every defense retains bounded forced mate']],
 ['Bishop sacrifice',[true,'legally capturable moved bishop retains bounded all-defense mate; tested clearance-check subset, not all bishop sacrifices']],
 ['Pawn sacrifice',[true,'actual moved pawn may be legally captured, including en passant, yet every defense retains bounded forced mate; activity-for-mate subset']],
 ['Exchange sacrifice',[true,'rook captures a minor and is legally offered at a nominal loss of two points, with all-defense forced-mate proof']],
 ['Clearance sacrifice',[true,'material offer vacates the sole blocker on a stationary slider-to-king ray, opening check and retaining bounded mate through every defense']],
 ['Sacrifice for open lines',[true,'same finite clearance-sacrifice subset: new checking ray, actual legal material acceptance and all-defense forced mate']],
 ...['When to sacrifice','What is the correct moment to sacrifice?'].map(name=>[name,[false,'bounded mate certificates verify some sound offers; general timing, necessity and positional criteria remain unresolved']])
]);
export function renderStatus(source,report){
 const rows=previous(source,report).split('\n').filter(l=>l.startsWith('- ['));let verified=0,partial=0;const names=new Set();
 const updated=rows.map(line=>{const m=line.match(/^- \[([x ])\] (C\d+) \*\*(.*?)\*\* — (.*)$/),s=scopes.get(m[3]),checked=s?s[0]:m[1]==='x',description=s?`${checked?'Mechanics verified':'Partial'}: ${s[1]}.`:m[4];if(checked){verified++;names.add(m[3]);}else if(description.startsWith('Partial:'))partial++;return`- [${checked?'x':' '}] ${m[2]} **${m[3]}** — ${description}`;});
 return`# Cumulative coach concept tracker\n\nUpdated: 2026-10-07. [Original list](../../E020-coach-concepts/CONCEPTS.md) is unchanged, including all repeated occurrence IDs.\n\n${rows.length} entries; ${verified} verified occurrences across ${names.size} names; ${partial} partial occurrences. Checked means stated synthetic mechanics, not real-game precision, human benefit or extension readiness.\n\n[Plan](../plan.md) · [Result](../RESULT.md) · [Demo](demo.html) · [Evidence](results.json)\n\n${report.fixtures} authored/reflected cases. Explicit deep profiles prove sound mating offers through every legal acceptance and decline. Exhaustion abstains; profile 0 preserves the frozen parent. Comments <=24 words.\n\n## Per-entry status\n\n${updated.join('\n')}\n`;
}
