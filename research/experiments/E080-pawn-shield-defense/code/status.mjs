import {renderStatus as parent} from '../../E079-central-king-support/code/status.mjs';
const scope = 'actual legal noncapturing nonpromoting cover-pawn advance with unchanged c/e/g home-rank king; complete hypothetical opponent-turn prior mating capture, directly pawn-blocked Q/R/B capture ray, and exhaustive absence of actual opponent mate in one; complete inventories/cover/legal moves/ray/history and independently replayed one-ply proofs; no actual pass, quality, enduring safety or whole-game win claim';
export function renderStatus(list, report) {
  let text = parent(list, report);
  for (const id of ['C0226', 'C0400']) {
    text = text.replace(new RegExp('^- \\[[ x]\\] ' + id + ' \\*\\*([^*]+)\\*\\* — .*$', 'm'),
      (_line, name) => `- [x] ${id} **${name}** — Mechanics verified: ${scope}.`);
  }
  const rows = [...text.matchAll(/^- \[([ x])\] C\d{4} \*\*([^*]+)\*\* — (.*)$/gm)];
  const verified = rows.filter(r => r[1] === 'x'), partial = rows.filter(r => r[3].startsWith('Partial:'));
  text = text.replace(/1085 entries; .*?\. Checked/,
    `1085 entries; ${verified.length} verified occurrences across ${new Set(verified.map(r => r[2])).size} names; ${partial.length} partial occurrences. Checked`);
  return text.replace(/\d+ authored\/reflected cases\..*?Comments <=24 words\./,
    `${report.fixtures} authored/reflected cases. Pawn-shield labels require a complete prior hypothetical mate, causal pawn-blocked capture ray and complete actual no-mate-in-one proof. Enduring king safety stays unresolved. Full proofs in results.json. Comments <=24 words.`);
}
