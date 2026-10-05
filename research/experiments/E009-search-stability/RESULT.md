# E009: registered, awaiting complete E008 observations

2026-10-05. Plan/method tests committed before any real-game higher-budget
search or E008 candidate fit. No real-game E009 result yet. The extension is B000.

Synthetic startpos80,000-node pilot passed during concurrent E008 collection:
unrestricted288ms, restricted e2e4 222ms. Selected exact nodes27,615/80,013;
final nodes80,021/80,013. The pilot demonstrates why configured budget and
selected exact nodes must be reported separately. It is no human evidence.

Next: after E008 raw evidence is complete, registered and committed, launch
`node research/experiments/E009-search-stability/code/collect.mjs`. This guarded
collector validates the baseline and selects45 games by the frozen role/hash
rule. It writes ignored append-only cache/progress under `runs/E009/sf19/` and
complete compressed evidence under this experiment. Do not restart an existing
unregistered partial run; retain its specific live handle when launching.

Register/commit the complete observations and run as D002 derivatives before
running `code/evaluate.mjs`. Register results before later loading/replay.
Preserve every drift and failed gate. Numerical replay/independent reconstruction
is still required; no stability or quality improvement has been established.
