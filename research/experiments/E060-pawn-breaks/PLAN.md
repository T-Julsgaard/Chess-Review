# E060: pawn breaks with complete next-turn witnesses

2026-10-07. Frozen E059 in isolated checkout. Original list unchanged; numerical
goal paused. Cutoff and shutdown cancelled. No extension changes or pushes.
Authored synthetic fixtures only; rule metadata, no external example positions.

Question: can short Pawn break comments identify an actual ram challenge or
removal with exhaustive legal next-turn evidence? No general advantage claim.
Opt-in pawnBreakTags defaults false, preserving exact E059 result. Shared
maxPawnBreakNodes integer 0..50000 defaults 50000; exhaustion drops ALL new
labels and preserves parent facts. Live legal history and actual result required.

Three bounded profiles for pawn-break:
1. Challenge: actual straight pawn advance newly attacks enemy pawn immediately
ahead of an unchanged own pawn. Every legal enemy reply must remain live and
preserve that own ram pawn; either the enemy blocker vacates its square, or the
actual moved pawn has a legal capture of that blocker next turn. Complete
legal replies and capture subsets retained, including pin/check constraints.
2. Release: actual pawn capture removes an enemy pawn immediately ahead of an
unchanged own pawn AND leaves its forward square empty. Ordinary captures
replace the blocker with the capturing pawn, so cannot satisfy this profile;
en passant can. Every enemy reply stays live, preserves the released pawn and
permits a legal straight single-step next turn. Retain promotion alternatives.
3. Escape: actual pawn was rammed against an enemy pawn before its diagonal
pawn capture, and is no longer rammed on its new file. Every enemy reply stays
live, preserves that pawn and permits a legal straight single-step next turn.

Full before/after FENs, actual move, original own/enemy pawn identities, captured
square (including off-landing EP), every legal enemy reply and complete relevant
legal own captures/advances. Independent replay imports no detector helpers,
reconstructs strict full history, all sets and exact short text. <=24 words;
qualityClaimfalse, priority101.3 below urgent tactics and fixation101.4.
Selected short text checked, not just presence of lower-priority events.

Authored central/edge, single/double advance, enemy captures breaker/ram pawn,
blocker advance/capture, pawn pins and checks, EP with legal history, ordinary
capture replacement, original/no-new attack, wrong unit/file/color/direction,
terminal results/replies, illegal moves, no ram, disabled/zero/midway exhaustion,
tampered identities/move subsets/FEN/text. Horizontal/color variants.
Guarded D001 loader before fixtures; target smoke then E020–E060/source/diff.
Commit source before main/repeat/initially clean clone (~200s each, overlap3).
Exact source/input/output/metrics match, ordered E059 full fingerprints and
original-list hash unchanged, independently replay saved JSON. Full proofs
<3MB with frozen E053 compact demo. Real-game precision/teaching benefit unknown.
