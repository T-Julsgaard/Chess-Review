# E070: verified pawn-supported knight outposts

Completed 2026-10-07. Research-only opt-in `outpostTags`, default false.
Example: “Outpost: Nf5 has pawn support; no current enemy pawn can reach a square
attacking f5 before promoting.” Knight destination relative rank 4–6; advanced
label additionally rank six. Outpost C0268/Outposts C0558 and Advanced outpost
C0269 are verified for this explicit pawn-supported knight subset.

Support requires a legal pawn capture in a fresh, legal live counterframe:
replace only the moved own knight by an enemy knight, own turn, EP cleared,
retain other placement/rights/counters. All supporting pawn captures retained.
This excludes absolute pawn pins; no actual recapture after every future
exchange is promised. Every current enemy pawn has a complete finite forward
route DAG allowing straight steps, both capture-file shifts and starting-rank
double steps, ignoring occupancy/check/capture victims. No reachable pre-promotion
node may attack the fixed outpost square. This conservative superset rejects
blocked but potentially challenging pawns too. Promoted units and other pieces
may challenge the knight, and support may be removed; no permanent safety,
general positional strength or best-move claim. No-enemy-pawn case explicit.

156 focused and 4,044 cumulative coach tests passed (full final suite 91.0s);
maintained source verification and diff checks passed. Independent saved replay
verified 76 outpost and 24 advanced certificates on 76 positives, 68 legal
negatives and four illegal moves; 32 complete pawn-challenge refutations replayed.
Independent rank/file-distance enumeration matches detector BFS DAGs exactly.
2,244 positive-proof pawn nodes, 4,436 edges and 112 legal support captures
retained. 612 full-history legal replies, 24 history plies, 12 knight captures,
16 promotions and 12 terminal replies retained across separate certificates.

Both colors/reflections, ranks 4/5/6, captures/check evasion, multiple supporters,
relative/absolute pins, promotion scope, loss of knight/support, clock terminals
and full-history threefold repetition covered. Explicit legal a7xb6, quiet king
move, b6xc5 sequence attacks d4: absence of an immediate pawn attack is insufficient.
Actual knight mate suppressed for the existing terminal explanation. Failed
authored coordinates and scope corrections remain documented in EXPOSURE.

Frozen source `2d561fcbcb192dced4ebc64395f39a0fc74fa093`. Main/repeat/reused
initially clean detached runs all exited 0, with exact source/input/physical
output/metrics equality in 247.4/246.3/247.5 seconds. All 3,604 inherited ordered
full-result fingerprints and original concept-list hash unchanged. Full corpus
3,752 cases: 3,526 facts, 152 abstentions and 74 invalids; maximum selected
comment 21 words. 6,407 certificates, 288 query proofs, 23,435 legal reply edges
and 47,048 continuation leaves retained/replayed. Full evidence 4,856,214 bytes
within the prospective 20MB gate.

[Proofs](evidence/results.json), [tracker](evidence/concept-status.md),
[demo](evidence/demo.html) and main/repeat/clean hash manifests retained.
Tracker: 300 verified names, 349 occurrences, 76 partial and 660 unimplemented
occurrences. Exposed synthetic mechanics do not establish real-game precision
or teaching value. Extension unchanged; local integration under clean/ancestry
rules only, no push. Broader goal remains active; numerical research paused.

Next: E071 investigate octopus-knight comments on deep central outposts, requiring
finite full-history tactical evidence for important targets rather than inferring
general knight strength from placement alone. Cutoff/shutdown remains cancelled.
