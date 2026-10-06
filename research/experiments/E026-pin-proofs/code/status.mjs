import {renderStatus as previous} from '../../E025-pawn-formations/code/status.mjs';
const scopes=new Map([
 ['Relative pin','new queen alignment; every legal blocker move off that line permits queen capture with positive immediate net material versus the post-move position; other defenses remain'],
 ['Cross-pin','mixed king/queen pin on distinct slider lines; nonempty legal off-queen-line reply set passes the relative-pin proof; other cross-pin forms excluded'],
 ['Removal of the defender','captured geometric defender; every legal reply permits original target capture with positive immediate net material versus the post-capture position; later play unproven'],
 ['Removing protection','same finite all-defense target-capture proof; no claim all protection disappears']
]);
export function renderStatus(source,report){
 const rows=previous(source,report).split('\n').filter(l=>l.startsWith('- ['));let verified=0,partial=0;const names=new Set();
 const updated=rows.map(line=>{const m=line.match(/^- \[([x ])\] (C\d+) \*\*(.*?)\*\* — (.*)$/),scope=scopes.get(m[3]),checked=!!scope||m[1]==='x',description=scope?`Mechanics verified: ${scope}.`:m[4];if(checked){verified++;names.add(m[3]);}else if(description.startsWith('Partial:'))partial++;return`- [${checked?'x':' '}] ${m[2]} **${m[3]}** — ${description}`;});
 return`# Cumulative coach concept tracker\n\nUpdated: 2026-10-07. [Original supplied list](../../E020-coach-concepts/CONCEPTS.md) remains unchanged, including repeated occurrence IDs.\n\n${rows.length} entries; ${verified} verified occurrences across ${names.size} names; ${partial} partial occurrences. Checked means stated synthetic mechanics, not real-game precision, human benefit or extension readiness.\n\n[Plan](../plan.md) · [Result](../RESULT.md) · [Demo](demo.html) · [Evidence](results.json)\n\n${report.fixtures} authored/reflected cases. Selected comments <=24 words. Pins are conditional on legal off-line moves; defender removal uses all legal replies. Both prove only immediate nominal material, with a post-move baseline and explicit draw/mate rejection. Geometric fallback remains partial when no certificate exists.\n\n## Per-entry status\n\n${updated.join('\n')}\n`;
}
