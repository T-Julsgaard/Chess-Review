# E121 — provisional pawn-risk comparisons

2026-10-10. Preregistration c6865f6, parent E120 142dcb2. Authorized current
main checkout; research only, local commits/no push. Production and numerical
research unchanged. No accepted tracker advancement.

Default-false pawnRiskTags; maxPawnRiskNodes safe integer 0..50000 default50000.
Enabled internally activates existing E104 defenseChoiceTags, rejecting explicit
conflicts. E104 retains independent plies/budget validation and complete legal
root comparison. New atomic budget exhaustion preserves all parent findings.
Disabled exactly E120. New claims limited to <=10 initial units/live legal input.

C0862: actual nonking capture of enemy pawn permits full bounded enemy mate,
with fresh actual agreement and a legal alternative avoiding the SAME mate bound.
No inferred greed, intent or material evaluation. C0869 additionally quiet
same-file pawn advance to relative rank4 or farther; legal pawn-only restoration
in fresh actual postframe (same turn/clocks, clear EP) defeats that mate. Establishes
causal pawn-placement exposure, not general overextension or lasting weakness.
Reuse full E104 actual/all-alternative observations unchanged, selecting first
safe legal alternative. No new alternative searches or replacement solver.

Authored Kg1 Rf1 Rh1 Nf2 Pg2 versus Ka8 Qh4: g2-g4 opens ...Qg3# while restoring
Pg2 stops it. Pawn g2 captures enemy h3 pawn and permits same mate with legal
safe alternatives. Rook g2 captures g4 pawn but can answer ...Qg3 by capturing
queen: correctly no warning. Already advanced g4-g5 still loses after restoring
Pg4, so no causal overextension label. Both colors, known history, empty mating
force, king escape, below-rank move, other-piece exposure, zero horizon, parent
exhaustion and atomic extra-budget limits retained. General unnecessary-move/
outpost/perpetual strategy prerequisites remain unresolved.

First 35 checks passed in 10.3 seconds; added restored-still-loses control because
causal failure needed explicit coverage. Final 37 focused checks pass in 8.9
seconds. Three representative E120 disabled/strict/history checks pass in 0.6
seconds. Source verification and diff checks pass. Guarded D001-test synthetic
pilot and independent saved replay pass 26 cases, 8 witnesses, 6 positives and
4 expected exhaustions. All 129 normalized source/fixture/parent hashes verify.
Checker reuses neutral E104 complete-alternative checker and E029 mate replay,
never candidate/solver; reconstructs root identity, full comparison, fresh and
restored frames, legality and exact labels. No acquired games, labels, engine,
independent holdout or pristine frozen reproduction. No long cumulative tests.

Retained evidence copied from research/runs/E121/final to evidence/results.json.gz
and evidence/run.json. Revision plus source/input/environment/argv hashes,
engine:null, seed:null and guarded receipt bound. Plain 733776 bytes, gzip 67292
bytes. Complete all-alternative trees retained; no truncation for byte target.
Packed SHA256 263fff8d0fe3d54dd2ff4d372f834016067ea43db3f0396ac79a654ac62f178c;
plain 92f54be02c32df68b4c1edc96124801035c9a341e0aa2b7523ca60e8b94a45e1.
Replay: node research/experiments/E121-pawn-risk-comparisons/code/replay-saved.mjs

Accepted E082 unchanged: 378/1085 (34.8%), 328 names. Build: 291 provisional
entries, 42 ready/0 stale batches; 669 accepted-or-candidate (61.7%), 416 without
ready code. Original broad scopes retained. Deferred combined cumulative
regression, exhaustive semantic/absence/priority/history/budget/integration/
occurrence audit, frozen main/repeat/clean and real-game precision/usefulness.
Higher horizons, all-options-losing and illegal-restoration genuine fixture matrix
remain combined gaps; current proofs establish H1 synthetic examples only.

Next unused E122: inspect remaining structural/weakness, defensive outpost and
forcing-pawn concepts. Prefer quantified response policies and actual-history
evidence; keep unbounded permanence and general opening advice prerequisites
explicit. Continue compatible focused batches without historical recollection.
