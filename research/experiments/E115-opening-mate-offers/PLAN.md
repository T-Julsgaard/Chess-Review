# E115 opening offers with complete mating compensation

2026-10-09 prospective build-first batch, parent E114 4efe45c. Current main
user-authorized, research/local commits only/no push. Pending phase3 C0160 gambit,
C0161 accepted gambit and C0162 declined gambit share offer-history machinery.
Priority deviation past instructional principles C0139/C0141/C0143: these three
reuse existing E022 material certificates and E029 complete mate queries; general
opening advice requires separate quality/usefulness evidence. Countergambit stays
pending until its two independently supported offers can be demonstrated.

Require complete legal history from canonical standard initial FEN, total <=20
plies INCLUDING the actual move. Nonterminal actual position. For current offer
and immediately previous opponent offer, enumerate ALL legal material captures,
not only the last-moved piece; stationary offered queens must not be missed.
Use E022 certifyCapture and exact signed balance offset from before the offering
move: accepting must leave capturer strictly positive net nominal gain through
EVERY immediate original-offerer counterreply. No terminal accepting capture.
Then full E029 original-offerer mate policy at H after that accepting capture
must succeed. Store all failed candidates and exact baseline/capture/inventories.
This proves bounded mating compensation for a particular opening concession,
not intention, best play, general positional compensation or an overall forced
win when the opponent can decline. All broader gambit meanings stay in scope.

C0160: at least one current eligible mating-compensated concession. C0161:
actual move is exactly an eligible accepting capture from the preceding recorded
offer, with played post-position bound to its proof. C0162: incoming eligible
offer exists, but the actual move matches none of its eligible accepting captures.
Say "leaves the recorded offer untaken", not that the opponent consciously
refuses; preserve competing captures/offers and do not call a different accepted
eligible offer declined. All current/incoming rows retained in deterministic UCI
order, selected first applicable witness. Branches include full actual histories.

Interface openingMateOfferTags defaultfalse wraps E114; openingOfferMatePlies
integer0..4 default3, maxOpeningMateOfferNodes integer0..50000 default50000.
One atomic budget over material/mate/history and both panels; exhaustion drops
all new events/witnesses. Strict controls/history, disabled equality, <=24word
comments, qualityClaim:false. Preregister before evaluating authored opening
hypotheses (stationary queen offer after knight central capture, accepted queen
capture followed by short bishop/knight mate, alternative decline).

Focused both-side history/material/proof positives and negatives, full/missing/
nonstandard/late start, unrelated capture vs exact acceptance, compensation
failure/short bound, signed baseline/prior gain, terminal input, disabled/exact
atomic budgets, JSON and neutral proof/inventory/baseline/history/label mutations.
Independent saved checker recomputes material certificate truth for every legal
capture and replays full mate trees without candidate/solver imports. Cheap D001
guarded authored synthetic pilot, source/test/fixture dependency closure.
No acquired game, engine search or confirmation labels. Deferred cumulative
regression, exhaustive integration/absence/priority/history/budget/occurrence
audit, frozen changed main/repeat/initially-clean reproductions and real-game
precision/usefulness. Preserve accepted and earlier provisional evidence.
