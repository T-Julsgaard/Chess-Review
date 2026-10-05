# E003: retrospective SF19 accuracy-study replay

Registered 2026-10-05 after E001 inspected original reports. This is a numerical
reproducibility audit, not a fresh independent test or a new candidate search.
Tracks: accuracy outcome/choice models. Baseline B000. Original studies were
collected 2026-10-04 in ignored `calibration-runs/sf19-quality` and
`calibration-runs/sf19-choice-confirmation` and have failed reported gates.

## Question and gate

Can current maintained fitting/math modules independently reconstruct the
original candidate models, bootstrap metrics and failed acceptance decisions
from hash-verified engine observations? Exact JSON equality is the primary gate;
any discrepancy must be diagnosed and retained. All prior report inspection and
test consumption remain disclosed. There is no inferential sample-size/power
claim or new practical-improvement threshold in this retrospective audit.

## Frozen evidence and method

Retain the two original compressed evidence files in this experiment, verifying
compressed hashes against E001 archive metadata before decoding. The files total
about 1 MB. They contain 150 games per study (100 train,25 development,25 test),
125 selected choices per study (80,20,25), 20,000-node SF19/Hash32 observations,
and original protocols/selection hashes. Preserve original engine configuration
and identity exactly. No collection, additional test or tuning is allowed here.

Reconstruct legal alternatives and history bindings using the maintained chess
library. Check raw exact PVs, restricted-move identity and cold-search configuration.
Fit the full-curve outcome/choice model on original training only; separately fit
the choice-only model with its original fixed public outcome curve. Recompute
game-weighted outcome log loss/Brier, legal-choice log loss, uniform comparator,
and normalized old-display-quality choice weights. That comparator is an explicit
constructed policy, not a probability model the extension historically claimed.

Preserve original 2,000 game-bootstrap resamples/seed18019 and acceptance rules:
full-curve needs outcome log loss/Brier improvement with negative upper log-loss
difference bound, and improved choice likelihood with negative upper bound;
choice-only leaves outcome mapping unchanged and requires the choice gate.
These retrospective intervals are not new confirmation evidence. Check both
development and original consumed test roles without changing any model afterward.

Source provenance: reuse fitting/evaluation mechanics inspected in local
`scratch/accuracy-verification/tools/calibration/sf19-quality.mjs`, retain its
hash, and move only replay logic into research. Collection code is unnecessary.
Original model/report snapshots are retained in E001 and opened for exact-output
comparison after refitting, not used to supply fitted coefficients.

## Reproduction and result

```sh
node research/experiments/E003-sf19-archive-replay/code/replay.mjs
```

Node.js24; no network, engines or dependencies. Budget five minutes / under 2 MB
retained evidence. Smoke: verify/decode archive hashes/schema/config before
fitting. Run twice for byte equality, and once in an isolated copy with no
`calibration-runs/` or `scratch/` inputs. Record source revision, source hash,
input/output hashes, environment and exact reproduction command.

Report numerical replay separately from original hypothesis success. Document
negative/inconclusive conclusions and any inaccurate legacy metadata; do not
repair old models or reinterpret a failed gate as a success. No promotion.

Amendments: none at registration.
