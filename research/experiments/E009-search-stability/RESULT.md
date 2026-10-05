# E009: overall stability screen fails; verification next

2026-10-05. State: running, verification/clean replay next. Plan/method tests
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

Raw evidence was registered/committed in `106bc50` before `code/evaluate.mjs`.
The results and receipt are now registered; commit before `code/verify.mjs` and
an external `research/clean-replay.mjs E009 <archive-commit-SHA>` run. Preserve
every drift and failed gate. Numerical replay/independent reconstruction is
still pending. No adequate overall stability or quality improvement is established.
