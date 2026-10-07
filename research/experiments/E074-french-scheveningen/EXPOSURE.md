# E074 exposed synthetic development

2026-10-08. D001 test guard passed. All authored fixtures are exposed mechanics,
not real-game precision or teaching confirmation. First import pilot failed:
core-loss bishop on c4 blocked the authored c2-c4 push. Relocated to c5, preserving
an actual legal bishop capture of the completed e3 pawn. Second pilot failed six
color/reflected expectations: capture completion mistakenly used e2-e3 instead
of f2xe3, and the opposite exchange's recapturing knight remained on required
empty control target c4. Corrected final capture move and legally relocated that
knight to b6 before completion, with d3 pawn already in authored root.
No detector legality gate, target requirement or budget loosened.

Corrected184-case pilot passed:28 French-type chain and18 Scheveningen certificates,
both French roles and colors, fixed-file horizontal negatives, true en-passant
exchange and actual en-passant loss, pinned checking ingress, core capture moves,
extra countercaptures and terminal promotions. Focused/full/source/diff and exact
frozen main/repeat/clean gates pending. Keep prospective20MB budget and full proofs.

First focused suite failed a selected-comment expectation: recapturing enemy
knight on d5 attacks newly completed e3 pawn, and the authored sparse center had
no support for that pawn. Parent hanging-pawn warning correctly outranked the
structure. Retain that original behavior as hanging-center-warning fixture;
add authored f2 pawn to the normal selected-structure example, protecting e3.
No priority or proof gate changed; warning case still requires valid structure
annotation alongside the higher-priority warning.

Corrected focused195 tests passed7.7s and full cumulative4,741 tests passed118.3s.
Maintained source and diff checks passed. Added hanging-center-warning case
makes188 new color/reflected cases; all legality, target, priority and budget
requirements unchanged. Decisive frozen reproductions pending.
