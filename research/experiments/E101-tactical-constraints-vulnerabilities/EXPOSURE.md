# E101 exposure

2026-10-09: original catalog and current accepted scopes inspected; E026 proves
queen-relative pins only, E022 king-first skewers only. New policies add actual
nonking target and four-ply material scopes rather than relabel old certificates.
Authored synthetic mechanics only; no game contents or new acquisition.

First authored pilot: nonqueen pin,nonking skewer,functional x-ray,underprotection,
four-ply hanging,loose capture and opening pitfall positive. Fix capture-square
helper to support saved plain move records (flags), not require Chess method.
Underprotection example was already capturable at old Qa2; retain it as absence
of new vulnerability, not mislabel Queen relocation as a new loss. Quiet fork
policy failed and its exact reply/counterexample will be inspected; gate unchanged.

Quiet fork failed exact Qh4-f6,Nxe5,Qf6-f1 mate line. Preserve unsheltered
king negative; add own sheltered king/f1 bishop/f2,g2,h2 pawns and legal Ng5-f3
positive. No quiet-policy gate change. Source review maps pre-move capture victim
to its actual old type, avoiding a fabricated new threat after promotion.

35 active focused checks plus affected E100/E026/E022/E091/E035 passed in
20.6sec. Root queen-capture offset and promotion-old-pawn-threat negatives pass.
Refine self-pin comment to place blocker on king line and explicitly admit
existing capture may already be available; rerun active comment/fixture checks.

35 focused checks passed after self-pin wording,guarded30case pilot passed.
Saved replay found balanced opening baseline -0 from unary negation; JSON writes
0. Normalize baseline with 0-rootBalance in E101 boundary and independent checker
without changing accepted E091 helper. Add exact JSON regression for full balanced
opening witness. Original pilot remains ignored runs/E101/pilot; corrected output
uses runs/E101/normalized-zero. Gate unchanged; source hashes rebound.
