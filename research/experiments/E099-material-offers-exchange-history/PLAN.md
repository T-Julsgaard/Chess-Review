# E099 material offers and recorded exchange histories

Preregistered 2026-10-09; provisional build-first research. Same isolated checkout
and branch, shared main clean at83c4ed8; no live mutable frozen run. No source
helper changes, extension or numerical work. D001 inspect preflight passed.

Eight original occurrences: C0452 returning material,C0453 giving back exchange,
C0036 winning exchange,C0044 mass exchanges,C0091 permanent sacrifice,C0472
counter-sacrifice,C0679 rook sacrifice for pawn,C0694 bishop sacrifice for pawns.
Common-coach legal material/history priority overrides unrelated lower ranks;
strategic trade quality,gambit compensation and intent require additional proofs.

Default-disabled materialOfferTags wraps E098. maxMaterialOfferNodes integer
0..50000(default50000); atomic new proof exhaustion preserves parent unchanged.
Reconstruct full supplied legal history; no invented history or forced acceptance.
Current nonpromotion nonking mover offered only when an actual legal enemy capture
of that unit has unchanged E022 positive material certificate covering every
immediate counterreply, net of any material captured by the played move. Exclude
terminal acceptance positions. Store all legal unit captures and failed proofs;
positive labels are conditional on the explicitly identified acceptance.
C0091 scope: selected acceptance loss is not recovered on any immediate reply,
not permanent unrecoverability. C0679: actual rook takes pawn plus certified
positive net loss on accepting rook. C0694: same bishop records two consecutive
own pawn captures with intervening enemy reply plus positive net acceptance loss.
C0472: last recorded enemy move itself offered its moved unit with positive net
acceptance proof, and actual current move independently offers own moved unit.

C0452: prior own recorded capture gain still present before played move, current
certified acceptance returns some material, every immediate counterreply retains
at least pre-gain balance. C0453 additionally rook accepted by minor, two-point
net loss after played move and worst return no larger than recorded gain.
No player purpose or best conversion judgment. C0036: prior enemy rook captures
own minor, played own unit captures that SAME rook; two-ply net gain at least two
through every immediate counterreply, with unchanged E022 certificate.
C0044: four or more consecutive recorded+played captures, at least two explicit
adjacent recapture pairs on distinct destinations; identity/victim/material ledger.
No advantage inferred from capture counts; wider mass-exchange scopes unresolved.

Positive/negative/reflected fixtures; disabled exact-parent compatibility, strict
controls/history, early/late atomic budget, terminal guards, offsets, material
return cap, incoming offer, captured-unit identity, capture-sequence boundaries.
Focused E099 and affected E098/E022/E024 checks, cheap guarded synthetic pilot,
independent legal/material saved replay, source verification and staged diff.
build.json full normalized source closure and exact original scopes. INDEX prototype;
accepted tracker untouched. Retain failed fixture/proof observations in EXPOSURE.

Deferred: full combined regression, independent complete saved semantic/absence
replay, interaction/priority/history/terminal/budget matrix, exact main/repeat/
initially-clean reproduction on frozen combined revision, occurrence audit and
real-game usefulness. All broader compensation, purpose and strategic scopes open.
