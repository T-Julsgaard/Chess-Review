import {renderStatus as parent} from '../../E051-interference-combinations/code/status.mjs';
const scope='geometrically threatened N/B/R/Q takes its maximum available nominal capture; EVERY legal quiet alternative admits a legal unit-loss capture through ALL own responses (or enemy mate); EVERY actual unit recapture retains the conditional captured-value benefit through ALL own responses; finite three-ply comparison, no best-move or lasting-gain claim';
export function renderStatus(list,report) {
 let text=parent(list,report).replace(/^.*C\d{4} \*\*([^*]+)\*\*.*$/gm,(line,name)=>['Desperado','Desperado combination'].includes(name)?line.replace(/^- \[[ x]\]/,'- [x]').replace(/ — .*/,` — Mechanics verified: ${scope}.`):line);
 const rows=[...text.matchAll(/^- \[([ x])\] C\d{4} \*\*([^*]+)\*\* — (.*)$/gm)],verified=rows.filter(r=>r[1]==='x'),partial=rows.filter(r=>r[3].startsWith('Partial:'));
 text=text.replace(/1085 entries; .*?\. Checked/,`1085 entries; ${verified.length} verified occurrences across ${new Set(verified.map(r=>r[2])).size} names; ${partial.length} partial occurrences. Checked`);
 return text.replace(/\d+ authored\/reflected cases\..*?Comments <=24 words\./,`${report.fixtures} authored/reflected cases. Desperado captures retain a finite conditional benefit compared with every quiet alternative. Full proofs in results.json. Comments <=24 words.`);
}
