# Prospective source-inspection clarification

2026-10-08, before E077 implementation or candidate evaluation. E076 snapshot
is private, so reuse E021 exported pawnFeatures/structuralEvents directly with
the identical full legal EP exclusion; retain full E076-compatible scalar maps
and classification evidence without enabling any older output profile. Do not
edit frozen E076 source or create another passer classifier.

E021's newPair maps the moved pawn back to its origin and suppresses an already
connected pair's advance. The preregistered claim also permits an actual advance.
Keep two explicit eligibility branches: the reused newly connected transition,
or an actual nonpromoting pawn move whose before/after connected pair matches
under that mapping. Record which branch applies; independent replay computes
both without importing detector helpers. An unchanged pair on another piece's
move does not qualify. This preserves the registered advance claim and the exact
source predicate rather than quietly changing either.

Counters use reproducible work units: reconstruction root 1 plus each history
ply, complete root legal query 1, each frame 1 and its EP query 1 if canonical
EP exists, each saved horizontal alternative record 1, each new event 1. Shared
library internal loops are not additional query work units. Atomic budgets,
live-state gates and all original acceptance requirements remain unchanged.
