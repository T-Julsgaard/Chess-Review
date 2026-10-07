import {renderStatus as parent} from '../../E074-french-scheveningen/code/status.mjs';
const scopes = {
  C0001: [true,'absolute origin/destination square, file and rank of a validated attempted move; both colors and board edges'],
  C0002: [true,'actual legal movement of all six piece types with complete legal-set membership, capture, castling, en passant and every promotion choice; no move-quality claim'],
  C0016: [true,'live-root strict-UCI membership in complete legal move set, validated history and safe actor king after actual move; terminal roots unavailable'],
  C0017: [true,'explicit research attempted-input path refuses nonmember UCI moves, retains complete legal alternatives, no fabricated played position or inferred reason; malformed/invalid-root inputs are errors'],
  C0020: [true,'complete square/type/color piece and pawn inventories and per-type counts before/after actual moves, captures, EP, castling and promotions; kings included in inventory'],
  C0030: [false,'complete inventory comparison and declared nominal P1/N3/B3/R5/Q9/K0 arithmetic from actor viewpoint; positional value remains deferred'],
  C0031: [false,'full per-type count-vector inequality, including equal-point bishop/knight armies and nominal totals; positional assessment of combinations remains deferred'],
  C0547: [false,'complete material inventory and declared nominal arithmetic available; material contribution to position evaluation remains deferred'],
};
export function renderStatus(list,report) {
  let text=parent(list,report);
  for(const [id,[verified,scope]]of Object.entries(scopes))text=text.replace(new RegExp('^- \\[[ x]\\] '+id+' \\*\\*([^*]+)\\*\\* — .*$','m'),
    (_line,name)=>`- [${verified?'x':' '}] ${id} **${name}** — ${verified?'Mechanics verified:':'Partial:'} ${scope}.`);
  const rows=[...text.matchAll(/^- \[([ x])\] C\d{4} \*\*([^*]+)\*\* — (.*)$/gm)];
  const verified=rows.filter(row=>row[1]==='x'),partial=rows.filter(row=>row[3].startsWith('Partial:'));
  text=text.replace(/1085 entries; .*?\. Checked/,`1085 entries; ${verified.length} verified occurrences across ${new Set(verified.map(row=>row[2])).size} names; ${partial.length} partial occurrences. Checked`);
  return text.replace(/\d+ authored\/reflected cases\..*?Comments <=24 words\./,`${report.fixtures} authored/reflected cases. Optional foundation comments retain complete legal membership, input refusal, board coordinates and exact inventory/nominal facts. Partial material evaluation scopes remain partial. Full proofs in results.json. Comments <=24 words.`);
}
