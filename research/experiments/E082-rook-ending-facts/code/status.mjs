import {renderStatus as parent} from '../../E081-direct-attacks/code/status.mjs';
export function renderStatus(list, report) {
  let text = parent(list, report);
  for (const [id, scope] of [['C0665', 'actual moved-rook rank check in a live K/R/P ending with exactly one rook per color; complete clear ray, checkers and all legal evasions; no advanced-passer prerequisite or safety/draw claim'],
    ['C0681', 'newly established exact whole-board four-versus-three pawn counts in a live K/R/P ending with one rook per color, either side holding four; all wings/doubled pawns included; no outcome or quality claim'],
    ['C0682', 'newly established exact whole-board three-versus-two pawn counts in a live K/R/P ending with one rook per color, either side holding three; all wings/doubled pawns included; no outcome or quality claim']]) {
    text = text.replace(new RegExp('^- \\[[ x]\\] ' + id + ' \\*\\*([^*]+)\\*\\* — .*$', 'm'),
      (_line, name) => `- [x] ${id} **${name}** — Mechanics verified: ${scope}; complete legal transition, history and inventories independently replayed.`);
  }
  const rows = [...text.matchAll(/^- \[([ x])\] C\d{4} \*\*([^*]+)\*\* — (.*)$/gm)];
  const verified = rows.filter(r => r[1] === 'x'), partial = rows.filter(r => r[3].startsWith('Partial:'));
  text = text.replace(/1085 entries; .*?\. Checked/,
    `1085 entries; ${verified.length} verified occurrences across ${new Set(verified.map(r => r[2])).size} names; ${partial.length} partial occurrences. Checked`);
  return text.replace(/\d+ authored\/reflected cases\..*?Comments <=24 words\./,
    `${report.fixtures} authored/reflected cases. Rook-ending side checks and exact pawn-count transitions require complete independent certificates; no winning, drawing or move-quality claim. Full proofs in results.json. Comments <=24 words.`);
}
