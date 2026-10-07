# Prospective source-inspection correction

2026-10-08, before E076 detector implementation or fixture evaluation. Inspection
of E021 features.mjs reveals two differences from the initial protocol's account
of existing machinery. Retain the original PLAN; correct these definitions now.

1. E021 flank groups are **abcd** and **efgh**, not abc and fgh. Reuse those
   four-file halves. Text names a–d/e–h explicitly; d/e pawns are included, not
   excluded. Save every contributing square/count. Add d/e-boundary transfer
   cases and central-pawn contributors rather than silently omitting them.
2. E021 passed-pawn lists apply an immediate **legal en-passant vulnerability
   exclusion** to otherwise geometric passers. Preserve this stricter rule:
   same/adjacent-file opposing pawns ahead block a passer, and a pawn removable
   by a currently legal EP capture also does not count. Save all legal EP moves
   and exact off-destination victims at each snapshot, independently replay them,
   and attach relevant captures to each pawn classification. A pinned illegal EP
   attempt does not exclude its geometric passer. Other pins/piece blockades do
   not alter geometric classification, and no promotion/safety promise follows.

Reuse E021 helpers on an explicit EP-cleared snapshot to obtain geometric lists
and army data, then apply the preserved EP guard using the original legal board.
The evidence retains both the original FEN and complete legal EP capture set.
Charge that explicit EP-set query as an extra snapshot work unit when an EP field
is present. Replayer derives geometry and legal EP exclusion independently.

No failures or results prompted this amendment, and no acceptance gate is
weakened. This corrects an inaccurate description of the reused source before
testing. All scope preservation, negative cases, inherited fingerprints,
independent replay, final cumulative tests and exact reproduction gates remain.
