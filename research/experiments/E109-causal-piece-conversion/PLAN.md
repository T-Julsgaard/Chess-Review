# E109 causal piece activity and comparative conversion

2026-10-09 prospective build-first batch, parent E10850c23de. Same isolated
branch, no extension/numerical changes. pieceConversionTags defaultfalse wraps
E108, pieceConversionPlies integer0..4default2, maxPieceConversionNodes0..50000
default50000. One atomic budget; no partial new labels/witness on exhaustion.

Reuse unchanged E106 conversionQuery and independent checkConversion. One full
legal OR-goal: mate by any actor unit OR same tracked surviving queen with positive
root-relative nominal gain through every immediate enemy reply. Failure remains
finite goal failure, not unbounded loss or a bad winning move. Complete actual
history, all legal choices and underpromotions. No engines/caches/tablebases.

Admit actor exactly K+one pawn+one B/N/R, opponent K+one B/N OR K+1..3pawns,
at most7units, no castling rights. Actual live noncapture/nonpromotion selected
B/N/R entry. Track original pawn through full future policy. Baseline BEFORE
actual common to all queries and legal capture alternatives. Require actual full
winning policy AND fresh-actual same post clocks/placement/turn/rights EPclear
winning policy before any artificial causal comparison claim. Restore ONLY
actual moved unit to origin under post clocks/turn and fresh history; retain
legal controls, abstain when counterpart illegal. This isolates piece activity.

Original scopes C0026/C0549 useful piece activity: actual/fresh winning conversion
but isolated unit restore fails. C0310 same bishop causal entry, C0328 same knight
entry; C0352/C0353/C0661 same rook entry. All finite causal usefulness only.
C0318/C0710/C0881 actual B versus enemy N and own-B-to-N replacement at actual
square fails same conversion; C0327 reverse own N versus enemy B, N-to-B fails.
These require isolated entry failure too. C0919 either direction as concrete
favorable minor imbalance under equal nominal3point single-unit replacement.
C0721 additionally actual bishop move at least3diagonal squares; restoration
and own-knight replacement fail, proving this long-range activity's bounded
usefulness rather than geometric range alone.
C0675 causal active rook entry additionally a legal root rook capture of enemy
pawn gains nominal material but complete same-goal policy fails at same horizon.
Both actual and comparison have positive exact nominal capture ledger/baseline.
Richer alternatives sorted UCI prefix until first full failure; no best-move claim.
C0709 additionally actual recorded last enemy knight moved farther from tracked
promotion square by Chebyshev distance and restoring ONLY that knight under post
clocks/fresh history removes conversion. Original identity and both squares
required; no history means no distance label. This is finite conversion-defense
relevance, not inferring effectiveness from distance alone.

B/N replacement and enemy restore preserve other material/placement/clocks/turn,
EPclear and fresh history explicitly artificial; no inferred legal null or swap.
Retain all frame FENs and full queries, actual/fresh/restored/replaced/relocated
controls and exact comparison legal options. Comments<=24words, thin event refs.
Broad activity/strategic values, open/closed position superiority, generic good/
bad enemy-piece judgments, arbitrary rooks/minors and global optimal plans remain
unresolved. C0891/C0896/open-position preference NOT claimed without broader
comparable activity/position criteria; preserve catalog prerequisites.

Prospective synthetic hypotheses: bishop Ba8d5 with Pe7 versus Kg8+remote N;
knight Nc4d6 protects Pe7 conversion versus Kg8+opposite-color bishop; active rook
Rd4d8 supports Pe7 queen versus Kg8+pawns compared with Rxa4. Full controls may
refute; preserve negatives. Recorded enemy Nf6h5 for distance hypothesis.
Focused positive/negative both colors, restoration/replacement successes negative,
missing history, illegal counterpart, strict controls, disabled equality, clocks,
atomic/exact budget, full JSON, proof/frame/identity/range/label tamper checks.
Guarded authored D001 pilot with runtime/argv/engine:none/seed:none and source
closure hashes. Deferred full combined regression, comprehensive semantic/absence/
interaction/priority/history/budget matrix, exact frozen changed main/repeat/clean
reproductions, occurrence audit and real-game usefulness. Keep all1085ideas.
