# E020: Evidence-backed coach concepts

Date: 2026-10-06. Author: Codex, at the user's request. Track: educational
move explanations. This is a separate task; the paused numerical research goal
remains paused. E020 was previously a proposed rating question, not a registered
experiment. That question moves to the next unused ID.

## Question and claim

Can a research-only prototype attach concrete, reproducible chess facts to a
legal move, and abstain from tactical claims that fail legal reply checks?
The comparator is the current phrase-bank commentary at baseline `759d24a`.
No runtime, scoring, phrase banks or extension files will change.

The bounded claim is mechanics on authored synthetic positions. These are not
real games, an estimate of player usefulness, or scientific confirmation.
F010/F011 show why a capture/offer heuristic cannot establish tactical merit;
this task uses explicit legal branches rather than an engine's preferred line.

## Candidate, scope and evidence contract

- Deterministic move facts: check/checkmate/stalemate, castling (both wings),
  en passant, promotion/underpromotion, discovered check and double check.
- New absolute pins: slider, blocker and enemy king aligned; describe the
  inability to move **off the pin line**, not an inability to move at all.
- New knight/pawn forks: moved piece attacks at least two enemy non-pawn
  targets, including the king where applicable. Only publish a fork comment
  when every legal defending reply admits a legal capture of an original
  target by that piece and positive net nominal material after every immediate
  recapture/countermove. Reject defender mate/draw and terminal draw branches.
  This is a finite certificate, not proof of a winning position or best move.
- A reply scan may identify an opponent's supported fork. Describe a specific
  legal reply that allows the fork. An avoidance comparison requires an actual
  legal alternative from the same starting position, a certified fork after
  that alternative, and an exhaustive successful scan after the played move.
  Say only that the specified fork is prevented; do not infer player intent.
- No "nice", "good", "best", forced win or strategic improvement from geometry
  alone. Emit structured evidence and neutral square-specific wording. Terminal
  results outrank lesser concepts. Invalid input and exhausted computation
  produce explicit failure/abstention, never a truncated positive claim.
- Legal standard-chess FEN and UCI moves only. Keep turn/castling/en-passant
  state and counters. Known history unavailable: repetition claims unsupported;
  do not make draw-by-repetition/fifty-move/dead-position comments. Rule facts
  follow the bundled chess.js API; validate non-moving king safety too.

Rules reference: [FIDE Laws, articles 3.1.3, 3.9 and 5.1/5.2](https://handbook.fide.com/chapter/e012023).
Geometric attacks include pinned pieces; legal captures require move generation.
The user-supplied list is a vocabulary backlog, not an authoritative definition
or instruction to mention every concept.

## Inputs, access and exposure

All decisive inputs are newly authored synthetic mechanics fixtures, labelled
as such, with no imported game content or real-player claims. The user list
contains vocabulary only. All fixtures/expected labels are exposed development
tests; no train/test splits, ratings, population estimates or confidence
intervals apply. D001 eligibility preflight (`inspect`, public-data-v1) passed
before this task; its receipt will be retained by the runner's guarded loader.
D001 game content and existing review packs are not used. No new acquisition,
terms verification or dataset registration is needed for synthetic fixtures.

Every executable input-loading entry point must call `openResearchData()`;
synthetic fixtures are source-authored code, not a bypass for external inputs.
The demo runner accepts only the built-in fixtures. Future real-game evaluation
requires a new registered input path, plan and fresh independent assessment.

## Gates and evaluation

Primary: all explicitly expected concept labels, evidence and abstentions pass
on the synthetic corpus; zero false positive certificates on declared negative
cases. Acceptance requires all tests, targeted research checks and
`npm run verify:source`. No minimum population effect or statistical uncertainty
claim applies to these exact examples. Include both colors, pinned attackers,
capturable forkers, defended/poisoned targets, existing motifs, legal pin-line
moves, non-discovered check, mate/stalemate, special moves, invalid inputs and
budget exhaustion. Expand fixtures for uncovered boundary defects and record
that as development exposure, not untouched confirmation.

Retain every legal defender reply and a capture witness for each accepted fork,
including the worst immediate response and material delta. Tests replay
certificates using legal move generation independently of the detector's
selection. Color-swap/rank-reflection checks verify perspective. A repeated run
must have identical content hashes (excluding run metadata); clean temporary
Git export replay must match. Neither is independent chess-engine validation.

One candidate, no fitted parameters. Nominal values p=1,n=b=3,r=5,q=9,k=0;
certificate gain must be strictly positive, computed relative to before the
fork move. Default bounded node budget; on exhaustion abstain. Engine options,
NNUE, search caches and seeds: not applicable (no engine, no randomness).
Resource estimate: under one minute and 1 MB retained evidence, smoke first;
measure actual cost. If response scans cost too much, retain explicit partial
coverage and abstentions. Stop after mechanics verification and a reproducible
demo; human instructional validity and real-game precision remain pending.

## Reproduction and delivery

From repo root:

```sh
node --test research/experiments/E020-coach-concepts/code/*.test.mjs
node research/experiments/E020-coach-concepts/code/run.mjs
npm run verify:source
```

Use Node.js 24 and the maintained `lib/chess.js`, no new dependencies. Retain
code revision, exact commands, environment, fixture/code hashes, eligibility
receipt, results, timing and HTML demo. Save the complete supplied list and
a per-entry implementation tracker; distinguish bounded mechanics verification
from human validation and adoption. No production promotion in this task.

## Amendments

2026-10-06, development implementation: all authored fixtures and outputs were
exposed during debugging. Corrected a synthetic warning's target square and
non-moving king placement; added pawns to separate a positive queen-fork
example from the dead-position negative case. Split pawn-fork examples by
whether the king has an escape from the immediate countermate. Retained the
mate/draw cases as negative fixtures, and added defended equal-value targets
and pinner relocation. These are test-design corrections/coverage extensions,
not altered gates, independent labels or confirmation. Adapted castling checks
to the bundled chess.js API (it has no combined `isCastle()` method).
Final development review also added explicit FEN castling/EP/counter consistency
checks and negative tests: the bundled FEN validator alone does not establish
the starting king/rook or the last double pawn move. This only tightens invalid
input refusal; it does not establish historical reachability or change gates.
