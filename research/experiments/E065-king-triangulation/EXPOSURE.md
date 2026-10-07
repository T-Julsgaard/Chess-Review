# E065 development exposure

2026-10-07. PLAN/SOURCES committed4acc299 before code/evaluation. D001 public
data preflight passes; guarded loader before locally authored fixtures.
Before target evaluation, implement reply probes by move/undo on the FULL
history-bearing board, not a fresh FEN clone: repetition can terminate a reply.
Author a live completed triangle whose enemy king reply is the third occurrence;
fresh-FEN clone deliberately misses it, full-history detector/replay must agree.

Initial target fails during fixture import: g7f6 bishop attacks king destination
b2. Queen g7 also attacks the eventual a1 square. Use authored Bf8e7f8 and
Qh6g6h6 return routes. A f7 pawn makes the enemy's h8g8 history step illegal;
use c7 pawn/c8 promotion for that negative. Queenside enemy rook cannot step
onto default a7 pawn; remove it and author own king h1g1g2h1, avoiding the open
a-file. These are legal-fixture corrections, no predicate or priority changes.

Next target126:122 pass, four color/mirror enemy-capture cases fail strict root
validation: own Ng6 attacks nonmoving enemy Kh8. Use own Bg6 as the captured
unit instead. Corrected target126/126 passes. King/rook/knight/bishop/queen
returns, changed turn/counters, check-evasion triangle and mate warning pass.
Rights/EP changed and actual terminal clock/repetition suppress. Full-history
repetition and clock reply flags pass; tampering with terminal flag fails replay.

Branch consolidation is being handled elsewhere in the shared repository.
Continue this existing isolated checkout/branch without creating more branches
or working clones. For clean reproduction, reuse the existing E064 clean clone,
fast-forward it to frozen E065 source and verify a clean initial status. This
changes clone allocation, not inputs or evaluation; keep main/repeat/clean exact.
No export under new branch names or shared-checkout switching in this study.

Cumulative/source checks, freeze and full reproductions pending.

Final target126/126 and cumulative E020–E0653,322/3,322 pass. Maintained source verification/diff pass. Freeze study source/exposure now. At the clean commit boundary, merge the shared main workflow-rule commit before all three full reproductions; study files and frozen prior evidence remain unchanged. Manifests must name that common post-merge revision. Reuse existing clean verification checkout; no new development branch or clone.
