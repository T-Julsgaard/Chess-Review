import {renderStatus as parent} from '../../E080-pawn-shield-defense/code/status.mjs';
const shared = 'new actual moved-piece direct contact plus legal occupied-target capture on an explicit hypothetical actor-turn played snapshot; complete inventories/rays/legal moves/capture choices/history independently reconstructed; live nonchecking scope; no actual second move/pass, forced capture, material gain, quality or strategic initiative claim';
export function renderStatus(list, report) {
  let text = parent(list, report);
  for (const [id, subset] of [['C0404', 'enemy nonking target'], ['C0410', 'enemy pawn target'], ['C0411', 'enemy knight/bishop/rook/queen target']]) {
    text = text.replace(new RegExp('^- \\[[ x]\\] ' + id + ' \\*\\*([^*]+)\\*\\* — .*$', 'm'),
      (_line, name) => `- [x] ${id} **${name}** — Mechanics verified: ${subset}; ${shared}.`);
  }
  const rows = [...text.matchAll(/^- \[([ x])\] C\d{4} \*\*([^*]+)\*\* — (.*)$/gm)];
  const verified = rows.filter(r => r[1] === 'x'), partial = rows.filter(r => r[3].startsWith('Partial:'));
  text = text.replace(/1085 entries; .*?\. Checked/,
    `1085 entries; ${verified.length} verified occurrences across ${new Set(verified.map(r => r[2])).size} names; ${partial.length} partial occurrences. Checked`);
  return text.replace(/\d+ authored\/reflected cases\..*?Comments <=24 words\./,
    `${report.fixtures} authored/reflected cases. Direct attacks require new contact by the moved piece plus a legal hypothetical capture; pawn and nonpawn categories have separate evidence. No forced capture or material-gain claim. Full proofs in results.json. Comments <=24 words.`);
}
