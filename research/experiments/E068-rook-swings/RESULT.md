# E068: verified checking rook swing

Completed 2026-10-07. Research-only opt-in `rookSwingTags`, default false.
Example: “Rook swing: Rh3+ moves sideways after Rf3, bringing the lifted rook
onto the king's file with check.” Full legal history must show the same rook
lifting from home ranks to rank three/four immediately before this own move,
then moving sideways at least two files into a direct king-file check.
This certifies a checking subset of C0350; no winning attack or rook safety claim.

112 focused and 3,691 cumulative coach tests passed (full suite 95.9s), source
verification and diff checks passed. Independent saved-proof replay verified
44 positive certificates, 60 legal negatives and four illegal cases: 128 complete
legal responses, 88 recorded history plies, 12 rook-capture responses and 20
terminal responses. Both colors/reflections, captures, rank-four/home-rank-two
lifts, a swing blocking a check and discovered-only-check rejection are covered.
Newly hanging rook warning outranks the descriptive label. All evidence and
failed authored-pilot assertions remain documented in EXPOSURE.

Frozen source `da60cbd3e5178f989c6d67683b4b281b49665457`. Main/repeat/reused
initially clean detached runs all exited 0 and matched revision, input hashes,
physical output hashes and metrics exactly, taking 259.2/256.1/258.3 seconds.
All 3,304 inherited ordered full-result fingerprints and original list hash
unchanged. Complete corpus: 3,412 cases, 3,206 facts, 144 abstentions and 62
invalids; maximum selected comment 21 words. 6,099 certificates, 288 query proofs,
22,311 legal reply edges and 47,016 continuation leaves retained/replayed.

[Proofs](evidence/results.json), [tracker](evidence/concept-status.md),
[demo](evidence/demo.html) and main/repeat/clean run manifests are retained.
Evidence 3,675,547 bytes within the prospective 12MB gate. Tracker: 294 verified
names, 342 verified occurrences, 76 partial and 667 unimplemented occurrences.
Exposed synthetic checks establish mechanics, not real-game precision or teaching
usefulness; extension unchanged. Local integration follows clean ancestry rules.

Next: E069 checking rook penetration/invasion into the enemy back two ranks,
with explicit before/after identity and complete legal responses. Broader goal
remains active; numerical research remains paused and cutoff/shutdown cancelled.
