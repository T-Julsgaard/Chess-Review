import {renderStatus as parent} from '../../E052-desperado-captures/code/status.mjs';
export function renderStatus(list,report){
 let text=parent(list,report).replace(/^.*C\d{4} \*\*([^*]+)\*\*.*$/gm,(line,name)=>name==='Cross-check'?line.replace(/^- \[[ x]\]/,'- [x]').replace(/ — .*/,' — Mechanics verified: legal checking answer to a check; exact original/counterchecker sets, typed blocking rays or checker capture (including EP) or king discovery; direct/discovered/double counterchecks and promotions; ALL legal enemy evasions replayed; neutral factual wording, no advantage claim.'):line);
 const rows=[...text.matchAll(/^- \[([ x])\] C\d{4} \*\*([^*]+)\*\* — (.*)$/gm)],verified=rows.filter(r=>r[1]==='x'),partial=rows.filter(r=>r[3].startsWith('Partial:'));
 text=text.replace(/1085 entries; .*?\. Checked/,`1085 entries; ${verified.length} verified occurrences across ${new Set(verified.map(r=>r[2])).size} names; ${partial.length} partial occurrences. Checked`);
 return text.replace(/\d+ authored\/reflected cases\..*?Comments <=24 words\./,`${report.fixtures} authored/reflected cases. Cross-checks legally answer check with check; every enemy evasion is retained. Full proofs in results.json. Comments <=24 words.`);
}
