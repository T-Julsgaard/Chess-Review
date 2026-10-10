# E122 — provisional forced pawn replies and irreversible holes

2026-10-10. Preregistration e7bcc1f, parent E121 5c09a7e. User-authorized current
main, local research commits/no push. Production/numerical unchanged.

Default-false forcedPawnTags, strict maxForcedPawnNodes 0..50000 default50000.
Disabled exact E121 behavior. Atomic budget exhaustion drops new witness/events
while retaining parent. Legal actual/history, quiet nonpawn/nonking move, no
castling rights and live actual postboard. No new engine or solver.

C0916: ALL actual legal replies are pawn moves; legal same-clock fresh restoration
of only moved piece admits at least one nonpawn reply. Causal forcing, not intent
or presumed strategic benefit. C0910 stronger selected square/knight: EVERY reply
abandons previous direct pawn control of target; target stays empty and every
remaining enemy pawn has passed its attack-source rank. Monotonic pawn movement,
captures and promotions cannot recreate a pawn on the needed rank. Same stationary
own knight can enter after every reply, nonterminal and with no immediate legal
capture of it. Pawn-only permanence, not permanent knight occupation or general
strategic weakness. Broader original concept remains open.

Authored Ka8 Bf5 Ne2 versus Kh1 Bg1 Ph2 Pf4: Be4+ forces ...f3, abandoning g3;
Ne2-g3 is legal without immediate capture. Remaining black pawns f3/h2 cannot
return to f4/h4 to attack g3. Restoring Bf5 admits nonpawn replies. No-knight and
Nc2-e3 capturable by Bg1 controls retain induced-pawn label only. Pg4 prevents
simple all-ranks certificate: label withheld, no claim that Pg4 can itself reach
an attack source. Ph4 explicitly retains pawn attack on target. Additional Pg3
supplies alternative pawn block, so not every reply abandons same target. Rg1
nonpawn block and king escape remove even forced-pawn claim. Both colors/history,
wrong actual unit and atomic budgets retained. Failed target/knight trial prefixes
are complete and ordered; candidate stops at first successful pair.

First 39 focused checks passed; added explicit Ph4 retained-control negative and
renamed Pg4 control to rank-bound-unavailable rather than implying demonstrated
future access. Final 41 checks pass in 1.4 seconds. Three representative E121
disabled/strict/history checks pass in 0.8 seconds. Source verification/diff pass.
Guarded D001-test synthetic pilot and independent saved replay pass 26 cases,
20 witnesses, 14 positives and 4 expected exhaustions. All 130 normalized source/
fixture/parent dependency hashes verify. Checker reconstructs histories, complete
actual/restored moves, exact pawn/rank invariants, all candidate/failure prefixes,
entries and complete immediate capture inventories without candidate import.
No acquired games/labels, engine, holdout or pristine frozen reproduction.

Evidence copied from research/runs/E122/final to evidence/results.json.gz and
evidence/run.json. Revision plus actual source/input/environment/argv hashes,
engine:null, seed:null and guarded receipt bound. Plain 173170 bytes, gzip 16818
bytes. Packed SHA256
33d4ac07fa3b244a2c48f992c189f30f32f45c1045cf206e79e5e9a5b9a80dc0;
plain c00063fff008538f8ee402b5d5bc2ea4da58ecaabd987fe46a99ffceacf2d852.
Replay: node research/experiments/E122-forced-pawn-holes/code/replay-saved.mjs

Accepted E082 unchanged: 378/1085 (34.8%), 328 names. Build: 293 provisional
entries, 43 ready/0 stale batches; 671 accepted-or-candidate (61.8%), 414 without
ready code. No full definition or acceptance advancement. Deferred combined
cumulative regression, exhaustive semantic/absence/priority/history/budget/
integration/occurrence audit, frozen main/repeat/clean and real-game precision/
usefulness. Promotion/capture-reply and illegal-restoration full matrix remains
combined-validation gap; current positive proves one forced pawn push.

Next unused E123: inspect temporary/static weakness and open/closed position
families with causal, quantified meanings; or compatible finite endgame policies
where strategic prerequisites remain unavailable. Do not infer lasting value from
geometry. Continue focused batches/small pilots without cumulative recollection.
