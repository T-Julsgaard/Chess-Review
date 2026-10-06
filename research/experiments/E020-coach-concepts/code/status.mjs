const supported = new Map([
  ['Check', 'check; factual king attack only'],
  ['Checkmate', 'checkmate; played move ends in mate'],
  ['Stalemate', 'stalemate; played move ends in stalemate'],
  ['Castling', 'castling; factual move, no safety judgment'],
  ['Kingside castling', 'castling; kingside'],
  ['Queenside castling', 'castling; queenside'],
  ['En passant', 'en-passant; right, removed pawn and discovered-check case'],
  ['Promotion', 'promotion; factual piece change'],
  ['Underpromotion', 'promotion; non-queen piece change, no optimality claim'],
  ['Knight fork', 'fork; new knight fork with exhaustive finite material witnesses'],
  ['Pawn fork', 'fork; new pawn fork with exhaustive finite material witnesses'],
  ['Royal fork', 'fork; knight/pawn king-and-queen target pair only'],
  ['Absolute pin', 'absolute-pin; new single-blocker slider-to-king alignment'],
  ['Discovered check', 'discovered-check; includes en passant, excludes moving castling rook'],
  ['Double check', 'double-check; two king attackers, terminal mate takes priority'],
]);
const partial = new Map([
  ['Fork', 'subset verified: knight/pawn forks only; other pieces deferred'],
  ['Pin', 'subset verified: absolute pins only; relative and cross pins deferred'],
  ['Preventing a tactical motif', 'subset verified: a specific certified fork prevented versus a supplied legal alternative'],
]);

export function renderStatus(source, report) {
  let count = 0, verified = 0, limited = 0;
  const rows = source.split(/\r?\n/).filter(line => line.startsWith('- ')).map(line => {
    const original = line.slice(2), name = original.split(' — ')[0].replaceAll('*','').trim();
    count++;
    const state = supported.get(name), subset = partial.get(name);
    if (state) verified++;
    else if (subset) limited++;
    return `- [${state ? 'x' : ' '}] C${String(count).padStart(4,'0')} **${name}** — ${state ? `Mechanics verified: ${state}.` : subset ? `Partial: ${subset}.` : 'Not implemented.'}`;
  });
  return `# Coach concept implementation tracker\n\nUpdated: 2026-10-06. Every bullet from the [complete supplied list](../CONCEPTS.md) has a stable occurrence ID below; repetitions are preserved.\n\n${count} entries; ${verified} verified occurrences across ${supported.size} concept names; ${limited} partial occurrences. All remaining entries are not implemented. A checked item means its stated mechanics scope passed synthetic tests. It does **not** mean human usefulness, real-game precision, optimal play or extension readiness is verified.\n\n[Protocol](../plan.md) · [Result and limitations](../RESULT.md) · [Demo](demo.html) · [Machine-readable evidence](results.json)\n\nVerification uses ${report.fixtures} authored/reflected fixture cases and independent finite-witness replay. The separate test suite also covers input errors, computation exhaustion and certificate tampering. No real-game data was evaluated.\n\n## Additional comment behaviors\n\n- **Allows a fork:** verified specific legal reply with a bounded knight/pawn fork certificate; no claim about intent.\n- **Avoids a fork:** verified counterfactual comparison to a supplied legal alternative; no claim that all future forks are impossible.\n- **Abstention:** no supported concept produces no comment; computation exhaustion removes tactical claims, retaining known rule facts.\n\n## Per-entry status\n\n${rows.join('\n')}\n`;
}
