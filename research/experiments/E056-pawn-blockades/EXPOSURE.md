# Authored development exposure

2026-10-07. D001 test preflight and guarded imports. No acquired games,
engine evaluation, numerical fitting or extension changes.

Before evaluation, review corrected draft queen/bishop roots that would have
already checked the nonmoving king, and a knight move with the wrong geometry.
First targeted execution then exposed an illegal authored rook move through
the pawn it should blockade. Move the rook horizontally onto that square.
One priority assertion assumed generic Check text, then any check message, but
guarded smoke showed the frozen parent correctly selects a certified queen
fork above both check and blockade. Compare the exact inherited selected text
and separately require the check event; do not rewrite priority to suit a test.
No definition, algorithm, priority or preregistered scope changed.

Added explicit terminal checkmate and stalemate negatives before decisive
evaluation. Pawn diagonal captures, capture of the blocker and inherited E055
direct-recapture guard are executed physically, alongside exact proof replay.
The inherited guard now explicitly covers a recapture that is itself a positive
mating offer. Other negatives cover pawn rams, mere control, stationary units,
unsafe king landing and the quiet 100-halfmove threshold. EP is exercised on a
non-blockade pawn move; a moved nonpawn resets EP availability, so this is not
a claim of a positive blockade with an EP reply.

Final target passes 119 tests across all 112 authored/reflected cases and seven
independent proof/regression groups. Cumulative E020–E056 passes 2,233 tests;
maintained source verification and diff check pass before source commit.
