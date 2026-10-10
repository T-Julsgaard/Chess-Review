# Authored fixture legality correction before evaluation

2026-10-10. During implementation review, before any E173 query, noticed that the
registered Ba2–a3 alternative is illegal for a bishop. Preserve the original
plan. Replace only the first-move clearing unit with White Qa2: Qb3 clears the
original Ra1 file, Qa3 retains the blocker, and Qc4 supplies the equally clearing
alternative. Root kings and tracked rook, seventh-rank objective, bounds and
all claim/proof gates remain unchanged. Direct-entry root omits the queen;
capture negative adds Black Ra8. These remain unqueried hypotheses at amendment.
Use a separate original-rook capture/second-rook control to test identity rather
than allowing a replacement rook to discharge the declared objective.

Initial smoke: route-clearance and equally-clearing hypotheses passed (51/39
logical nodes). Direct-entry case rejected before query: alternative Ra1–b1
lands on own Kb1. Retain original fixture/runner and exact error summary in
evidence/initial-direct-alternative-failure/. Before further evaluation, use
legal quiet Ra1–a3 instead; direct actual Ra7 and objective-alone gate unchanged.
The initial runner saved only after all cases, so no raw survived its exception.
Checkpoint each completed case before assertions/next case; recollection of the
two tiny completed queries is necessary because no hash-matched raw exists.
This is a runner/fixture failure, not a weakened gate or changed objective.
