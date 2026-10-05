# F007: limited CP loss stability; WDL and best-alternative gates fail

2026-10-05. Outcome: no-improvement in the declared overall stability screen.
Evidence: operational development. Source:
[E009](../experiments/E009-search-stability/RESULT.md). No promotion.

45 score-blind focal choices (30 train /15 development) compare the same bundled
SF19 Lite build/options/full history at20,000 and80,000 configured nodes. Every
legal alternative is retained. Higher-budget output is a reference, not truth.

Fixed-CP expected-point loss drift stays within0.05 for43/45 choices (95.56%,
95% Wilson lower85.17%); this passes the registered90%/80% gate. Mean absolute
drift is0.009781 expected points. Mean current displayed move-quality drift is
2.881975 percentage points, below the5-point gate. Maximum is17.557718 and
90th percentile8.216699; the mean does not establish safety for every move.

WDL loss tolerance passes for39/45 (86.67%, lower73.82%), failing both cutoffs.
Restricted best-alternative sets overlap in34/45 (75.56%, lower61.33%), also
failing. Sets use a prespecified0.001 fixed-CP point tolerance.27 sets match
exactly;9 unrestricted bestmoves change. No mate-sign/presence transitions.
Fine-grained rank change is different from a large probability change; no
post-result threshold adjustment converts the failed overall screen into a pass.

Raw evidence and results were registered/committed before assessment/verification.
Exact replay, independent equations for90 paired decisions/headline bounds and
an external Git archive replay pass with no new searches or network. An incorrect
full revision in the first clean command was recorded as invalid metadata and
the replay repeated with the verified archive revision. See E009's linked
receipts, hashes, commands and failure log. Numerical integrity does not establish
human accuracy or scientific confirmation.

This small convenience-cohort operational result uses existing published SF19
move-quality rules, not E008's fitted softmax model. Many diagnostic groups are
sparse. Earlier exact iterations/exact recoveries and early search termination
are preserved; configured budget does not guarantee selected-score node count.
No SF18, rating, displayed game aggregation, category-validity, aesthetic or
instructional claim follows. B000 remains the extension's method.

E010 is a distinct registered follow-up on the **full probability distributions**
of the frozen useful CP candidate, reusing these cached observations. It does
not supersede this negative finding. Exact-best special labels need their own
search-confidence and human evidence; simply increasing budget does not prove
they are reliable. Keep both positive CP diagnostics and the overall failure.
