# Development admission repair and reuse

First smoke: exposure H3 comparison succeeds; reversed safe king move correctly
withholds exposure. Activation collector built its new E163 king panels, but
adapted verifier still demanded E161's E156-single-queen-projection source label.
This was an admission implementation error, not a chess hypothesis failure. Initial
smoke/error/source bindings retained; activation-admission-failure.json.gz retains
original verifier and eight full activation raw panels. Replace only the obsolete
source-label assertion with explicit absence of that label, matching the newly
registered independent collector contract/schema. All legal/material/policy gates
unchanged. Replay these existing panels, do not recollect.

Frozen E143 panel covers ALL root choices and does not depend on current actual
or declared alternative for its observations; its collector reads the root/history
and H. Reuse that same hash-matched panel when reversing Kg1/Kg2. Own context and
independent policy checker still authenticate each distinct actual/alternative.
Exposure cache key therefore root/history/H; activation key includes both king
moves and pawn objective. Complete behavioral/run bindings remain separate.

First focused run:52 checks pass, two fixture-construction checks fail because
they reconstructed a temporary FEN with a king removed before replacing it.
Keep removal/replacement in the same Chess instance before serializing valid FEN;
no detector/legal rule change. Original test/derive/checker/fixtures and first
pilot run/results retained in development-test-failures.json.gz.

To exercise a nonterminal first attack at H3, prospectively replace the two
zero-horizon pilot rows with a both-color continuation case derived from E143's
already-known authored board: White Kg1 Qg5 Bf7 Ng4 Pd4 Pg2 Ph2 versus Black Kg8
Qd2 Rh7, Black Kh8 versus Kf8. Hypothesis: Kh8 allows Qd8+ ...Kg7 Qg8#, while
Kf8 has complete H3 avoidance. Root is checked, both legal king evasions must be
quiet/nonchecking. This is development exposure, not new confirmation. Keep the
original zero-horizon results/raw panels; focused check still verifies that bound.
Pilot stays20 cases. Record actual first-attack FEN directly from true replay,
rather than using a terminal-only proof-node FEN (nonterminal nodes lack it).
New raw trees needed for this new root, unchanged old raw panels reused.

Continuation smoke found a valid exposure comparison, but solver chose immediate
Qg8# rather than the intended nonterminal Qd8+. Full observation retained in
continuation-smoke.json.gz, not counted as nonterminal coverage. Prospectively
replace Black Rh7 by Bh7: ...Bxg8 should refute immediate Qg8+, while Qd8+ allows
...Bg8/Qxg8# or ...Kg7/Qg8#. This adds a real defensive resource; same H3 and full
proof gates, no shorter-mate assumption. Evaluate before replacing pilot rows.

Bh7 smoke still finds immediate Qe5#; retained as nonterminal-smoke.json.gz,
explicitly NOT nonterminal coverage. Use a simpler prospective KQK root for the
continuation check: White Kf6 Qc1 versus Black Kg8, Black Kh8/Kf8. Expected checking
policy Qh6+ ...Kg8 Qg7#, whereas Kf8 admits a finite H3 counterpolicy. No tablebase
used; complete same-bound legal queries still required. Retain both exploratory
exposure panels and their honest immediate-mate outcomes.

KQK smoke proves a nonterminal mate policy for Kh8, but Kf8 also permits Qc8#;
therefore contrast correctly fails. Full trees retained in kqk-continuation-smoke.
Before next evaluation move root black king to h6, actual Kh7 versus Kh5, keep
White Kf6/Qc1. Expect Qc7+ ...Kg8/Kh8 Qg7# after Kh7; Kh5 is farther from the
restricted corner and must have complete H3 enemy failure. Same proof gates.

That KQK alternative also permits immediate Qg5#, so final-continuation-smoke
correctly withholds contrast. Before further evaluation move white king f6 to e5
and add white Ne8: knight supports Qg7 after the checking continuation but does
not support Qg5 against Kh5. Root White Ke5 Qc1 Ne8 versus Black Kh6, Kh7/Kh5.
Require the same full H3 failure for alternative and a nonterminal first attack;
retain all failed contrasted hypotheses and unchanged gates.

Knight smoke gives actual mate H3 and alternative failure, but first certified
choice Qg5 is nonchecking, so the registered checking-exposure claim correctly
withholds. Full9600-tick panel retained in knight-continuation-smoke. Restore Kf6,
remove Ne8, add white Pf4 to block c1-d2-e3-f4-g5 immediate Qg5 route. This retains
Kf6 control of g6 and support of Qg7 after Qc7+, while the Kh5 alternative cannot
face immediate Qg5 from c1. Prospective root Kf6/Qc1/Pf4 versus Kh6, Kh7/Kh5.

Pawn-blocker smoke has actual mate/alternative failure, but canonical first Qc8
is nonchecking; retained and correctly uncredited. Add White Nf5 to deny ...Kh6
after prospective Qc7+, leaving ...Kg8/Kh8 Qg7#. Keep Pf4 and both king choices;
verify all alternative H3 failures rather than infer them from extra control.

Nf5 denies h4 as well and permits immediate Qd1# against alternative Kh5;
guarded-continuation-smoke correctly withholds contrast. Prospectively move that
knight to f7: retain h6 control for actual checking route, leave h4 escape in the
alternative. All original policies/horizon fixed, every failed full panel retained.

Nf7 smoke passes: canonical Qh1+ is genuinely nonterminal, full actual H3 mate
policy and complete alternative failure; after Kh5 same Qh1+ allows ...Kg4.
Retained f7-continuation-smoke and independently checked. Use this both-color
case for the proposed two pilot replacements; original H0 panels preserved and
focused boundary check remains. First-attack FEN correction affects witness
metadata only; all previously collected raw observations remain hash-compatible.
