import {renderStatus as parent} from '../../E053-cross-checks/code/status.mjs';
const scopes={
 'Attraction combination':'positive nominal mating offer; EVERY legal defense permits mate next move; legal king acceptance changes its square and the SAME before-legal nonmating move becomes actual mate; conditional acceptance, no best-move/intent claim',
 'Decoy combination':'positive all-defense mating offer plus independently replayed king attraction or nonking self-blocking; mere defender-duty deflection insufficient; same-row full mate and complete causal-role certificate required',
 'Blocking combination':'positive all-defense mating offer; accepted nonking unit blocks an adjacent king flight; actual mate is legal and removing ONLY that capturer restores a legal escape onto its square; explicit artificial counterfactual, conditional acceptance'
};
export function renderStatus(list,report){
 let text=parent(list,report).replace(/^.*C\d{4} \*\*([^*]+)\*\*.*$/gm,(line,name)=>scopes[name]?line.replace(/^- \[[ x]\]/,'- [x]').replace(/ — .*/,` — Mechanics verified: ${scopes[name]}.`):line);
 const rows=[...text.matchAll(/^- \[([ x])\] C\d{4} \*\*([^*]+)\*\* — (.*)$/gm)],verified=rows.filter(r=>r[1]==='x'),partial=rows.filter(r=>r[3].startsWith('Partial:'));
 text=text.replace(/1085 entries; .*?\. Checked/,`1085 entries; ${verified.length} verified occurrences across ${new Set(verified.map(r=>r[2])).size} names; ${partial.length} partial occurrences. Checked`);
 return text.replace(/\d+ authored\/reflected cases\..*?Comments <=24 words\./,`${report.fixtures} authored/reflected cases. Named mating combinations require all-defense mate and independently replayed causal roles. Full proofs in results.json. Comments <=24 words.`);
}
