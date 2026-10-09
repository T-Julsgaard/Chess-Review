# E113 causal rook lifts and queen centralization

2026-10-09 provisional build-first batch, preregistration d2ef733, parent E112
abeaaef. Current checkout/main explicitly authorized by user; local commits,
no push. No production/numerical changes or accepted tracker advancement.

Three original occurrence scopes: C0349 rook lift, C0361/C0725 queen
centralization. Callable sliderPlacementTags defaultfalse wraps unchanged E112;
sliderPlacementPlies 0..4 default2, maxSliderPlacementNodes 0..50000 default50000,
shared atomic budget. Noncapturing horizontal rook transfer on relative rank3/4
or queen entry from outside d4/e4/d5/e5 into that set, <=10units/no rights.
Actual known-history and fresh actual complete mate policies must win; legal
fresh restored-slider frame must fail at identical horizon. Other pieces,
turn and post clocks fixed, EP cleared; artificial restoration is not a legal
move. Broader strategic centralization/lift usefulness stays unresolved.

Authored pilot observations:
- Kf6/Bf7/Rf3 versus Kh8, Rh3#: actual terminal mate; restoring rook alone stops
  zero-ply mate. Rank4 and both-color versions also pass.
- Add enemy Ph7: Rh3 is not immediate mate, but every pawn reply allows a mating
  rook capture within two further plies. Restoring rook to f3 removes that policy.
- Ra3b3 with the same helpers permits a two-ply mate, but Ra3 also permits it:
  no causal rook-lift claim. Rh4# likewise loses the new claim when H2 lets the
  restored Rf4 retain a complete mate policy. No geometry-only inference.
- Kc3/Qh4 versus Kd5/Pc6/Pd6/Pe6, Qd4#: all retreats blocked/controlled, and
  restored Qh4 lacks zero-ply mate. Removing Pe6 breaks the two-ply mating policy.
- Initial proposed Qd1d4 root illegally checked the nonmoving king on d5 and
  was rejected. Initial already-central negative with Kh8 also had a starting
  diagonal check: first test run 46passed/2failed (both colors); fixed that
  fixture to legal Kh7. No candidate gates changed. Illegal hypotheses cannot
  establish any chess claim.

Final 48focused checks pass in3.0s, including both colors, ranks, finite causal
negatives, known history, terminal refusal, clock draw, capture/rights gates,
strict/disabled/exact atomic budget, JSON and independent proof/frame/identity/
label mutations. E02936query checks pass in13.5s; E1123disabled/strict/history
representatives pass in0.54s. Source verification and diff checks pass.
No full cumulative suite or inherited historical search regeneration.

Guarded authored synthetic pilot:32cases,18witnesses,8positive cases,
4expected exhaustions. Independent replay verifies all cases and117normalized
source/fixture/dependency hashes without E113 detector/query imports. Retained
evidence/run.json binds preregistration revision plus actual source hashes,
runtime/argv, engine:null,seed:null,D001receipt. No acquired games, independent
human assessment or initially pristine frozen reproduction. Plain110,034bytes;
gzip17,244bytes. PackedSHA256
d4f09cb72b827074f1e50e2d00f09002d79a5bebe758c61d671c1503a66f7e65;
plainSHA256104dc4515d7f43bec3b98a4b6336ac5099447853f5d002657df4e722f14ac52b.
Replay: node research/experiments/E113-causal-slider-placement/code/replay-saved.mjs

Accepted E082 unchanged378/1085(34.8%),328names. Build metadata:266provisional
entries,34ready/0stale;644accepted-or-candidate59.4%,441withoutreadycode.
Every original occurrence and broader meaning retained. Deferred cumulative
regression, exhaustive semantic/absence/integration/priority/history/budget
matrix, frozen changed main/repeat/initially-clean reproductions, occurrence
audit and real-game precision/usefulness. Positive fixture success is provisional.

Resume current authorized main. Next unused E114: inspect rank-filtered remaining
descriptors/history scopes (asymmetry, pawn irreversibility, uncastled king) and
separate factual observations from strategic consequences; reuse established
inventory/history machinery. Preregister before evaluation and continue compatible
batches with focused checks. No shutdown or usage cutoff action is requested.
