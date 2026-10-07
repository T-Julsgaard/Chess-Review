# E071: verified tactical octopus knights and sound terminal fallback

Completed 2026-10-07. Research-only opt-in `octopusTags`, default false; explicit
`outpostTags: true` prerequisite. C0330 verified for a stated strong tactical
subset: central d/e-file knight on relative sixth rank, certified advanced outpost,
eight controlled squares, direct king check and original queen target. Example:
“Octopus knight: Nd6+ controls eight squares with pawn support; every legal defense
permits a queen capture with immediate material gain.” No general knight strength,
permanent safety, best-play or longer-term win claim.

Complete full-history AND/OR trees retain every enemy defense, all same-knight
original-queen capture candidates and every immediate counterreply. At least one
candidate per defense must retain positive fixed-value material gain through all
counterresponses, without draw or countermate; terminal defense/capture draw
refutes. Capture into own mate is allowed. Material baseline is actual after,
not an earlier captured piece's gain. Outpost support/pawn DAG proof is replayed
independently as a prerequisite. Returned material values cannot mutate later calls.

118 focused and 4,162 cumulative coach tests passed (corrected full suite 111.5s),
maintained source verification and diff checks passed. Saved independent replay:
40 positive certificates, 64 legal negatives, four illegal moves; 160 defenses,
176 capture candidates and 2,112 immediate counterresponses, including 64
promotions and four positive history plies. Twenty full refutations retained
and independently replayed, with 92 defenses and 636 counters. Both colors/
reflections, d6/e6, multiple queens/supporters, counterrecaptures, promotions,
countermate, queen capture yielding insufficient material, rule-terminal defenses,
full-history repetition and corrupted proof/legal-set/gain rejection covered.

Initial source `53425ae` passed three matching runs and new-proof replay, but
selected fallback audit failed: it correctly refused the octopus tag yet retained
an inherited royal-fork promise after a repetition-terminal defense. All initial
proofs, demo, tracker, main/repeat/clean manifests and failed audit remain in
[initial-evidence](initial-evidence/audit.json). [AMENDMENT](AMENDMENT.md) registered
the stricter correction before implementation/evaluation; no eligibility or
material/terminal gate relaxed. Default-disabled frozen E070 unchanged.

Enabled profile now separately replays every actual legal historical defense;
if any ends the game, inherited all-defense capture promises are suppressed.
The guard also applies at zero queen-search/outpost budgets. Saved guard replay
checks 32 full-history reply records, 68 nodes and four suppressed false fork
claims; selected comments no longer promise a capture after the terminal reply.
This is the enabled E071 profile correction, not a retrofit of frozen baselines
or extension behavior. Other inherited precision limitations remain unassessed.

Final frozen source `c687a1ca949b0acf511be284c3f82535c1efbcc7`. Three entirely
new main/repeat-final/reused initially clean detached clean-final runs exited 0
and matched source/input/physical output/metrics exactly in 290.2/289.6/290.7s.
ALL 3,752 inherited ordered full-result fingerprints and original list hash
unchanged. Full corpus: 3,860 cases, 3,630 facts, 152 abstentions, 78 invalids;
maximum selected comment 21 words. 6,739 certificates, 288 query proofs,
24,839 legal reply edges and 52,292 continuation leaves retained/replayed.
Combined initial and final evidence 12,767,929 bytes within unchanged 20MB gate.

[Final proofs](evidence/results.json), [tracker](evidence/concept-status.md),
[demo](evidence/demo.html) and all run manifests retained. Tracker: 301 verified
names, 350 occurrences, 76 partial and 659 unimplemented occurrences. Exposed
synthetic mechanics do not establish teaching value or real-game precision.
Local integration follows clean ancestry rules; no push or extension changes.

Next: E072 named pawn formations with precise legal support/control facts;
consider Stonewall and Maroczy Bind with separate gates and fixed-file identity.
Broader goal active; numerical research paused; cutoff/shutdown cancelled.
