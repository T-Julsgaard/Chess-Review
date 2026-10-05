# E009: verified overall stability failure; limited CP loss stability

2026-10-05. State: complete. Outcome: no-improvement; evidence: development.
Plan/method tests
committed before any real-game higher-budget search or E008 candidate fit.
The extension is B000. This is operational development evidence, not human truth.

## Frozen assessment

45 score-blind focal choices, same history/build/options at20k/80k configured
nodes, every legal alternative. Overall screen **fails**. CP loss tolerance and
mean displayed-quality drift pass; WDL tolerance and best-alternative overlap fail.

| Measure | Observed | Registered gate |
| --- | --- | --- |
| CP loss absolute drift<=0.05 |43/45 (95.56%),95% lower85.17% |>=90%, lower>=80%: pass |
| WDL loss absolute drift<=0.05 |39/45 (86.67%),lower73.82% |>=90%, lower>=80%: fail |
| Restricted best-set overlap |34/45 (75.56%),lower61.33% |>=90%, lower>=80%: fail |
| Mean absolute current displayed move-quality drift |2.881975 percentage points |<=5: pass |

Mean absolute CP loss drift0.009781, maximum0.061297; WDL0.016111,
maximum0.131. Displayed-quality drift maximum17.557718 points,90th percentile
8.216699.27 identical best sets;9 unrestricted bestmove changes; no mate-sign/
presence transitions. Sets use the frozen0.001 expected-point tie tolerance;
rank instability need not mean a large probability change. Do not weaken the
registered gate after seeing this result. This does not assess E008's fitted
candidate probabilities or validate human categories.

Synthetic startpos80,000-node pilot passed during concurrent E008 collection:
unrestricted288ms, restricted e2e4 222ms. Selected exact nodes27,615/80,013;
final nodes80,021/80,013. The pilot demonstrates why configured budget and
selected exact nodes must be reported separately. It is no human evidence.

E008 raw evidence was completed/registered/committed in `1dc3283`. The guarded
collector ran from that revision, validated the baseline and selected45 games
by the frozen role/hash rule. Terminal91414 exited0:1,600 unique searches,
1,603 requests,404 seconds,376,368 compressed bytes. Complete observations and
collection receipt are registered D002 derivatives; guarded provenance passes.
Ignored cache/progress under `runs/E009/sf19/` remain unregistered and cannot be
loaded into later assessment. Do not rerun collection.

The80k observations retain418 earlier exact iterations and3 exact recoveries;
selected/final nodes range490–80,181. A configured budget is not a guaranteed
minimum for the selected score. No score-based dropping or build substitution.

Raw evidence was registered/committed in `106bc50` before `code/evaluate.mjs`;
results were registered/committed in `0b233a4` before verification. The
[verifier](evidence/verification.json) exactly reproduces the report and
independently reconstructs90 paired decision values, sets, drift/tolerance
counts and Wilson bounds. The external archive
[clean replay](evidence/clean-replay.json) also passes, with zero new searches,
network, ignored inputs or installed dependencies. Retained
[archive recipe/hash](evidence/clean-archive.json) records an initial incorrect
caller-supplied full revision as invalid provenance metadata; the complete
replay was repeated with verified `0b233a4d85231e3e583f8d6c841c42a4fc3dbf7d`.
The invalid attempt was never used to support this result.

Reproduce `code/verify.mjs` with optional `--out research/runs/E009/replay`.
For a clean replay, extract the retained archive recipe externally, obtain its
full revision with `git rev-parse`, and run `research/clean-replay.mjs E009
<verified-archive-commit-SHA>` from the snapshot root. Scientific confirmation
is separate from numerical integrity. See [F007](../../findings/F007-search-stability.md).

No adequate overall stability or human quality improvement is established.
E010 separately tests frozen CP-model probability-vector stability using these
same observations; it cannot erase this failed rank/WDL result. No extension edit.
