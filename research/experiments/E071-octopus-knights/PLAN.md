# E071: tactically certified octopus knights

2026-10-07. Preregister before implementation/evaluation. C0330 Octopus knight:
deeply placed knight controlling many important squares. This research verifies
a stated strong tactical subset: a pawn-supported central sixth-rank knight
controls all eight squares, checks the king and forces a profitable queen capture.
No placement-only inference of general positional strength. Frozen E070, 3,752
ordered baseline cases; guarded D001 authored synthetic test inputs only.

octopusTags boolean default false; maxOctopusNodes integer 0..50000 shared.
Explicit outpostTags true and a proven E070 advanced outpost are prerequisites;
no implicit option changes. Disabled exact E070; exhaustion drops all new octopus
events/refutations, preserves parent. Destination own relative sixth rank, file
d/e; complete eight knight attack squares on board, direct check of enemy king
and at least one original enemy queen among those squares. Parent outpost proof
certifies legal pawn support and no current pawn challenge before promotion.

Full history at every tree edge. ALL legal enemy defenses must be live and permit
the same knight legally capturing an original attacked queen, with positive
material gain measured from ACTUAL AFTER position through EVERY immediate enemy
counterreply. Fixed descriptive values P1/N3/B3/R5/Q9/K0, not engine evaluation.
Save all legal queen-capture candidates for each defense and all counterreplies,
including failures/terminal flags/gains. Candidate wins iff capture gain >0,
capture not draw/stalemate (own capture mate allowed), and every immediate enemy
counterreply retains positive gain, never draw or enemy mate. At least one winning
capture per defense; terminal defense, no capture or all failed candidates refute.
No permanent safety or longer-term win claim. Counterchecks and rival promotions
retained; finite material proof does not substitute for longer-term evaluation.

New text <=24 words, qualityClaim false, priority 145.05 above generic royal fork
145 but below triple attack146, discovered double attack147 and urgent warnings.
Comment states eight controlled squares, pawn support and the actual all-defense
queen-capture result. Save parent outpost proof plus history/actual/eight squares,
king/queen targets and full defense/capture/counterresponse AND/OR tree, including
negative refutation. Independent replay imports no detector helpers, reuses only
frozen E070 independent outpost replay, reconstructs all geometry/history/legal
sets/material/terminals/choice outcomes and exact text.

Author both colors/reflections, central d/e sixth ranks, captures, multiple queens,
countercaptures, counterchecks/promotions, rule-terminal defenses/captures/counters,
legal histories/repetition, lacking support/future pawn challenge, wrong rank/file,
missing direct king/queen target, captured knight/no legal capture, disabled and
parent off, budget/domains/illegal moves and tampered proofs/targets/legal sets/gains.
Cheap pilot, focused/full cumulative/source/diff gates, then frozen main/repeat/
initially clean detached reused checkout runs. Exact source/input/physical output/
metrics, all ordered inherited fingerprints and original list unchanged, independent
saved-proof replay. Estimate ~260–290s/run overlapping three; prospective complete
evidence <=20MB. Retain/report misses without pruning proofs or relaxing gates.
Commit coherent changes, local integration under existing clean ancestry rules;
no new branches, extension integration, push, numerical research, cutoff/shutdown.
Exposed synthetic mechanics do not establish teaching value or real-game precision.
