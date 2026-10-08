# E078 development exposures

2026-10-08. First guarded 124-case pilot had two reflected failures in
behind-branched-chain: bishop e1 was already behind all c3/e3/d4 pawns and its
NW ray was blocked at c3, so e1d2 correctly did not create a new behind relation.
Retain that original position as behind-two-blockers-already negative. Use
bishop e3 with c3/d4/c5/e5 branching component for the intended newly-behind
positive e3d2. Both roots remain in fixtures; no newness, legality or chain gate
is weakened and no failure is pruned.

Expanded pilot had two reflected bb-falling failures: d5/g2 bishops already
shared the same falling diagonal, and g2f3 was only a mapped existing-group
advance. Preserve that original root as bb-falling-existing negative. For the
new falling B–B positive use e2f3 with the stationary bishop d5. Do not loosen
identity-mapped equality or count ordinary battery advances as new formations.

Before saved-source freeze, expand positive fixture coverage with reversed-file
chain escape/capture/branch/new-behind roots to exercise both forward blocker
orientations in both colors. Include the previously recorded exposed quiet Q–Q
display probe in the canonical authored fixtures. These additions change neither
registered predicates nor priority/quality/budget/acceptance gates. Retain earlier
counts as development history; final gates use the complete expanded fixture set.
