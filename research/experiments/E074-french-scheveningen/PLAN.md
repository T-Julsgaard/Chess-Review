# E074: French-type chains and history-proven Scheveningen control

2026-10-08. Preregister before implementation/evaluation. Original list French
pawn chain and Sicilian Scheveningen structure. Frozen E073: 4,232 ordered
baseline cases. Authored synthetic fixtures under D001 test guard; no games copied.

centerTags boolean false; maxCenterNodes shared integer 0..50000. Disabled exact
E073; atomic exhaustion drops new events and preserves parent comment/events.
Actual own pawn move must newly establish the core; after live. Fixed files:
color reversal positive, horizontal reflection new-study negative. <=24-word
comments, qualityClaim false, priorities101.012/101.013 below tactical warnings.
No implicit parent flags, engine search, opening identity or strength inference.

French-type chain supports either actor: own d4/e5 against enemy d5/e6 (advanced),
or own d4/e3 against enemy d5/e4 (base), all color-relative. Both support links
must be certified by legal live opposite-knight replacement counterframes,
supporting-side turn, en passant cleared, rights/counters retained, ALL legal
target pawn captures saved. Opposing pawns on each d/e file form two rams.
In explicit own/enemy-turn same-board legal live counterframes with EP cleared,
save ALL legal moves of named pawns and prove no same-file forward move exists.
Other pawns/pieces allowed; pins/check evasions/illegal counterframes reject new
labels. Standard white advanced/black base says French-type pawn chain; opposite
color/role says Reversed French-type pawn chain. Text states own support, enemy
chain and both pairs blocking forward advances, not immobility of all pawns,
opening provenance, attack success, bishop weakness or permanent closure.

Scheveningen: own d3/e3 (black d6/e6), enemy e5 (black owner: white e4), no own
c-file pawn or enemy d-file pawn, newly completed by actual own pawn move.
Require recorded history rooted with original own c2 pawn/enemy d7 pawn (color
reverse c7/d2). One must legally capture the other as a pawn, followed on the
next ply by opposite-color nonpawn recapture on the same landing square. Both
identities gone; either exchange order, en passant included, track captures and
promotions. No FEN-only historical inference. All four forward targets c4/d4/e4/f4
(reverse c5/d5/e5/f5) empty; every named core pawn's legal countercapture must
exist in live opposite-knight own-turn counterframe, with all extra legal target
captures retained. Text names Sicilian Scheveningen structure for black and
Reversed Scheveningen structure for white, four controlled squares and recorded
c-pawn/d-pawn exchange. No safe center, space superiority, successful breaks,
winning counterplay or prohibition of an opponent's pawn move.

Evidence: full validated legal history/actual, exact own/enemy core, targets/rams,
complete support/control countercaptures, French pawn-turn legal sets, recorded
exchange for Scheveningen, ALL full-history enemy replies with inventories/core
presence, checks/mates/stalemates/draw/gameOver, captures/promotions/EP/shape loss.
Reply loss and terminals are allowed: text describes current position. Independent
saved replay imports no detector helpers, reconstructs geometry/ram blocking,
legal counterframes/capture/move sets, scalar original-pawn paths/exchange order,
all full-history replies/flags and exact text. Tampered sets/history/text fail.

Separate positives/negatives: both French roles/colors, each completer/capture,
wrong files/ranks/colors, absent supports/context, pinned own/enemy support,
occupied control target, false FEN-only/wrong original identities/delayed exchange,
both exchange orders/EP, extra legal capture sets, actual terminal, captured core,
promotion/terminal defenses, actual EP replies, clock/history, unrelated/already
complete moves, illegal moves/options, exact budget boundary/atomic exhaustion.

Cheap pilot and exposure ledger; focused then full cumulative/source/diff before
source freeze. Exact main/repeat/initially clean detached reused checkout runs:
revision/input/physical output/metrics, all inherited ordered full fingerprints
and original list unchanged, independent saved replay. Estimate~250s/run, three
overlaps; canonical evidence prospective20MB. Retain misses and do not loosen
legality gates/budgets or prune proofs. Track names after full verification only;
exposed synthetic mechanics do not establish real-game precision or teaching value.
Reuse branches/checkouts/local fast-forward integration under AGENTS; no push,
extension/numerical research, cutoff/shutdown, automation revival or agents.
