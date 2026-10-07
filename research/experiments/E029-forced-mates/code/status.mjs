import {renderStatus as previous} from '../../E028-mating-patterns/code/status.mjs';
const scopes=new Map([
 ['Forced mate',[true,'played move has an independently replayed legal all-defense mate within two/three attacker moves; shorter horizon checked, bounded profile required']],
 ['Mate in two',[true,'actual played move plus every defender reply permits immediate mating move; no mate in one was played']],
 ['Mate in three',[true,'all-defense legal tree reaches opponent checkmate within three attacker moves; complete mate-in-two failure tree establishes no shorter guarantee']],
 ['Missing mate',[true,'shorter legal alternative has positive mate proof and played move has complete failure counterstrategy at same bound; no claim all later mating chances lost']],
 ...['Calculation tree','Calculation depth','Search depth','Mate search','Variation'].map(name=>[name,[false,'bounded mate tree/profile and verified continuation are implemented in research evidence; generic calculation/variation coaching label remains outside this candidate']])
]);
export function renderStatus(source,report){
 const rows=previous(source,report).split('\n').filter(l=>l.startsWith('- ['));let verified=0,partial=0;const names=new Set();
 const updated=rows.map(line=>{const m=line.match(/^- \[([x ])\] (C\d+) \*\*(.*?)\*\* — (.*)$/),s=scopes.get(m[3]),checked=s?s[0]:m[1]==='x',description=s?`${checked?'Mechanics verified':'Partial'}: ${s[1]}.`:m[4];if(checked){verified++;names.add(m[3]);}else if(description.startsWith('Partial:'))partial++;return`- [${checked?'x':' '}] ${m[2]} **${m[3]}** — ${description}`;});
 return`# Cumulative coach concept tracker\n\nUpdated: 2026-10-07. [Original list](../../E020-coach-concepts/CONCEPTS.md) is unchanged, including all repeated occurrence IDs.\n\n${rows.length} entries; ${verified} verified occurrences across ${names.size} names; ${partial} partial occurrences. Checked means stated synthetic mechanics, not real-game precision, human benefit or extension readiness.\n\n[Plan](../plan.md) · [Result](../RESULT.md) · [Demo](demo.html) · [Evidence](results.json)\n\n${report.fixtures} authored/reflected cases. Explicit mateDepth 2/3 enables deep comments; profile 0 preserves E028 exactly. New comments require complete win/refutation trees; exhaustion abstains. Selected comments <=24 words.\n\n## Per-entry status\n\n${updated.join('\n')}\n`;
}
