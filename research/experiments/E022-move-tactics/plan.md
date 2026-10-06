# E022: concrete move facts and bounded tactical comments

Registered 2026-10-07 before decisive evaluation. E020/E021 remain frozen.
Goal: add brief concepts that explain actual move effects without inventing
intent, best play or strategic benefit. Research only; numerical goal paused.

## Definitions and candidate

Import E021 legal move explanation. Emit capture identity, non-pawn removal
(simplification as a count only), check evasion by checker capture/king move/
interposition, and sole legal move when pre-move legal count is one. Identify
new discovered attacks by stationary sliders after another piece vacates their
previously blocked line to an enemy non-king target. Require geometric attack
and a legal immediate capture on a synthetic same-side-to-move board; never
promise the target will remain available after the opponent replies. Newly
loose enemy pieces mean no geometric friendly defender, not profitable capture.
En prise means an opponent has a legal immediate capture, not material loss.
Newly attacked own pieces are warnings with an explicit legal capture witness.

Absolute skewer: moved rook/bishop/queen checks a king on its line with an enemy
non-king target beyond it. Before move, the same attacker did not check that
king. Exhaust every legal defender reply: each must allow that same slider to
legally capture that original target. Exhaust each immediate counterreply:
positive nominal net material relative to BEFORE the played move must remain.
Reject any defender terminal outcome or counterreply mate/draw. A successful
attacker checkmate is permitted. Keep the line, every witness and worst gain.
Bound to 50,000 move generation/application operations; exhaustion removes
all E022 finite material claims. E020 independently retains its own budget.

Played profitable capture: exhaust all immediate opponent replies after a
capture; each leaves positive nominal net gain relative to the pre-move board,
with no defender mate or draw. Phrase explicitly as surviving immediate
replies, not a long-term guarantee. Capturing a rook with a minor piece emits
"winning the exchange" only if this gate passes; pawn-taking-pieces is just a
capture. No sacrifice intent, relative pin, general skewer or trapping claim.

Mate pattern subsets: actual checkmate, knight checking and all on-board
adjacent king squares occupied by friendly pieces = smothered mate. Back-rank
mate requires king on own home rank, a rook/queen checking along that rank,
and all on-board adjacent squares one rank forward occupied by friendly pawns.
Mate remains first priority. Draw facts only chess.js insufficient-material
result and 100-halfmove threshold with explicit claim-condition wording, never
infer repetition from FEN. Special history and tournament adjudication deferred.

## Gates and evidence

Author exposed synthetic positive/negative fixtures, each also rank/color
reflected. Assert exact expected new IDs (excluding inherited events), bounded
comment length <=24 words, invalid moves refused, no certificate on exhaustion.
Independently replay skewer witnesses without detector selection, recompute
nominal balance and all immediate replies; tampering must fail. Independent
material capture replay also checks completeness. Test blocked/old discovered
attacks, pinned geometric attackers, capturable sliders, interposing/countermate
defenses, terminal draws, false mate-pattern geometry and multiple legal moves.

Guard every input-loading entry point with D001 eligibility before dynamic
fixture loading; no real games are used. Node 24 and bundled chess.js only,
no engine/seed/cache. One candidate, no tuning or human holdout. Retain revision,
normalized source/input hashes, command, receipt, timings and output hashes.
Repeat and clean-source generation must match deterministic evidence. Estimate
under one minute and 3 MB retained evidence. Run targeted tests plus source check
before local commits. Record exposed fixes as amendments. Educational usefulness
remains inconclusive until independent player/real-game assessment.

Continue under the active 10%-remaining five-hour monitor. Check allowance each
batch; at usedPercent>=90 in the 300-minute window checkpoint/commit, disable
heartbeat, then normal `shutdown.exe /s /t 0` without `/f`. No pushes.

## Exposed development amendments

Initial 76-case test pass failed 23 tests, including reflected copies and a
dependent tampering test. Reasons: three bishops initially checked the nonmoving
king; one bishop move was not diagonal; a nominally undefended target still had
a defender; a knight did not attack the intended target; two draw fixtures
started in already-terminal positions; the purported only move was illegal;
and an unprotected skewer attacker could be captured by the king. Correct these
authored setups, retaining the capturable attacker as a negative. Move the
interposition defender far enough to admit a legal blocking reply. Gates remain
unchanged. Add explicit immediate countermate and defender fifty-move draw cases.
All expected new event multisets are exposed development annotations, reviewed
after smoke output; they verify regression, not independent precision.
Capture simplification requires the actual non-pawn count to fall, so promotion
captures do not falsely claim one fewer piece. En-passant checker capture uses
the removed pawn's square. Terminal played mate selects its pattern rather
than performing a redundant finite material search.
Combined demo smoke exposed the frozen renderer's assumption that every
attacker event has a fork target array. Add an E022 display adapter for singular
discovered/skewer targets; canonical results keep their original schema.
