# E139 — provisional recorded joint knight trapping combinations

2026-10-10. Preregistration18c74ae, parent E138 ed26db5. User-authorized current
main, research-only local commits/no push. Two original candidate scopes C0944
and C0929; accepted tracker, numerical research and production unchanged.

This addresses the preparatory-history gap in E033's finite trapping evidence.
A supplied legal quiet knight preparation, quiet enemy reply and second distinct
quiet knight arrival create two new contacts with the SAME stationary enemy
nonpawn/nonking target. Neither old knight origin contacts it. After the actual
move, EVERY legal enemy defense must permit capture of that tracked target with
positive root-relative signed nominal material through EVERY enemy counterreply.
Target flights are tracked to their new square; defense captures/promotions are
included in root-relative material. Every defensive row, capture candidate and
counterreply is retained, including failed alternatives, with legal states/gains.
Successful capture may terminate in actual delivered mate; draw eligibility or
actor checkmate refutes. No terminal/empty-reply vacuity or erased actual history.
This is a three-ply material guarantee, not lasting conversion or best play.

Restore each knight separately to its recorded origin on the final board; other
units, turn and counters stay fixed. Both controls must be legal/live and fail
the complete target-capture policy. These are explicitly hypothetical FEN-root
placement controls, not reconstructed alternate historical games. They establish
necessity in that fixed environment; no claim that the enemy reply or other
pieces were irrelevant, or that the player intended a combination. Only knight
pair geometry is covered, not general geometric tactics or longer combinations.
Missing/capturing/promoting/same-knight arrivals, occupied restoration origins,
illegal controls and final castling/en-passant state cannot receive these labels.

Default-false recordedTrapTags wraps E138 without implicit parent flags. Disabled
is exactly parent. Strict maxRecordedTrapNodes integer0..50000 default50000, shared
across history, complete policy panels, restoration and comments. Exhaustion
atomically clears the extra witness/events and preserves parent comment/events.
Complete failure panels remain inspectable under no-new-fact. Every emitted
comment names its three-ply horizon and has qualityClaim:false.

Authored start: white Ka1,Nb5,Nd5; black Kg8,Qa8,Bb8,Pa7,Pb7. Recorded Nb6,
...Kh8, actual Nc7 passes455ticks. All seven defenses retained: a7a5,a7a6,a7b6,
b8c7,h8g7,h8g8,h8h7. Worst guaranteed root-relative gain is+6: a7xb6 or Bxc7
removes one knight, then the other captures Qa8. Restore Nb6→d5: Bxc7 refutes.
Restore Nc7→b5: a7xb6 or Be5 refutes. Color reflection also passes455ticks.
At cap455 the complete labels pass;454 exhausts at455 and drops both labels.

Initial fixture import failed before query because reused reflection expects a
whole fixture, not a FEN string; corrected that call. Original plan's b7xb6
hypothesis was an illegal forward pawn capture; actual evidence is a7xb6. Both
errors and the observed additional Be5 control failure are disclosed in the
dated plan development note. No policy/objective/budget changes to make them pass.
Countermate/threefold checks and exact observed budget cases are development
checks after exposure, not fresh confirmation. The original hypothesis remains
visible in the frozen preregistration and current plan text.

Final43 focused checks pass8.2s; three representative E138 parent checks0.9s.
Checks cover positive/color reflection, missing/unrelated/same-unit preparation,
queen flights, countermate, exact/one-below/zero budget, illegal history, strict/
disabled controls and enabled unavailable engine parent. Separate helper checks
refuse terminal, fifty-move and full-history threefold roots. Nineteen witness
mutations and altered comment/quality are rejected. Countermate negative retains
the legal material-capture alternatives whose counterreplies refute the gain.
No full/cumulative or long test suite, new engine searches or tablebase access.

Guarded D001-test authored pilot11cases:3positive (including exposed exact-cap
repeat),2expected exhaustions,1expected history refusal,5retained complete positive/
negative witnesses. Independent saved semantic replay passes all11 and164 source/
fixture/plan/dependency fingerprints. Checker imports no detector/query/helper;
it reconstructs full history, legal inventories, raw root-relative material,
target tracking, every capture/counterreply, geometry, restoration frames,
necessity and exact comments. Inherited full behavior/priority validation remains
for combined acceptance. Source verification/diff checks pass. Shared data-policy/
registry unchanged; no acquired game contents used. Source hashes include parent
engine-related assets because parent focused tests import that harness; null
engine records accurately indicate that E139 did not run it.

Evidence copied from research/runs/E139/pilot to evidence/results.json.gz and
evidence/run.json. Preregistration revision18c74ae plus actual working source
hashes, environment/argv, null engine/seed and guarded receipt retained.
Plain425484bytes, gzip45215bytes. Packed SHA256
b5eda57d75cc2ce267b6fb3938b24cf30cf07f492a59fb2f2374cfc37ad71ff4;
plain6cc79b03a278e0fd4cf8184279cff7bd039e46c2b1a56bf2880c88fd12cda940.
Replay: node research/experiments/E139-recorded-geometric-traps/code/replay-saved.mjs

Accepted E082 stays378/1085(34.8%). Build332provisional original entries,
60ready/0stale batches;710accepted-or-candidate(65.4%),375without ready code.
Deferred combined cumulative regression, exhaustive independent integration/
absence/priority/history/budget/original-occurrence audit, exact main/repeat/
initially clean reproductions, real-game precision/usefulness and lasting outcomes.
Neither narrow candidate discharges the general teaching concept.

Next unused E140: remaining defensive/endgame or causal comparative families;
keep sustained rook defense, perpetual-attack, tablebase provenance and strategic
evaluation prerequisites explicit. Continue coherent batches with focused checks
and cheap pilots, preserving all broader unresolved scopes.
