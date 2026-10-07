import {renderStatus as parent} from '../../E075-board-material/code/status.mjs';
const scopes={
  C0189:[true,'exact overall own/enemy pawn-square arrangement with full file/rank maps before/after a live legal move changing the pawn map; no weakness or opening identity inferred'],
  C0190:[true,'pawn skeleton represented by complete own/enemy pawn-square/file/rank maps, including pawn capture, EP, promotion and empty maps; no strategic strength inference'],
  C0552:[false,'complete pawn arrangement plus passer/front-blocker/legal-EP and explicit four-file flank counts; contribution to position evaluation remains deferred'],
  C0880:[false,'reuse E075 full inventory/type-vector comparison and declared nominal arithmetic; positional assessment of material imbalance remains deferred'],
  C0882:[false,'new exact whole nonpawn armies: opposite-color bishop pair versus bishop/knight or two knights, either actor role; strategic comparison remains deferred'],
  C0883:[false,'new exact whole nonpawn rook versus two bishops/bishop-knight/two knights, either actor role, all pawns retained; strategic comparison remains deferred'],
  C0893:[false,'changed unequal complete passer counts, geometric front blockers and legal immediate-EP exclusion for both sides; strength/promotion likelihood remains deferred'],
  C0894:[false,'changed unequal pawn counts and full contributors on explicit a–d/e–h file halves; successful advance/passer creation and strategic comparison remain deferred'],
};
export function renderStatus(list,report){
  let text=parent(list,report);
  for(const[id,[verified,scope]]of Object.entries(scopes))text=text.replace(new RegExp('^- \\[[ x]\\] '+id+' \\*\\*([^*]+)\\*\\* — .*$','m'),(_line,name)=>`- [${verified?'x':' '}] ${id} **${name}** — ${verified?'Mechanics verified:':'Partial:'} ${scope}.`);
  const rows=[...text.matchAll(/^- \[([ x])\] C\d{4} \*\*([^*]+)\*\* — (.*)$/gm)],verified=rows.filter(row=>row[1]==='x'),partial=rows.filter(row=>row[3].startsWith('Partial:'));
  text=text.replace(/1085 entries; .*?\. Checked/,`1085 entries; ${verified.length} verified occurrences across ${new Set(verified.map(row=>row[2])).size} names; ${partial.length} partial occurrences. Checked`);
  return text.replace(/\d+ authored\/reflected cases\..*?Comments <=24 words\./,`${report.fixtures} authored/reflected cases. Pawn maps and concrete army/passer/flank facts retain independent complete classification and legal EP proof. Evaluation/strategic scopes stay partial. Full proofs in results.json. Comments <=24 words.`);
}
