# E025: objective pawn formations and attack-line changes

Registered 2026-10-07 before evaluation. Import frozen E024; research only.
One deterministic candidate, authored synthetic fixtures, no engine/seed/tuning.

## Definitions

Hanging-pawn geometry: exactly one own c-pawn and d-pawn on the same relative
fourth/fifth rank, no own pawn on b/e files, no other pawn on c/d. Identify the
pair/island, not weakness or optimal plans. Pawn lever: played noncapture pawn
advance creates a new attack on an enemy pawn, with a legal hypothetical
same-side capture witness on the resulting board. Opponent responses may remove
it. Central break subset: that new target occupies d4/e4/d5/e5. Undermining-center
subset: target is a base of an enemy pawn-support component containing a central
pawn. State the attacked base/support, not future structural collapse.

Removal of defender: played capture removes a geometric defender of a remaining
enemy target, and the target then admits a legal same-side capture on the board.
Other defenders can remain; no profitable capture or best play implied. Retain
before defender list, removed square, target and legal capture witness. This
extends E022's new-zero-defenders subset without rewriting frozen evidence.

Locked pawn chains: own and enemy support components of at least two pawns,
every member directly rammed by an opposing pawn and the ram pairs match the
two components exactly. Closed-center subset: at least two own chain members
occupy central squares. Fixed-center geometry: >=2 central pawns across both
sides, all straight advances occupied and no geometric enemy capture/EP targets.
State current immobility only, not inability to change the structure later.
Open-center subset: no pawns anywhere on d/e files after previously some existed.

Pawn cover geometry for kings on c/e/g home-rank squares: own pawns within two
ranks ahead on the king's and neighboring files. Report squares/count changes,
never improved safety. Capture of opponent cover pawn reports removed square
and king; sacrifice intent and destruction of an entire shield remain partial.
Symmetric pawn structure means exact same-file rank-reflection of both armies'
pawns, at least two each; comment only on newly symmetric/asymmetric state.
This is pawn symmetry, not full-position equality or evaluation symmetry.

Pawn-color-complex facts: after a moved/captured pawn changes a color count,
own bishop and own pawns sharing its color are counted. Phrase numbers only,
never "bad bishop", weak squares or permanent holes. A bishop behind a pawn
chain geometry subset requires the bishop be directly blocked on a forward
diagonal by a friendly pawn belonging to a >=2-pawn support component; report
the exact blocker and chain, not passivity. No good/bad piece judgment.
Castled-king alias can reuse actual E020 castling facts. Pawn levers, formations
and line changes must be new, not repeated labels for unchanged motifs.

## Verification

Each authored fixture plus rank/color reflection. Positive/negative labels,
<=24 words, exact count/geometry witnesses. Independently recompute pawn color
counts, cover rays and symmetry; legal capture witnesses replay on a clearly
marked hypothetical board. Negative controls: doubled or supported hanging
pairs, pinned levers, noncentral targets, remaining defenders, incomplete locks,
central tension, old formations, extra d/e pawns, king cover away from home,
blocked capture lines, wrong-color bishops and non-chain blockers.

Guard input-loading runners/tests with shared D001 eligibility before dynamic
authored fixtures; no game sample. Retain exact revision, normalized hashes,
commands, policy receipt, environment, timing and output hashes. Preserve all
earlier mechanics fixtures and tactical witness replay. Store full new cases
and fingerprinted inherited cases with frozen detail links. Repeat and initially
clean local checkout outputs must match. Estimate <=30 seconds and <=3 MB.
Run targeted tests and source integrity before commits; log exposed fixes.
Synthetic mechanics do not establish human usefulness or real-game precision.

Live 300-minute allowance cutoff continues: at 10% remaining checkpoint/commit,
disable heartbeat and normal authorized `shutdown.exe /s /t 0` without `/f`.
No extension integration, pushes or numerical goal restart.
