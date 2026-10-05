# E010: verified probability-vector stability failure

2026-10-05. State: complete. Outcome: no-improvement; evidence: development. Operational
development protocol after E008/F006 and E009's failed overall stability screen.
No new searches or fits. Reserved300 games
remain excluded. The extension remains B000.

Assessment/model-binding/vector checks committed in `0a732ab` before metrics;
four authored synthetic tests and maintained-source checks pass. The exact E008
CP candidate and fixed comparator were extracted without fits or searches.
Model-object hash `22c02c4d19548d657e0937a6b8cc79ef664a657ce60cf4810160a28877bf4df4`.

Registered model freeze committed in `6c8a644` before the single assessment.
All game/query/score/legal-PV and source-model bindings pass. The registered
operational screen **fails**: mean total variation0.083789 comparator versus
0.091144 candidate; gain-0.007355,95% paired game interval[-0.018010,0.001063].
The required5% reduction and positive lower bound fail. This interval does not
establish that the candidate is universally less stable; it does not show a gain.

Candidate TV<=0.10 in25/45 games (55.56%,95% Wilson lower41.18%), below the
90%/80% gates. Comparator28/45 (62.22%, lower47.63%). Root expected-point drift
is<=0.05 in45/45 for both (lower92.13%), passing that gate. Mean root drift is
0.007422 candidate /0.008831 comparator. Root-point stability does not establish
choice-vector stability. Mean played-choice loss drift0.206512 /0.185984 nats;
candidate maximum1.388344. No refitting, case removal or revised tolerance.

Registered results committed in `e870dd8` before verification. The
[verifier](evidence/verification.json) and external archive
[clean replay](evidence/clean-replay.json) reproduce the exact report, and
independent equations reconstruct180 probability vectors,45 paired games,
10,000 bootstrap resamples, Wilson bounds and all headline gates. No new searches,
fits or network requests. [Archive command/hash](evidence/clean-archive.json)
are retained; the full revision was obtained programmatically from Git.

Reproduce `code/verify.mjs --out research/runs/E010/replay`; a clean archive runs
`research/clean-replay.mjs E010 <verified-archive-commit-SHA>`. See
[F008](../../findings/F008-candidate-probability-stability.md). Numerical integrity
does not supply fresh confirmation. No choice/display/category stability or
adoption is established. The scalar outcome curve and fitted choice model
require separate future decisions; do not retune the rejected stability recipe.
