# FRIEND-03: Supported, pawn-unassailable wedge restricting the king (C0219)

Temporary identifier; renumbered at integration. Registered 2026-10-08 before any
detector code or fixture evaluation, separate checkout, local branch
`friend/coach-concept-research`. Canonical trackers/INDEX/queue/frozen evidence
untouched. E081 attack work avoided. Not pushed; no extension change.

## Why this concept

Original row C0219 "Pawn wedge" (advanced pawn restricting the enemy position) is
rank 18, phase 1, "Not implemented" in the E080 tracker. The general phrase cannot
be verified geometrically. This study registers a NARROW, checkable sub-claim and
keeps the broad concept partial: wedge = supported, advanced, pawn-unassailable pawn
that demonstrably removes enemy-king destinations. It overlaps E062 (pawn space,
king destinations) deliberately; the new content is the support and permanence
gates. At integration the owner may merge or reuse E062 helpers.

## Exact claim

Opt-in `wedgeTags` wrapper on frozen E080 `explainMove` (default false returns the
exact E080 result; strict boolean). Emit one `pawn-wedge` event only when ALL hold:

1. Root and played position live; history validated as in the parent; foundation
   refusal means not-applicable.
2. The actual move is a pawn move or pawn capture (non-promotion) that ends on the
   actor's relative rank 5 or 6.
3. Supported: after the move an own pawn stands on an adjacent file, one rank
   behind (relative), so the wedge is statically pawn-protected.
4. Pawn-unassailable: no enemy pawn can EVER attack the wedge square, allowing any
   sequence of pawn moves and pawn captures (piece blocking ignored, so the test
   is about pawn reachability only). Detector uses the closed-form bound: an enemy
   pawn at (file f2, rank r2) can reach an attacking square (adjacent file, one
   rank further toward the actor than the wedge) only if the rank distance is at
   least the file distance (each file shift needs a capture). The independent replay
   verifies by exhaustive pawn-reachability search, not the formula.
5. Restriction witness: build the enemy-to-move legal king move set in the actual
   position, and in a counterfactual with the wedge pawn removed (EP cleared, enemy
   to move, only if both boards are legal and live). At least one king destination
   present counterfactually is absent actually, and every such denied square is
   attacked by the wedge pawn. Full king move sets retained.

Text (<=24 words, qualityClaim false): "Pawn wedge: e6 is supported and cannot be
challenged by pawns, denying the enemy king f7." Priority 4.3 (below parents). No
claim of advantage, cramp, attack, good move or strategic value; only enemy king
destinations are tested. Broader cramping stays partial.

## Evidence / budget

Move record, FENs, wedge square and supporter, enemy pawn reachability table (every
enemy pawn with its minimal pawn-move count to an attacking square or none), both
king move lists, denied set, history. `maxWedgeNodes` strict 0..50000 default 50000;
ticks per ply, legal query, move, board extraction, each enemy pawn, counterfactual
build, each king move set. Atomic exhaustion keeps exact parent output.

## Independent replay

Own FEN reader; recomputes support, reachability by BFS over pawn moves/captures,
king destination sets by an independent king-step enumerator (enemy attack maps
computed by own ray code for the counterfactual; actual set cross-checked with
chess.js), denied squares, text, priority, budget. Tamper tests.

## Prospective gates

Positives: both colors; relative rank 5 and 6; advance and capture arrivals; one and
two denied squares; chain support from either side. Negatives retained: unsupported
pawn, rank 4 or 7, promotion, enemy pawn can still challenge (adjacent file pawn
close, and a far pawn reaching via captures), no king destination denied (king far),
non-pawn move, pawn gives check but the denied-set rule fails, terminal after move,
invalid inputs, non-boolean/budget gates, disabled equals parent. Gate: expected
statuses, independent replay, no events on negatives, identical main/repeat/clean
outputs, regressions pass. Failures preserved.

## Data, reproduction, cost

Authored synthetic only; `openResearchData(['D001'],{purpose:'test'})` first.
Command: `node research/experiments/FRIEND-03-pawn-wedge/code/run.mjs` (`--out DIR`).
Seconds, under 1 MB; soft targets only.

## Amendments

None yet.
