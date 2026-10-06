# Pawn formations and meaningful comment selection

Research-only `explainMove({fen,move,history?,...})` imports E024. It adds hanging
pawn geometry, legal hypothetical levers, chain-base attacks, geometric defender
removal, locked/fixed/open centers, king-cover geometry, pawn symmetry, bishop
pawn-color counts and directly blocked chain diagonals. Partial concepts never
claim strategic value, permanent weakness or safe advancement.

Run `node --test research/experiments/E025-pawn-formations/code/*.test.mjs`, then
`node research/experiments/E025-pawn-formations/code/run.mjs` (optional
`--out research/runs/E025/name`). [Tracker](evidence/concept-status.md) retains
all original concepts; [demo](evidence/demo.html) shows new examples.

The cumulative selection policy preserves specific mate patterns, royal/triple
forks and outposts instead of flattening them into generic checkmate/placement
text. Immediate mate and finite material-loss warnings retain highest priority.
Selected comments stay <=24 words, with detailed evidence separate. Future
research wrappers can import `selectComment` and `contextualText` directly.
No extension integration; all fixtures are authored synthetic development data.
