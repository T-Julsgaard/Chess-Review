# E093 forcing repetition and stalemate resources

Registered 2026-10-09, build-first provisional research; default-disabled drawTags
wraps E092. drawModes nonempty distinct array of repetition/stalemate (default
both); drawPlies integer1..9 default3 after actual move; maxDrawNodes0..50000.
Atomic exhaustion retains parent and clears every new proof. Full legal history
is mandatory for using prior repetitions; FEN-only queries start with one
occurrence. No engine, extension or numerical research. Reuse E024 history,
E020 legal/material helpers and E029 existential/universal search conventions.

Repetition policy: actual checking move; every defender legal reply covered;
on actor turns select a legal checking move; goal is actual three equal
position keys with ACTOR to move, retaining turn/rights/legal EP. Opponent-side
threefold opportunity may be declined, so search continues it; never label a
claim opportunity an automatically awarded draw. Checkmate, other draw types
and depth limit refute this particular goal. All selected actor checks and
all enemy branches retained; negative trees contain complete actor failures
or one complete enemy counterchoice. Bound is not an infinite checking proof.

C0365/C0466/C0723/C0949: this finite all-defense checking-to-actor-claim strategy,
not merely an observed cycle. C0465/C0625/C0735/C0950/C0982: same strategy when
actor had a strict declared nominal deficit; checking-fortress subset only,
general static fortresses/enduring defense unproved. C0827: verified available
repetition/stalemate resource, never inferred intention or optimal draw choice.
C0468/C0626/C0948: stronger all-defense actor-stalemate policy after a played
nonking positive-cost offer with at least one legal capture of that moved
unit; actual capture not assumed. Existing conditional stalemate evidence stays
unchanged and is not recollected merely to expand these accepted IDs.
C0746 fortress construction, perpetual attacks and tablebase/full drawn-position
classification stay pending with prerequisites; no invented geometry-only proof.

Focused both-color forced cycle/history and forced sacrifice stalemate examples,
king escapes/declined captures, exact rights/EP/count keys, FEN-only horizon,
strict controls, disabled equality, terminal guards, atomic budgets and focused
independent positive/refutation legal-tree replay/tampering. Guarded synthetic
D001 pilot, source verification and diff checks. Defer full cumulative suite,
complete saved semantic/absence replay, priority/history/budget interactions,
exact main/repeat/initially-clean reproductions, scope audit and real-game
usefulness to combined frozen validation. Canonical accepted tracker unchanged.

Preserve all broad original scopes and accepted mechanics. Completed checked
commits fast-forward into shared clean local main per confirmed human workflow;
never push, switch shared branch, reset or discard work. Shared main95df698 at
registration boundary; existing isolated checkout/branch retained.
