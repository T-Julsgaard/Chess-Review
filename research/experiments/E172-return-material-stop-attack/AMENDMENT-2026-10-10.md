# Extra-attacker hypothesis, 2026-10-10

Initial smoke passed expected own labels, including withholding both labels for
the extra-Bf8/Bg6 root. However the mechanistic prediction failed: both actual and
alternative enemy H3 queries were false, rather than actual mate persisting.
Bf8 obstructs the attacking rook's back-rank ray. Retain original fixture and
complete smoke under evidence/initial-extra-attacker-hypothesis/. This is an
inspected development negative, not a failed implementation or confirmation.

Before querying revised inputs, retain only extra WhiteBg6, remove Bf8. Hypothesis:
Bg6 prevents h7 escape and occupies g6 preventing the g-pawn advance; after Kxb2
every Black move permits Rd8#, while Ra3 also loses. Require explicit actual H3
and acceptance H2 positive queries in smoke, plus withheld own labels. This tests
the attack-persistence gate instead of merely missing the alternative attack.
No proof gate, horizon, budget or positive fixture changed. Old raw source remains
compatible; reuse exact unchanged positive observations, collect only revised root.

The revised single-Bg6 hypothesis failed: smoke exited1 because both own labels
were emitted instead of expected[]. Actual and accepted-return enemy queries are
false; ...hxg6 captures the bishop and simultaneously frees h7. Preserve that
complete smoke and fixture/runner sources under evidence/failed-single-bishop-
hypothesis/. Retain it as a positive finite-return case, not a false negative.

Before querying further revised inputs, use White Bd3 and Be5 instead. Bd3 should
control h7 without immediate pawn capture; Be5 controls g7 without blocking the
rook's eighth-rank ray. Both Kxb2 and Bxb2 should leave the g7 diagonal controlled,
so each accepted return may still lose H2 and actual H3 persists. Explicit smoke
actual/acceptance positive-query requirements retained; no gates/horizons relaxed.

Bd3/Be5 also failed the explicit persistence assertion (false vs true, smoke exit1):
Bd3 blocks Rd1's d-file. Both global enemy queries and both accepted-return queries
are false. Preserve full smoke, fixtures and runner under evidence/failed-d-file-
bishop-hypothesis/. Before further query, relocate Bd3 to e4, preserving its h7
diagonal without blocking d-file or original queen offer. Be5 unchanged. Keep
explicit actual H3 and every acceptance H2 win requirements, unchanged expected
withheld labels. These unsuccessful authored hypotheses remain development data.

The first full pilot exited1 before writing outputs: validateHistory rejected the
reflected fixture final FEN. Shared reflect preserves full-move counters, while
reflecting an odd-length history changes which color increments them. Before
rerunning, derive reflected root FEN by replaying its reflected legal history;
retain every move, placement, claim, horizon and expected gate unchanged. No
collector change or new positive hypothesis; unchanged White smoke remains reusable.
