# E147 historical receipt compatibility

2026-10-10 after first two-root smoke, before further collection. Initial cache
assembler refused E138 reuse because an overstrict full receipt equality check
included the historical DATA_POLICY.md fingerprint. Preserve that refusal in
evidence/receipt-refusal.json. All other receipt fields match; E140's additive
tablebase-only policy text changed that document hash while explicitly preserving
game registry/validator/origins and historical receipt meanings.

Do not rewrite old receipts. Verify their policy bytes from the exact retained
E138 revision (record whether Git's LF or checkout CRLF form matches), retain
those fingerprints and require the current policy to equal that text plus ONLY
the documented tablebase addendum. Every other receipt field must exactly match
the current successful eligibility guard. This validates unchanged game policy
semantics, not an override or admission of new data. Source/output/engine/history
hash and semantic checks remain mandatory. Claim thresholds and outcomes unchanged.

Implementation repairs, before final retention: the first compatibility repair
omitted the addendum's final two lines and correctly refused again; matching the
entire literal block then passed. Initial pilot retention also refused missing
vendor/borrowed-dependency inputs in build.json. Static import discovery omitted
the dynamically launched engine-host.cjs. Preserve raw observations unchanged;
source-audit.json verifies that host against committed bytes at the collection
revision and current bytes, explicitly a supplementary audit, not a claimed
contemporaneous snapshot. Add all raw/borrowed dependencies and vendor bytes to
the complete build closure. Saved admission/replay require the supplementary
audit and its output hash. No engine/tactical recollection or changed chess gate.
