# History-root correction, 2026-10-10

After the initial 16-case pilot and independent replay passed, focused checks
passed 46/47. The genuine threefold-root control threw `History-terminal root`
in the inherited target collector: E167's early terminal check reconstructed
only the final FEN and therefore lost repetition history. Preserve the original
wrapper, build/run manifests and failed check log under
`evidence/initial-history-failure/`. Existing raw observations/results are retained;
their source-compatible collector contracts do not change.

Correct the wrapper to replay the already validated actual history before its
terminal check. A true terminal root abstains with `not-live`, as originally
required. No claim, threshold, fixture, budget or acceptance gate is relaxed.
Refresh current build/run bindings, reuse identical raw panels, rerun focused
checks and independent replay. Full cumulative validation remains deferred under
BUILD-FIRST.md. The inspected pilot is authored synthetic development evidence,
not untouched confirmation or real-game usefulness evidence.
