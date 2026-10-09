# E106 exposure ledger

2026-10-09 preregistration: no new E106 decisive runs. E105 tracked-only objective
known limitation motivates combined OR goal. Proposed fixtures are hypotheses,
not existing positive observations. Retain failures and later amendments here.

First focused test run:9 passed,2 invalid fixture failures. Initial rook h1
already checked non-moving Kh8; strict legalPosition rejected both mate and
clock fixtures before search. Corrected authored root rook to f1 and prospective
mating move f1h1. No solver gate or semantics weakened.

Three-case development probe: pawn capture e6d7 H2 passed96nodes, rook captures
bishop H4 passed869nodes, knight H4 passed1758nodes. Two pending labels on pawn
transition, one each rook case. Writing command syntax failed before wrapper
creation once; literal source rewrite succeeded, no run output overwritten.

2026-10-09 amendment before retained pilot: alternative may promote at root.
A post-query material baseline would then exclude an already promoted queen
from goal while actual starts as pawn. Use COMMON BEFORE-MOVE FEN nominal balance
for actual and every legal alternative, stored and independently replayed. Generic
helper admits tracked promoted unit when caller proves original pawn identity.
Default helper baseline remains its root FEN. This fixes equal-goal comparison;
no formerly observed outcome rewritten. Root premature mate/draw handled by OR.
