# E025 result and resume state

State: complete, 2026-10-07. Synthetic mechanics gates pass; educational benefit
is inconclusive. Exploratory research only. Coach goal and usage cutoff active;
numerical research remains paused. No extension integration or pushes.

Plan registered `14c8f16`; evaluated source `0c42ba9`. [Plan](plan.md) records
scopes and selection amendments. Frozen E020–E024 remain unchanged.

## Working scope

The prototype recognizes hanging c/d pawn pairs, legal hypothetical pawn levers,
attacked central-chain bases, matched locked chains, current fixed/open-center
geometry, pawn cover, exact pawn symmetry, bishop pawn-color counts and directly
blocked forward chain diagonals. Geometric defender removal stays partial:
the comment names support and remaining defenders, without claiming profitable
target capture or that pinned defenders can legally recapture.

The cumulative [tracker](evidence/concept-status.md) has 125 verified names,
132 verified occurrences, 78 partial occurrences and 875 unimplemented entries
among all 1,085 original bullets. Castled-king tracking reuses actual E020
castling facts. Count/cover/geometry facts never imply bad bishop, permanent
holes, weak color complex or improved king safety.

The shared research [selection policy](code/selection.mjs) fixes priority loss
between successive wrappers. Specific smothered/back-rank mates, royal/triple
forks and protected outposts remain selectable instead of being flattened into
generic checkmate/fork/placement text. Immediate mate and certified material-loss
warnings still take priority. Royal-fork wording names the king and queen without
changing any accepted tactical proof. Specific supported motifs outrank generic
profitable-capture numbers. [New examples demo](evidence/demo.html).

## Evidence

- First E025 fixture pass: 62/62 tests, zero failures. All 437 earlier tests
  also pass: 499 cumulative tests.
- 28 new authored positions plus reflections, and 408 inherited cases:
  464 total; 444 emit facts, 14 abstain, six illegal moves are refused.
- Longest selected comment is 19 words, within the declared 24-word bound.
- All 212 finite certificate event replays pass: 1,312 defender replies and
  1,709 immediate counterreply leaves. Event proofs can be reused, so this is
  not a count of unique certificate positions.
- Independent checks replay hypothetical captures, exact reflected pawn sets,
  same-color counts, every chain ram and home-rank cover bounds. Negative
  controls retain supported/doubled/rear hanging pairs, pinned levers, extra
  central pawns, central tension, incomplete/old locks, blocked target captures,
  remaining defenders, away-from-home cover and non-chain bishop blockers.
- Selected-text regressions pass for inherited smothered/back-rank mate,
  triple attack, bishop royal fork and protected knight outpost, plus warning
  priority. Earlier experiments tested availability but did not catch this
  cumulative selection regression; frozen evidence is preserved.
- Repeated and initially clean local checkout generation at `0c42ba9` match
  every normalized source hash and all three deterministic output hashes.
- Targeted checks and `npm run verify:source` pass. Generation takes about
  ten seconds after eligibility; compact evidence is about 1.06 MB.

[Run](evidence/run.json), [repeat](evidence/repeat-run.json),
[clean replay](evidence/clean-run.json), [results](evidence/results.json) retain
revision, source hashes, starting Git state, eligibility receipt, command,
environment, timing and output hashes. Full new cases are retained; inherited
cases retain FEN/move/comment/event IDs and current full-result fingerprints,
with frozen detail links and pure-API reconstruction. All inherited cases and
their finite certificates are evaluated. No real game is evaluated; all inputs
are exposed authored synthetic data. Shared chess.js limits independence.

## Next action

Register E026 for finite target-capture proofs after defender removal and
conditional relative/cross pins. Relative pin should require at least one
legal blocker move off the queen-pin line, with a legal original-slider target
capture and positive net material through every immediate reply after each
such move. Cross-pin needs a second absolute king-pin line on that blocker;
two absolute pin directions to the same king remain impossible. Preserve
countercheck/countermate/draw and capturable-slider negatives, and import the
shared selection policy to keep comments specific.

Continue live usage monitoring. At 10% remaining in the 300-minute window,
checkpoint/commit, disable heartbeat, then authorized normal Windows shutdown
without `/f`.
