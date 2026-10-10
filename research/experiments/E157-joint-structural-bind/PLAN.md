# E157 — joint pawn-contact and piece-activity restrictions

2026-10-10 prospective build registration. Parent E1563f03b7b; no E157 chess
query before registration. Current main authorized, research-only/local commits,
no push. Full catalog remains open. Claim C0303 only, a bounded structural-bind
comparison, not a complete long-term strategic judgment.

Compare actual quiet nonchecking pawn advance with a distinct legal quiet
nonchecking same-pawn alternative from the same genuine full-history root.
Complete enemy legal inventories follow each choice. Extend E152's profile
collector to include every legal pawn move alongside all N/B/R/Q moves, every
actor counterreply/state, pawn contact metadata and absolute-pin rays. Never
manufacture a turn or remove a piece to run a legality query.

Operational pawn-contact break: a legal pawn capture of an actor pawn, or a
quiet pawn move establishing a new geometric attack on an actor pawn. Existing
contacts alone, direct same-file pawn rams and arbitrary pawn pushes are not
contact breaks. A live unit-safe break has nonempty legal counterreplies and
the moved pawn (or promoted piece) survives every immediate counterreply in live
states. Retain all moves, including sacrificial/non-safe/non-contact options;
this metric does not establish the value or failure of voluntary pawn sacrifices.

Joint finding requires zero such safe contact breaks after actual versus at
least one after the alternative. Every lost safe break must be absent from the
actual legal inventory and independently traced to its moving pawn's absolute
pin: a lone enemy pawn between actor slider and enemy king. Alternative advanced
pawn lies on that ray and blocks the pin; actual pawn destination lies off it;
the lost pawn-break destination also leaves that ray. Pin geometry is metadata
only, checked from true after-position armies, not illegal-position searches.

Simultaneously every enemy N/B/R/Q unit must have no more live unit-safe options
after actual, at least two must strictly lose options and end with at most one,
and every lost safe option must remain legal but permit capture by the actual
advanced pawn on a newly controlled advanced-middle cell. Full option/capture
and refuting inventories retained. This compares a genuine pair of positions;
it may maintain an existing pin rather than newly create one. Any visited claim,
terminal/vacuous response or checking initial choice withholds the joint label.

Interface: default-disabled bindTags wraps E156 exactly; bindAlternative UCI,
maxBindNodes integer0..50000 default50000; optional independently admitted bindPanel.
Missing history/alternative yields explicit prerequisites; malformed inputs reject.
Atomic exhaustion, parent preservation, qualityClaim:false, <=24word event
bounded-joint-structural-bind. Ledger3+history length root;2 each initial choice;
2 each enemy profile;3 each enemy N/B/R/Q/pawn option;1 each actor counterreply;
wrapper adds3. Extra metadata is included in these states, no omitted searches.

Prospective authored positive: White Ka1 Bg1 Pa4 Pb4 Pe2 Ph4; Black Kb6 Ra8 Re8
Nc7 Ng7 Pa6 Pc5 Pe6 Ph5. Actual e4, alternative e3. Actual maintains Bg1/c5/Kb6
pin while e3 interrupts its ray. Alternative permits cxb4; actual forbids it.
Other contact a5/b4 is capturable. Actual e4 captures both knights' d5/f5 options;
after e3 those destinations survive every counterreply. All other unit counts
must also meet the joint gates; smoke tests this hypothesis before collection.

Controls: remove Bg1 (pawn break remains); add Black Pg5 (independent ...gxh4
break remains despite knight restriction); remove Re8 and Pe6 (piece escape
destinations remain despite pin). Both colors. Four smoke families; 14-case pilot
adds missing alternative/history and zero cap, both colors. Cache matching smoke
panels, retain failures/source snapshots and openly amend false hypotheses.
Soft400KB compressed evidence target. No acquired games/engine/tablebase;
D001-test preflight/guard receipts for all chess/evidence entrypoints.

Focused strict/disabled/history/positive/negative/budget/mutation checks,
representative parent checks, independent legal and saved witness replay, source
verification/diff checks now. Full cumulative suite, exhaustive catalog/priority/
history/budget audit and exact main/repeat/clean reproductions deferred to combined
freeze under BUILD-FIRST.md. General bind durability, useful sacrifices, further
turns, real-game precision and teaching usefulness remain open. Next C0300 should
compare recorded equal exchanges against a positional objective such as this
joint restriction, never merely rename a pawn-capture tactic strategic value.
