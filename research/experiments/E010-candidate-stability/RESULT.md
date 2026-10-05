# E010: registered, no candidate sensitivity assessed yet

2026-10-05. Operational development protocol after E008/F006 and E009's failed
overall stability screen. No new searches or fits planned. Reserved300 games
remain excluded. The extension remains B000.

Assessment/model-binding/vector checks committed in `0a732ab` before metrics;
four authored synthetic tests and maintained-source checks pass. The exact E008
CP candidate and fixed comparator were extracted without fits or searches.
Model-object hash `22c02c4d19548d657e0937a6b8cc79ef664a657ce60cf4810160a28877bf4df4`.

Next: commit the registered freeze, then run `code/evaluate.mjs` once on the45
cached games. The loader rechecks every game/query/score/legal PV binding and
the frozen source-model identity. Register/commit results before verification
and external clean replay. Do not cherry-pick stable cases or weaken E009 gates.
