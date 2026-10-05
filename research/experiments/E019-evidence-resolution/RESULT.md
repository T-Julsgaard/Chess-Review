# E019: evidence resolution — working record

State: complete. Exploratory evidence-resolution/target audit; all integrity checks pass.
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

Diagnostic commit 8492aea. Exact calculations and separate two-pass variance,
tail ordering/counts, four grid points and previous report means verify for all
600 cases. External archive 8492aeaf39a6c8946c3905ea895fda23aa2734b8,
SHA 387b38da32ead2d32b112dd8b48f438ab4384a7e580ea5b76f6f50fbf8d0a016,
passes without Git metadata, ignored inputs, dependencies, network or searches.
Shared newline equivalence uses source representations recorded before the
diagnostics; own code bytes match. [Results](evidence/results.json),
[run](evidence/run.json), [verification](evidence/verification.json),
[clean replay](evidence/clean-replay.json) and [archive recipe](evidence/clean-archive.json)
retain the calculations and lineage.

Target audit: legal-choice likelihood can shortlist a behavior model but does
not validate an accuracy percentage or strength. The current display needs
independent usefulness/quality evidence and aggregation/length/opportunity
checks. Moves-only rating needs target-free, player-disjoint rating prediction;
contextual adjustment needs independent repeated/future performance targets
and a recorded-rating comparator. Perceived brilliance/usefulness needs the
pending human labels; engine properties alone do not resolve it. The existing
[measurement contract](../../MEASUREMENT.md) remains authoritative.

[F017](../../findings/F017-evidence-resolution-and-targets.md) retains the audit.
Next: preregister an opportunity-aware moves-only rating evidence/feasibility
study. Test acquisition and complete-alternative cost before expensive collection,
with traceable new public data and enough nonforced moves per game. Its proposed
inputs must exclude recorded/opponent ratings, IDs and results; compare against
the refitted baseline and train-only median. Define player-disjoint roles and
rating pool, require a precise enough development design, and reserve separate
untouched confirmation evidence. Do not fit a new model or collect games until
that protocol and eligibility/lineage are registered. This is a distinct question
about game-level strength signal, not a repeat of E018 or another utility sweep.
No improved rating, displayed accuracy or category validity follows from E019.

Retained evidence: 82,931 bytes, below the 200 KiB plan cap. Goal pause checkpoint: user-authorized usage monitor requested stop; E019 is complete. Do not start the next study until the user resumes.
