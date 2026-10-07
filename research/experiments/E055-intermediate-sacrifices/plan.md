# E055: history-confirmed sacrifice instead of an available recapture

2026-10-07. Frozen E054, research only. Cutoff/shutdown cancelled, numerical
research paused, no extension or push. Original list unchanged. Authored
synthetic E030 seeds/new histories/variations only; definition metadata, no
source boards/games/FENs/sequences. Commit protocol before evaluation.

Opt-in intermediateSacrificeTags defaultfalse exact parent. Requires existing
positive mating-sacrifice certificate with complete all-defense mateIn2 or3.
maxIntermediateSacrificeNodes integer0..50000 default50000 shared timing budget;
exhaustion removes ALL new labels and retains parent facts. <=24 words,
qualityClaim false; no surprise, expected/mandatory recapture or best-move claim.

Full canonical history must end in an enemy capture of an own nonking unit,
with that same capturer still on its landing square (promotion identity
tracked). EP victim square may differ from landing square. Enumerate EVERY
original legal own capture of that capturer; at least one required. Actual
positive-cost sacrifice is a DIFFERENT move and does not take that capturer.
All original legal own moves must be nonmating: refuse a new teaching label
when immediate mate was already available. This avoids praising needless
delays; existing warnings retain priority. No claim recapture happens later
when the actual continuation ends in mate.

Store full last-capture/actual/recapture move records, victim and current
capturer identities, exact original legal move set, full history length,
canonical before/after FENs, nominal cost and mate bound. Reference the full
same-row mating-sacrifice event, preserving every legal defense/continuation
and shorter-failure proof. No detached reference may count as a certificate.
Independent replay imports no detector helpers; reconstruct history/EP/promo
and legality, every original move/no-mate and complete recapture set, different
actual offer, full parent mate proof and exact short text. References resolve
only a unique same-row parent with matching board/move.

Cases rook/queen/exchange offers following a capture with legal recapture,
multiple recapturers, last EP capture/promotion where legal, insufficient or
older/noncapture history, exact counter mismatches, missing/illegal recapture,
actual direct recapture, available mate in one, missing helper/refuted mate,
disabled/exhausted prerequisite/new budgets and tampered proof/move sets.
Support inherited mate2/3 certificates; record which bounds fixtures actually
exercise rather than claiming observed mate3 coverage from mate2 examples.

Guard D001 test receipt before fixture imports. Cheap smoke/sample, cumulative
E020–E055 tests/source/diff. Source committed before main/repeat/initially clean
clone; exact revision/normalized inputs/output hashes/metrics, saved independent
JSON replay, frozen ordered E054 fingerprints and unchanged original-list hash.
Compact E053 demo, full certificates below3MB. Estimate ~180 seconds per full
run, overlap three. Synthetic mechanics; real-game precision/human value unknown.
