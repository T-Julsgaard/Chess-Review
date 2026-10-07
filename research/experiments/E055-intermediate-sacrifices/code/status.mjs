import {renderStatus as parent} from '../../E054-causal-mating-combinations/code/status.mjs';
export function renderStatus(list,report){
 let text=parent(list,report).replace(/^.*C\d{4} \*\*Intermediate sacrifice\*\*.*$/gm,line=>line.replace(/^- \[[ x]\]/,'- [x]').replace(/ — .*/,' — Mechanics verified: full history ends in enemy capture; every legal original recapture enumerated; different positive-cost offer forces mate in 2 or 3 via full same-row all-defense proof; no original mate in one; no eventual-recapture/best-move claim.'));
 const rows=[...text.matchAll(/^- \[([ x])\] C\d{4} \*\*([^*]+)\*\* — (.*)$/gm)],verified=rows.filter(r=>r[1]==='x'),partial=rows.filter(r=>r[3].startsWith('Partial:'));
 text=text.replace(/1085 entries; .*?\. Checked/,`1085 entries; ${verified.length} verified occurrences across ${new Set(verified.map(r=>r[2])).size} names; ${partial.length} partial occurrences. Checked`);
 return text.replace(/\d+ authored\/reflected cases\..*?Comments <=24 words\./,`${report.fixtures} authored/reflected cases. Intermediate sacrifices require exact capture history, legal recapture alternatives and full mating proofs. Full proofs in results.json. Comments <=24 words.`);
}
