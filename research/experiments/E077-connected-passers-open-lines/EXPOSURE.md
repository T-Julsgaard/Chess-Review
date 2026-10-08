# E077 development exposures

2026-10-08. Initial guarded pilot could not load fixtures: reflect was imported
from E024 transitions.mjs, which does not export it. Correct import to E024
fixtures.mjs; no candidate facts were evaluated and no gates changed.

The first evaluated pilot had ten failures across both colors. Same-rank passer
fixture d2d4 allowed enemy e4d3 en passant, correctly excluding the new pawn;
use d3d4 for the intended non-EP same-rank case and keep a separate explicit
legal-EP negative. Own-blockade case had two valid pairs but E021 top-rank-first
ordering differed from independent scalar-square ordering; canonicalize the
new certificate pair list by sorted square strings, retaining both full events.
Queen d4 already attacked enemy Kh8 diagonally in three fixtures; relocate that
enemy king to g8 for those intended live roots. No root legality, EP, pure-pawn,
all-seven-horizontal, live-state or budget gate is relaxed.

Focused suite then exposed one assertion in the three-pawn pair case: default
enemy Pa7 was a front neighbor of own Pb4, so the left pair was not passed.
For the intended two-pair positive, replace default Pa7 with enemy Ph7. Preserve
front-blocker negatives elsewhere; both resulting pair certificates remain
required rather than reducing the expected event count.

The registered multiple-open-file probe is an impossibility negative for legal
single moves: ordinary pawn capture/EP leaves a pawn on the destination file,
and legal promotion cannot capture a pawn already on its promotion rank. A
nonpawn capture removes only one pawn. Test the complete emitted set has at
most one opening; do not manufacture an illegal multiple-opening positive.

Added root mate/stalemate probes failed four exact error-wording assertions:
the unchanged default parent rejects the attempted king move as Illegal move
before reaching its terminal-position error. Preserve that specific refusal,
with actual color reflection; explicit foundation mate/stalemate routes must
still return unavailable/not-applicable. Clock/dead default roots keep their
terminal-position errors. No new facts may be fabricated in any terminal route.
