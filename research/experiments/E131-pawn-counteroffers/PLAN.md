# E131 — history-bound pawn offers and counteroffers

2026-10-10. Parent E130 e74b871, next approved pending opening rank120 C0163.
Reuse E115's opening-history/acceptance distinction but broaden its mate-only
examples through a different explicitly bounded material-concession predicate.
C0160/C0161/C0162 get additional scopes; C0163 gets its first candidate scope.
Current checkout authorized; local commits/no push. BUILD-FIRST, no long suites.

Operational offer: a recorded quiet nonpromoting pawn push leaves THAT pawn
legally capturable by an enemy pawn; at least one accepting capture is live and
EVERY immediate legal reply leaves that accepting pawn uncaptured. Enumerate
all legal moves, all such acceptances and all immediate replies, including EP
victim squares and terminal/draw facts. Eligibility does not claim net material
gain through all replies: a different offered pawn may be taken in response.
Retain nominal balance at baseline, after acceptance and every counterreply,
explicitly exposing compensating captures. No mating/positional compensation,
soundness, intention or engine claim. This sufficient pawn-offer scope excludes
immediately recapturable offers, stationary concessions and nonpawn gambits;
abstention must not be presented as proof that those are not gambits.

Interface default-false pawnOfferTags, strict maxPawnOfferNodes integer0..50000
default50000. Disabled exactly E130; no implicit parent flags. Atomic exhaustion
retains parent. Full legal history from canonical standard initial position,
first20plies INCLUDING actual move, live root and actual required. No army cap.
Current panel only when actual is quiet pawn push; incoming panel only when last
history move is quiet pawn push. Both use complete actual histories. Accepted
means actual equals an eligible incoming pawn acceptance; declined/untaken means
eligible incoming exists but actual accepts none. Current eligible gives offer.

Counteroffer requires eligible incoming and current panels, quiet actual push
and untaken incoming. Additionally reconstruct fresh after-placement with actor
to move and EP cleared, legal/live, with at least one SAME eligible incoming
capture still eligible. Save full preserved panel and matching pair indexes.
This simultaneous retained-offer comparison is hypothetical, not a legal pass.
It establishes a second offer while leaving the first available, not universal
gambit taxonomy. Earlier turn state, rights, counters and full histories retained.

Authored hypotheses: Queen's Gambit d4 d5 c4 has a capturable c4 pawn without
immediate recapture; ...dxc4 accepts, ...e6 leaves it untaken. Albin ...e5 after
d4 d5 c4 should leave incoming ...dxc4 available and offer ...e5 to dxe5; an
immediate ...dxc4 can balance nominal material, which must NOT be hidden or
misrepresented as a guaranteed net pawn sacrifice. King's Gambit and mirrored
legal standard-start examples exercise both colors. Ordinary defended pawn
exchanges with immediate recapture must not pass this operational offer test.
Test missing/nonstandard/late/terminal history, strict flags/budgets, EP semantics,
captures/promotions, exact exhaustion and enabled-parent preservation.

Independent checker imports neither detector nor its helper. Reconstruct legal
history and complete move/capture/reply inventories, balance and capture-victim
facts, current/incoming/preserved frames, selection indexes, timing and labels.
Mutation tests delete branches or alter material/recapture/history/counterfactual
facts. Guarded authored D001-test pilot <=32 cases, compressed proofs, full source
closure, source/diff and representative parent checks. Retain failures openly.

Deferred combined cumulative regression, exhaustive absence/priority/history/
budget/interaction/original-occurrence audit, exact main/repeat/initially clean
reproductions, real-game precision and teaching usefulness. E082 accepted tracker,
production and numerical research unchanged. General gambit taxonomy remains open.
