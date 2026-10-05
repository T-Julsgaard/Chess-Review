# E019: evidence resolution — working record

State: running. Exploratory diagnostics complete; clean replay pending.
Plan 326ef9c; code freeze 3990c48 precedes the single diagnostic execution.
Seven synthetic/source checks pass. No new fit, candidate trial, engine search,
human label or consumed test target. E018's failed acceptance is unchanged.

| Existing paired choice losses | Cross-fit | Development |
| --- | ---: | ---: |
| Games | 450 | 150 |
| Mean comparator-minus-mixture NLL | .171879 | .052790 |
| Sample SD | .918791 | .400591 |
| Positive / negative / zero differences | 292 / 157 / 1 | 97 / 52 / 1 |
| Largest 1 / 5 / 10 centered-square fraction | .247972 / .722094 / .808421 | .069232 / .253482 / .386560 |
| Largest absolute difference | 9.866733 | 1.233824 |

A few cross-fit cases account for much of the empirical squared variation.
All cases stay included. These descriptive tails neither invalidate the saved
proper log-loss comparison nor identify which model mechanism causes it.

The hypothetical independent frozen-model normal reference gives half-width
.073312 at the current 150 development games. Holding its sample SD fixed,
half-width .01/.02/.05/.10 corresponds to 8,062/2,016/323/81 games. This is
precision planning, not observed power, guaranteed coverage, a new significance
test or a reason to extend E018's exposed panel. Repeated players, population
shift, tails, fitting and subgroup requirements can change a future design.
[NIST](https://www.itl.nist.gov/div898/handbook/eda/section3/eda352.htm)
explains SD/sqrt(N) interval scaling using Student t; this normal reference
does not replace E018's paired bootstrap.

Next: register/commit diagnostics and verify exact/independent external replay.
Then record target-specific evidence requirements and a distinct next question.
No improved rating, displayed accuracy or category validity is inferred.
