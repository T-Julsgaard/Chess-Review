# E045: pawn-supported named mating patterns

Date: 2026-10-07. Research only. Usage cutoff and shutdown cancelled.

Question: can short named mating comments identify exact pawn support and
knight/rook flight roles, while refusing superficial lookalikes?
Baseline frozen E044. No engine, production or rating edits. Original list intact.

Opt-in supportedMateTags boolean default false preserves exact parent result.
maxSupportedMateNodes integer 0–50,000 defaults 50,000; shared classification
budget drops ALL new tags on exhaustion. Only actual checkmate and sole checker
being the actual moved-to unit qualify. No forcing-sequence claims.

Damiano profile: queen on relative h7 protected by pawn g6, enemy king g8/h8;
also accept horizontal file mirror a7/b6, king b8/a8. Lolli profile: queen on
relative g7 protected by pawn f6, enemy king g8/h8; horizontal mirror b7/c6,
king b8/a8. Relative ranks reflect color. Restrict pawn forms; no bishop variant,
castling-history, opening or historical-player claim.

Hook profile: adjacent checking rook, noncorner enemy king, knight protects
rook and controls at least one vacant adjacent flight outside rook coverage;
own pawn protects that knight and at least one adjacent enemy unit self-blocks.
Retain full actual checker/helper/pawn records, support squares, unique knight
flights and all adjacent enemy blockers. Pawn need not cover a separate flight;
its explicit job is protecting the knight. Generic rook-knight mate alone fails.
All helper attack geometry uses a king-removed flight board explicitly described
as geometric, while actual terminal mate is separately checked legally.

Authored synthetic positives, colors and horizontal mirrors; missing pawn,
missing knight, alternative bishop/knight support, wrong rank and central queen
mates as refutations. Disabled/zero/exhausted budgets, malformed settings,
certificate tampering and full history/FEN consistency guarded. Comments <=24
words, warnings retain priority. No registered game or source diagram imported.

Commit plan before exposed smoke; log failed authored hypotheses without
rewriting protocol. Run cumulative E020–E045 tests, source verifier, independent
saved JSON replay, exact main/repeat/initially clean clone hashes and unchanged
inherited full-result hashes. Retain guarded D001 receipt. Expected ~80 seconds
per ~1,120-case run, three overlapping runs; compact full evidence <3 MB.
Success establishes authored mechanics only, not real-game precision, human
benefit or readiness for extension integration. Local commits only.

Exposed smoke note: initial corner queen starts already checked the non-moving
king and were refused by legal-position validation. Move the authored queen
start to b7. The initial Hook blocker h7 pawn could legally capture the rook
on g6, refuting mate; replace it with an authored h7 knight that blocks h7
without that capture. The initial bishop-helper negative put a bishop on the
queen's route; use g6 bishop support instead. The initial central queen pattern
left f7/h7 open and was not mate; explicit enemy pawn blockers make the intended
central-mate negative true. All 60 exposed tests now pass; none of the detector
gates were weakened. These corrections are fixture design, not confirmation.
The originally refuted h7-pawn blocker is additionally retained as an explicit
negative fixture in both colors and file mirrors. This adds four tests/cases
(64 new tests). The earlier cumulative pilot began before this extra fixture;
its output is superseded, and rerun after the revised fixture inputs stabilize.

Scope addendum before decisive evaluation: the dedicated ChessWorld Lolli page
explicitly describes both f6 and h6 advanced pawn support for Qg7#, including
file-mirrored queenside endings. Add the equally verifiable h6/a6 supporting
pawn variant and authored g8/h8 endings in both colors/file mirrors (eight more
cases/tests, 72 new tests). Existing gates stay intact; terminal support is
proved directly. Repeat targeted and cumulative verification after this change.
