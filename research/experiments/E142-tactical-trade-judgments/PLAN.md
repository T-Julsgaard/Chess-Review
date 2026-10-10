# E142 — tactical trade judgments from complete mating comparisons

2026-10-10 before implementation/evaluation, parent E141ea1e96e. Authorized
current main, research-only commits/no push. BUILD-FIRST.md focused development;
no cumulative tests or engine searches. Previous turn made progress: E141 committed
four genuine tablebase scopes. D001-test preflight passed on resumption.

Queue deviation: C0467 sustainable nonchecking perpetual attack still needs an
all-defense recurrence policy and actual draw/history semantics. Named rook
defenses need larger material/subtable closure and sustained defense evidence;
KQK observations cannot discharge them. Move to compatible common-coach trade
judgments C0039/C0040/C0045/C0046 with reused legal/history/mate proof machinery.
Do not count nominal material or one line alone as strategic quality.

Default-false tacticalTradeTags wrapper around E141, strict maxTradeNodes integer
0..50000 default50000 and tradeMatePlies0..2 default1. Reconstruct explicit full
legal history, require last opposing capture of a nonpawn unit. Enumerate EVERY
legal current move; classify completed exchange only if current nonpawn unit
recaptures that capturing unit on its arrival square. Require equal nominal
values of the two exchanged units, excluding promotions, pawns and kings as
exchanged victims. Alternatives include nonrecaptures, even captures elsewhere;
call them keeping the exchange incomplete, not necessarily quiet moves.

For each legal option retain two finite complete mate queries, actor/opponent,
at the SAME remaining-ply bound. Exact mate distance is not needed. Unproved
means unresolved within bound, never draw or safety. Preserve full history in
queries. If any evaluated proof reaches repetition/fifty-move claim context,
abstain atomically as claim-rule-prerequisite. Budget exhaustion clears witness
and all added labels, retaining parent events/comment. No hidden launches.

C0039 tactical-good-trade: actual equal-value recapture proves actor mate and
at least one nonrecapture proves opponent mate. C0040 tactical-bad-trade: actual
equal-value recapture proves opponent mate and at least one nonrecapture proves
actor mate. C0045 tactical-trade-while-ahead adds pre-exchange nominal advantage
context to good trade. C0046 tactical-keep-while-behind: actual nonrecapture proves
actor mate, another equal-value recapture proves opponent mate, and actor was
nominally behind BEFORE the initiating capture. Material is descriptive context,
not proof that an advantage/deficit caused the result. Every proof quantifies
defenses, but other unresolved legal alternatives remain explicitly unresolved.
No shortest/best move, general positional trade, long-term outcome, initiative
or usefulness claim. Every original broader occurrence remains open.

Prospective authored hypotheses (not results): White Kg1,Qh5,Bg6,pawns f2g2h2,
Rh7 versus Black Kh8,Qe3,Rh6, Black Rh6xh7 then White Qh5xh7 mate, versus Qh4
allowing Qe1 mate. Second: White same king/queen/bishop/pawns, Rg5 versus Black
Kh8,Qe3,Rg4,Ra8,Na6,Ph7, Black Rg4xg5 then White Qh5xg5 allowing Qe1 mate,
versus Qh5xh7 mate. Also actual keeping move Qxh7 in the second root. Construct
FENs mechanically, preserve illegal/failed hypotheses, make dated adjustments
after exposure rather than rewriting this registration. Reflect colors/ranks;
negative missing history, short bound, nominal context, nonexchange, strict and
atomic budget controls. Initial pilot <=12 authored cases, seconds-scale only.

Independent saved checker imports Chess and the existing independent mate-tree
checker, never the detector/query/search helper. Rebuild complete option inventory,
history, exchange records and balances; verify both proof trees and exact labels.
Source/fixture/plan/dependency hashes and guarded D001 receipt retained in small
compressed pilot. Focused checks plus representative E141 parent compatibility,
saved semantic replay, source verification and diff checks. Combined cumulative
regression, exhaustive interactions/original occurrence audit, exact reproductions
and real-game precision/usefulness deferred. Accepted tracker/production unchanged.
