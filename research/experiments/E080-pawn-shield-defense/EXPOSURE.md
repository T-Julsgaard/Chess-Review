# E080 development exposure

2026-10-08. Original PLAN committed at caca074 before implementation/fixture
evaluation. Existing isolated checkout retained. No external position, game,
diagram or model acquired. Every test entry opens the guarded D001 loader
before fixture inputs; reuse source logic only from retained E027/E029/E079.

First authored queen hypothesis: White Kg1/Pf2/Pg2/Ph2, Black Kh8/Qg4/Bf3,
actual g2g3. E029's selected hypothetical prior mating capture is Qxg2#;
g3 lies between g4 and g2 and blocks that capture. Complete after negative
proof covers every legal Black move, including Qxg3+. Black color reflection
also passes. Three initial focused tests passed in 1.6s; no failed root or
gate amendment. This is exposed synthetic development, not confirmation.

Expanded five tests passed in 1.9s. Exact wrapper budget preserves proofs;
one-less and zero budgets drop all new proof/event data atomically. Removing
Bf3 leaves cover geometry without the same mating threat; h2h3 preserves the
unblocked mating route. Both return no-new-fact. Strict boolean/budget errors
and disabled exact-parent behavior pass. Maintained source/diff checks pass.

Only home-g king/queen family positive coverage exists; home-c/e, another slider
family, full independent wrapper replay/tampering, history/terminal/refusal
matrix, cumulative final checks and exact reproductions remain required. No
acceptance, no occurrence advancement, no storage-only optimization or pruning.

Subsequent rook-family hypothesis failed both expected positives (focused
collection 2.8s): White Kg1/Pg2/Ph2, Black Kh8/Rg4/Bf3/Bb5/Nf2, g2g3.
Both return no-new-fact. Retain that exact root/reflection as negatives, with
both before and after complete one-ply winning proofs required; no detector
predicate or gate changed. A different authored rook candidate blocks both
king side escapes with own Nf1/Rh1 and keeps Pf2/Pg2/Ph2: Black Kh8/Rg4/Bf3.
Expanded nine focused tests then pass in 2.8s: corrected rook candidate and
reflection prove the registered effect, while original roots retain before
and after mate proofs. No rule, search ordering or acceptance gate changed.

Home-c/e translation and opposite bishop support ray collection (21 tests)
initially failed six expected queen positives in 3.2s. All exact roots retained
as negatives: c-file Qf1# remains after c2c3, e-file Qh1# remains after e2e3,
and home-g opposite bishop ray's selected initial Qd1# does not have the required
captured-cover-pawn obstruction. Black mirrors likewise retained. Guarded compact
probe independently exposes selected source moves and after win states, never
changes search ordering. Rook candidates on c/e/g and opposite support ray pass
both colors, yielding ten positive cases including the original queen pair.
Thus the registered home files/two slider families have candidate coverage, but
full independent wrapper verification and final gates still remain unmet.
Corrected focused collection passed all 21 tests in 3.8s; maintained source and
diff checks pass. Original PLAN unchanged, no gate weakened or case removed.
