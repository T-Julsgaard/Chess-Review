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

## Lossless canonical proof sharing before decisive evaluation

Expanded plaintext pilot at 2f2062e contains all 138 new cases/22 witnesses and
5,052 inherited fingerprints, but results.json alone is 26,521,412 bytes above
the unchanged canonical 20MB cap. Keep that development output. Do not prune
cases, proofs, branches, histories or alter engine/search parameters or gates.

Prospectively register sha256-json-king-support-dag-v2 for storage only: intern
every object/array within the existing support event's beforeProof/afterProof
by SHA-256 of its exact serialized node with complete child references. Primitive
values stay exact; deterministic sorted pool and explicit version retained.
Independent decoder verifies each digest, complete references/reachability, no
cycles or unexpected reference fields, and reconstructs the original full tree.
Runner requires byte-identical JSON roundtrip before saving. Classifier API and
all logical metrics/full-result fingerprints stay unchanged; no FEN-only cache
or solver memoization. Frozen independent proof replay still traverses every
reconstructed branch separately in its actual history. Physical output hashes
and exact main/repeat/clean gates apply to the new storage layout.

Guarded full expanded-report feasibility: 26,521,411 JSON bytes reconstruct
exactly from 6,111,691 packed bytes/10,550 unique nodes. Coarse whole-proof
sharing v1 was insufficient for the expanded budget; its prototype retained
locally. Final full tests, codec corruption/semantic-replay gates and exact
reproductions remain required. Only storage changed, no acceptance weakened.

Expanded genuine-context run actually took 837.531s, exceeding the earlier
400–650s estimate. Prospectively expect roughly 900–1,100s per cold cumulative
run with proof storage on this host; record actual values. This remains a cost
estimate, never a cutoff or an acceptance threshold.
