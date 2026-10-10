# E160 bounded evidence loading

2026-10-10 before rerunning focused checks. Keep original observations/smoke/
failure artifacts and their source bindings unchanged. Add a separate loader
which streams the final compact JSON rows array and parses one complete comparison
at a time. Store lossless per-row gzip cache files only under ignored runs/E160,
bound to original observations hash and individual compressed row hashes. Check
row key/initial proof/cost on admission. No proof branch is removed or recollected.

The original loader remains frozen because collect.mjs's binding closure includes
its key helper. New consumers use bounded-saved-panels.mjs; original collection
source hashes must still match. The new loader/consumer/test/replay source closure
will be added to E160's build and pilot fingerprints. This changes memory usage,
not chess semantics, histories, node budgets, policy gates or original outcomes.
Pilot/replay must also consume rows sequentially rather than rebuilding the same
whole-document memory peak. No broader acceptance or permanence credit follows.

Diagnostic isolation then located an additional trigger: the malformed caller
panel {} reaches assert.deepEqual against the complete expected proof. Formatting
that rejection creates a huge object diff and allocation failure. Replace only
the two full-panel/full-witness assertions by assert.ok(isDeepStrictEqual(...))
with compact messages. The deep strict comparison and acceptance predicate stay
the same. comparison-source-snapshots.json retains both exact original sources/
hashes. The bounded loader accepts only this mechanically reconstructed source
transformation; any other changed dependency still rejects. Build/pilot bind the
current verifier bytes and migration artifact, while collection keeps its exact
original hashes. Replayed observations must pass current semantic verification;
this diagnostic migration never reuses an old success in place of replay.
