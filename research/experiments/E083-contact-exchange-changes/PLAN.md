# E083 legal contacts, exchanges and pawn changes

Registered 2026-10-09 before implementation/testing. Research-only provisional
batch; synthetic inputs, D001 eligibility guard for tests, no real game claims.

Callable explainMove(input) wraps unchanged E082. Default disabled is byte-for-
byte parent compatibility. Enabled contacts use legal captures on a hypothetical
actor-turn snapshot with EP cleared, explicitly not an actual second move. Newly
created moved-piece contacts are categorized by target region, color complex,
f7/f2/h7/h2/g7/g2, and multiple targets. No success, safety or won-tempo inference.
History-confirmed immediate same-square recaptures witness queen exchanges,
trading checking attackers and reductions in non-pawn piece count. Pawn-square
inventory changes record advances/captures/promotions including EP victim square.

Claims: C0057 double contact; C0405/C0406/C0407 regional attack contacts;
C0430/C0431 target-square color contacts; C0432/C0433/C0434 named pawn contacts;
C0450 actual exchange of a checking attacker; C0451 queen exchange;
C0464/C0630/C0631 witnessed exchange reducing non-pawn armies; C0540 pawn change;
C0526 majority pawn advance; C0527/C0528/C0529 regional pawn advances.
All broader strategic scopes remain unresolved. Ranks38,47-49,54-58,63-64,
67,78-82,99-100 grouped by common legal/history machinery; earlier phase1
strategic prerequisites remain pending rather than renamed inventory claims.

Focused gates: positive/negative, both colors, pinned capture/contact refusal,
strict inputs/history, default/disabled compatibility, terminal roots/results,
atomic budget rollback, EP/promotion and comment<=24 words, qualityClaim false.
Cheap retained synthetic pilot and source/diff checks. Affected E082 focused
checks; unchanged accepted dependencies/evidence reused by physical hashes.

Deferred: combined cumulative regression, independent saved semantic replay,
full interactions/priorities/history/budget matrix, exact main/repeat/initially
clean reproductions on combined freeze, original-occurrence scope audit and
real-game precision/usefulness. No accepted tracker changes. Do not modify any
historical frozen inputs/evidence. Next independent tactical family thereafter.
