# E153 — new second-target pressure and complete defensive choices

2026-10-10. Prototype, not accepted evidence. Preregistered2b790e7, parent
E1523276fbd. Authorized current main, research-only/local commits/no push.
Two provisional occurrence scopes C0287/C0288. Creation here means newly
attacking a second existing isolated pawn; structural creation of a weak pawn,
long-term switching, lasting weakness and the broad strategic principle remain
unresolved. Neither original concept is declared comprehensively solved.

Default-disabled weaknessTags wraps E152; strict maxWeaknessNodes integer
0..50000 default50000. Requires full history, weaknessTargets [old,new] naming
two distinct enemy pawns and an explicit distinct legal quiet same-source piece
weaknessAlternative. Missing inputs report prerequisites; unsupported actuals
produce no new labels; malformed supplied inputs rejected. Exact disabled parent
behavior, atomic budget exhaustion. All new events qualityClaim:false, <=24words.
No acquired games, external diagrams, engine or tablebase. D001-test preflight
passed; all chess/evidence entrypoints guarded, source generator metadata-only.

Both targets must be isolated by complete enemy pawn-file inventory and lie on
opposite wings a-c/f-h. Root legal old-target captures identify all stationary
attackers distinct from the actual mover. No root legal new-target capture may
exist. Actual nonchecking quiet relocation retains the old geometric contact
and adds moved-unit contact with the new pawn; legal same-source alternative
retains old contact while leaving new target unattacked. Contact descriptors are
geometric, never a fabricated actor-turn legal-capture claim. Actual capture
evidence follows genuine alternating continuations and full histories.

Both variant trees retain every legal opponent reply, updated target identities
(including pawn advances/promotions), full actor legal inventory and ALL legal
captures of either designated identity, by any own unit. Every attempt retains
full counterreply inventory, descriptors/FEN/terminal flags/material balances
and failures, with no early pruning. Root-relative nominal material p1/n3/b3/r5/q9
includes losses in the defense and recaptures. Successful capture must leave at
least one point of gain through EVERY immediate legal counterreply, with live
after/counter states and nonempty counters. Terminals close; any visited claim
context suppresses findings. No mate/draw vacuity or indefinite-gain inference.

Actual must permit a successful designated-target capture after EVERY legal
defense. Each target alone must fail on some actual defense: complete per-target
refutations and exclusive branches establish both targets' necessity. Alternative
must fail even with both target choices. No inference one defender has two
recapture duties without a separate witness; frozen E049 remains unchanged.

All three initial smoke hypotheses passed without source/fixture amendments.
White Kb1 Ra1 Re1 versus Kh8 Nd4 Pa7 Ph6: Rh1 versus Rf1 creates h6 pressure;
...Nb5/...Nc6 can hold a7 but leave h6, while ...Nf5/...Kg7/...Kh7 can hold h6
but leave a7. Complete combined policy guarantees one point through the stated
horizon, whereas neither target alone covers all defenses. Second f6-pawn family
uses Rf1 versus Rg1 and also passes. Adding Black Rd7 independently guards a7;
...Nf5 now defeats both choices, correctly withholding both labels. Costs
520/566/1468 wrapper-inclusive. Three smoke panels retained/reused after exact
source/input binding; only their three reflected panels newly collected.

58focused checks pass25.0seconds, plus2representative E152 parent checks.
Includes both colors, strict/disabled/missing inputs, true alternating history,
fresh/cache and exact/one-short atomic budgets; target necessity, complete legal
recapture refutations, independent defender, isolation/same-wing negatives,
root EP victim, all four opponent promotions with tracked identity, terminal
mate closure/claim suppression/root rejection, unsupported actual and27
independent inventory/ledger/history/contact/identity/policy/necessity mutations
plus caller/event metadata mutations. No failed exploratory hypothesis or
discarded branch in this batch. No cumulative suite or lengthy reproduction.

Guarded14case pilot:4positive cases,8witnesses,2missing-target,
2missing-history and2zero-cap cases. Six unique panels, raw node costs
517/517/563/563/1465/1465 plus3wrapper ticks; reverse cases share complete panels.
Independent saved replay reconstructs every legal inventory, pawn identity,
root-relative material ledger, all-defense/individual-target success and
refutation, isolation/wing/contact, terminal/history/cost, parent snapshots,
three smoke reuses and388 normalized source/fixture/plan/dependency hashes.
Checker imports neither detector, collector nor policy helpers. Shared Chess
rule semantics remain a limitation. Source verification and diff checks pass.

Evidence observations74,156gzipbytes, smoke47,904gzipbytes,
results119,636gzipbytes(2,822,220plain), run.json55,356bytes. Gzip artifacts
241,696bytes; complete evidence297,052bytes below400KB soft target. Environment,
commands, null engine/seed, guard receipt, preregistration revision, actual
working-source closure and output hashes retained. Canonical pilot copies
byte-equal independently replayed run outputs. Replay:
node research/experiments/E153-second-target-defense/code/replay-saved.mjs

Accepted E082 remains378/1085(34.8%),328names,63accepted studies. Build369
provisional entries,73ready/0stale batches;747accepted-or-candidate(68.8%),
338without ready code. Production, numerical behavior, accepted tracker and
shared policy unchanged. Combined cumulative/occurrence/absence/priority/
history/budget audits, exact main/repeat/initially-clean reproductions, broad
strategic validity and real-game precision/usefulness remain deferred.

Next compatible family in the filtered approved queue: C0293 piece optimization,
C0294 maneuvering, C0295 regrouping and C0296 re-routing. Reuse E151 declared
freedom and true-history machinery where compatible, requiring actual route/
alternative or group evidence rather than relabeling a single relocation.
Preserve broader strategic and sustained-defense prerequisites. Full catalog
goal remains open.
