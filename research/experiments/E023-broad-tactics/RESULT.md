# E023 result and resume state

State: complete, 2026-10-07. Synthetic mechanics gates pass; educational benefit
remains inconclusive. Exploratory. Coach goal active; numerical goal paused.
Usage cutoff remains active; research only, no extension integration or pushes.

Plan registered `5a7aa0a`; evaluated source `5abb478`. Frozen E020–E022 remain
unchanged. [Plan and exposed amendments](plan.md), [API/reproduction](README.md).

## Working scope

Certified forks now cover every piece type and pawn targets. Authored positives
include queen, rook, bishop, king and pawn forks, a bishop king/queen royal fork,
and knight triple attacks. Discovered double attacks require distinct targets
and contributions from both the moved piece and a revealed stationary slider.
Hanging-piece warnings carry legal profitable-capture witnesses through all
immediate replies. Immediate mate warnings replay an actual legal mating move.
X-ray labels explicitly describe a blocker preventing direct attack or defense;
interference identifies one specific geometric attack line removed by the move.
The adapter corrects inherited en-passant warning victim-square wording.

The cumulative [tracker](evidence/concept-status.md) records 82 verified names,
87 verified occurrences, 56 partial occurrences and 942 unimplemented occurrences
among all 1,085 original list entries. Broader strategic/history interpretations
remain partial. Cross-pins stay unimplemented: two absolute pin directions to
the same king/blocker are impossible, so mixed absolute/relative proof is needed.

Example: "Watch out: Rxd1# is checkmate." Other selected comments name forks,
discovered double attacks or concrete targets. The [demo](evidence/demo.html)
keeps detailed witnesses expandable; selected text stays concise.

## Verification

- 56 E023 tests and 286 earlier tests pass: 342 cumulative tests.
- 25 new authored cases plus reflections and 268 inherited cases: 318 total;
  300 emit facts, 12 abstain, six illegal moves are refused.
- Longest selected comment: 17 words, within the declared 24-word bound.
- 160 finite certificate event replays, including 74 E023 event certificates;
  922 defender replies and 1,709 immediate counterreply leaves pass. Some event
  certificates reuse the same proof, so these are not unique-position counts.
- Independent replay rejects missing replies, altered gains and target sets.
  Boundary tests retain countermate/draw rejection, prevent jumping two x-ray
  blockers, verify removed interference attacks and both-color en-passant text.
- Repeated and initially clean local checkout generation at `5abb478` match
  every normalized source hash and all three deterministic output hashes.
- Targeted tests and `npm run verify:source` pass. Generation takes about seven
  seconds after eligibility. Evidence totals about 3.72 MB, exceeding the 3 MB
  planning estimate; no hard acceptance gate was changed.

[Run](evidence/run.json), [repeat](evidence/repeat-run.json),
[clean replay](evidence/clean-run.json), [results](evidence/results.json) retain
revision, starting state, source hashes, guarded-loader receipt, commands,
environment, timing and output hashes. All examples are exposed synthetic
development cases; D001 eligibility is checked but no games are evaluated.
Replay code is separate from detector selection and balance helpers, while
sharing chess.js. Synthetic success does not establish real-game precision or
learning improvement. Failed fixture assumptions and corrections are in plan.

## Limits and next action

Finite tactics stop after defense/capture/immediate response or an opponent
capture/immediate response. They do not prove long-term advantage, inevitable
loss or best play. Geometry labels are descriptive. FEN history remains limited.

Next: register E024 for additional endgame/material transition and concrete
development/placement concepts, with explicit definitions and negative controls.
Continue allowance monitoring; at 10% remaining checkpoint/commit, disable
heartbeat and perform the authorized normal Windows shutdown without `/f`.
