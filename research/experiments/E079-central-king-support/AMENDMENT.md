# E079 prospective runtime and strict-input clarification

2026-10-08, before final source freeze or decisive reproduction. Original PLAN
unchanged. Added complete terminal/refusal/history/attack gates and retained every
failed fixture as recorded in EXPOSURE.md. No detector acceptance gate weakened.

The new wrapper defaults only undefined boolean/budget options; explicit null
is malformed, consistently with the registered strict boolean/integer contract.
Older inherited flag semantics remain unchanged. Literal invalid-history
reflection preserves both starting and final input FEN instead of silently
replacing an intended mismatch. Retained failed fullmove-counter variants have
separate exact error expectations. Every failed authored root remains represented.

Initial runtime estimate 280–360 seconds/run did not include the full added
support-search work. Expanded focused run took 229.9s and concurrently running
full cumulative suite 394.8s before fixture corrections. Prospectively allow
roughly 400–650 seconds per cumulative saved run on this host; report actual
elapsed values. Compute estimate is not a success gate or a cutoff. Canonical
20MB proof budget and all exact main/repeat/clean, full tests, independent replay,
5,052 ordered inherited fingerprints and original-list requirements unchanged.
