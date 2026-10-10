# E130 — provisional timely castling and pawn-delay comparisons

2026-10-10. Preregistration cb1eaad, parent E129 fe86df0. Authorized current
main, local research commits/no push. Accepted tracker, numerical research and
production unchanged. Candidate occurrences C0141/C0143/C0856 retain broader
strategic advice, global necessity and enduring king safety as unresolved work.

Default-false castlingTimingTags; strict maxCastlingTimingNodes integer0..50000
default50000. Disabled exactly E129; independent atomic extra exhaustion retains
parent events/comment, including an enabled knight-tempo proof. No material cap
or implicit enabling of parent flags. Actual live castle or quiet nonpromoting
pawn move; full legal history retained when supplied. Early window explicitly
means standard initial history with at most20 prior plies. Missing/nonstandard/
late history cannot support opening claims but may support the general warning.

Complete root legal inventory and every legal castle/quiet pawn alternative
retained. Each panel enumerates all legal enemy replies with child FEN, mate and
draw flags. Live safe castle means no enemy mate in one, not general safety.
Pre-existing threat is a fresh opponent-turn frame of the before placement,
EP cleared and counters retained, independently validated: not a legal actor
pass. Actual/alternative panels retain actual full history. Pawn warnings also
require the same mating UCI after restoring only that pawn on the after frame.
This distinguishes a delay that ignores an existing threat from E121's newly
created weakness and avoids alleging that the pawn move has no other purpose.

Authored e4 e5 Nf3 Nc6 Be2 Bc5 Nc3 Qh4: O-O removes every enemy mate in one;
a3/a4 leave Qxf2# available, including after pawn restoration. g3 removes the
threat and receives no warning. Black mirror likewise passes. All legal pawn
alternatives, including protective g3, remain in the proof. Standard history
boundary20 passes;22-prior-ply castle abstains, pawn only gets general warning.
Missing/nonstandard history, no castling rights, no prior mate, quiet nonpawn,
captures, promotion and actual mate terminal negatives retained. Pawn delay
positive uses639 nodes; exact639 passes and638 exhausts atomically.

First smoke failed because the vendored Move has separate castle-side methods
but no isCastle method, despite its deprecation comment naming it. Changed to
actual supported methods. Initial focused run failed four authored fixtures:
both knight cycles before an irreversible move caused third starting-position
repetition in the three long histories; promotion pawn g7 already checked Kh8.
Interleaved h-pawn moves between cycles and relocated promotion enemy king h6.
Added pawn-capture negative. No scientific predicate or claim was weakened.

Final42 focused checks pass in37.0seconds; three representative E129 disabled/
strict/history checks pass in0.6seconds. Source verification and diff checks
pass. No cumulative suite, engine searches, acquired games, holdouts or long
historical recollection. Guarded D001-test authored pilot22cases:9positives,
2expected budget exhaustions. Independent saved semantic replay passes all9
witnesses and138 normalized source/fixture/parent hashes. Checker imports
neither candidate nor its panel helper; reconstructs full history, all root
alternatives and reply children, prior/restored frames and exact labels.
Missing inventory/reply, mate flag, history, clock, turn, restoration, safe/
delay/common lists, early/terminal and label mutations are rejected.

Retained evidence copied from research/runs/E130/final to evidence/results.json.gz
and evidence/run.json. Actual revision, environment/argv, null engine/seed,
guarded receipt and full source hashes retained. Plain797319bytes,gzip62525.
Packed SHA256 b1b356f7c819716e6e9ab08ed328e35176d00d9e6d78fea366130710d58b6125;
plain cdd1d4891643710ea6357217b08bbb0ae9f0ae17362afe119afe4ce886a21123.
Replay: node research/experiments/E130-castling-pawn-delays/code/replay-saved.mjs

Accepted E082 unchanged378/1085(34.8%). Build311 provisional original entries,
51ready/0stale batches;689 accepted-or-candidate(63.5%),396without ready code.
Deferred full combined regression, exhaustive absence/priority/history/budget/
interaction/original-occurrence audit, exact main/repeat/initially clean
reproductions, real-game precision and teaching usefulness. Complex alternative
terminal/repetition histories, queenside-castle and longer-horizon matrices need
combined checks; absence of mate in one does not imply a good move.

Next unused E131: remaining quantified opening/position/defensive-outpost or
finite rook families. Preserve explicit taxonomy and full-outcome prerequisites
rather than claim strategic understanding from geometric descriptors alone.
