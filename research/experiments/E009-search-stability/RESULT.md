# E009: higher-budget collection running

2026-10-05. Plan/method tests committed before any real-game higher-budget
search or E008 candidate fit. No real-game E009 result yet. The extension is B000.

Synthetic startpos80,000-node pilot passed during concurrent E008 collection:
unrestricted288ms, restricted e2e4 222ms. Selected exact nodes27,615/80,013;
final nodes80,021/80,013. The pilot demonstrates why configured budget and
selected exact nodes must be reported separately. It is no human evidence.

E008 raw evidence was completed/registered/committed in `1dc3283`. The guarded
collector then launched from that revision, validates the baseline and selects45
games by the frozen role/hash rule. Live terminal session91414, collector
PID31660, engine PID15212. Poll that handle; do not restart on observation timeout.
Ignored append-only cache/progress are under `runs/E009/sf19/`; they are
unregistered and cannot be loaded into later assessment. Complete compressed
evidence will be written under this experiment. No stability metrics inspected.

Register/commit the complete observations and run as D002 derivatives before
running `code/evaluate.mjs`. Register results before later loading/replay.
Preserve every drift and failed gate. Numerical replay/independent reconstruction
is still required; no stability or quality improvement has been established.
