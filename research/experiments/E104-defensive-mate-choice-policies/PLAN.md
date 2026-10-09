# E104 complete finite defensive mate choices

Preregistered2026-10-09 after completed E103; same checkout/branch, clean shared
main ad8ee07, no live frozen source. Six pending original scopes C0470 Only
defense, C0458 King evacuation, C0025/C0380/C0548 King safety, C0857 weakening
king safety. Prioritize quantified useful warnings; global quality stays open.

Default-disabled defenseChoiceTags wraps E103. defenseChoicePlies integer0..3,
default1; maxDefenseChoiceNodes integer0..50000 default50000. Actual live move,
complete known legal history. Atomic exhaustion preserves parent output.
Reuse E029 callable minimax query and its independent full semantic replay,
without changing either accepted source. This is complete bounded goal failure
with a defender counterpolicy, not budget failure or an unbounded safety claim.

Enumerate EVERY legal root alternative preserving actual full history. After
each root move, ask whether enemy has a forced mate within H further plies.
Retain each complete positive attacker policy or complete negative defender
counterpolicy, including legal move inventories implicitly covered by E029
replay, finite limits and history-sensitive draw/mate terminals. Actual result
must be live; terminal alternatives still remain in the full comparison set.
No chess-engine score or reasonableness filter. Also retain current root check.

C0025/C0380/C0548: actual full counterpolicy avoids forced enemy mate within H,
while at least one legal alternative has a full enemy mating policy at SAME H.
Observable relative finite king vulnerability only, no absolute/general safety.
C0857: actual permits forced enemy mate at H while a legal alternative has full
bounded avoidance counterpolicy. Move-dependent worsening, not a global category.
C0470: root has>=2 legal moves, actual is the unique complete no-forced-mate
choice at H; ALL other root choices permit forced enemy mate at H. Extends
E095 only-resource scope (positive own mate/draw), not its renamed evidence.
C0458: actual noncapturing king move escapes root check and has complete bounded
avoidance; another legal king relocation permits forced enemy mate at H.
This quantifies relocation benefit; durable evacuation/safety remains unresolved.
King-safety imbalance needs comparable king/turn objectives and broader evidence;
counterthreat and passive defense need additional intent/attack or activity
comparisons. Keep those catalog scopes pending, not labels copied onto this matrix.

Positive/negative/reflected authored synthetics, safe/losing alternatives,
uniqueness versus two defenses, in-check nonking/king moves, strict controls,
zero horizon, history, draw terminals, disabled equality, exact shared budgets
and full JSON; independent tamper/absence replay. Cheap guarded pilot and focused
E104/E029/E085/E095 dependencies (representative only), normalized complete source
closure, source and staged diff checks. build.json and RESULT.md exact scopes,
INDEX prototype, no accepted advancement. Defer combined full regression,
interaction/priority/history/budget/absence matrix, exact frozen main/repeat/clean
reproduction, original scope audit and real-game usefulness. Never push.
