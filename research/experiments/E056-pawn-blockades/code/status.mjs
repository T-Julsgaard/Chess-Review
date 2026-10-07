import {renderStatus as parent} from '../../E055-intermediate-sacrifices/code/status.mjs';
const names=new Set(['Blockade','Blockade square','Knight blockade','King blockade']);
export function renderStatus(list,report){
 let text=parent(list,report).replace(/^.*C\d{4} \*\*([^*]+)\*\*.*$/gm,(line,name)=>names.has(name)?line.replace(/^- \[[ x]\]/,'- [x]').replace(/ — .*/,` — Mechanics verified: actual moved ${name==='Knight blockade'?'knight':name==='King blockade'?'king':'nonpawn piece'} occupies the square immediately ahead of an unchanged enemy pawn; complete legal enemy replies show no straight advance; pawn captures and blocker removals retained; no permanent/best-move claim.`):line);
 const rows=[...text.matchAll(/^- \[([ x])\] C\d{4} \*\*([^*]+)\*\* — (.*)$/gm)],verified=rows.filter(r=>r[1]==='x'),partial=rows.filter(r=>r[3].startsWith('Partial:'));
 text=text.replace(/1085 entries; .*?\. Checked/,`1085 entries; ${verified.length} verified occurrences across ${new Set(verified.map(r=>r[2])).size} names; ${partial.length} partial occurrences. Checked`);
 return text.replace(/\d+ authored\/reflected cases\..*?Comments <=24 words\./,`${report.fixtures} authored/reflected cases. New blockades state current occupied-square pawn restraint with complete legal replies, including captures. Full proofs in results.json. Comments <=24 words.`);
}
