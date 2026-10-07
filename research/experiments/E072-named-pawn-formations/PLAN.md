# E072: named pawn formations with legal support and recorded exchange

2026-10-07. Register before implementation and evaluation. Original list:
Maroczy Bind and Stonewall structure. Frozen E071, 3,860 ordered baseline cases.
Authored synthetic fixtures under D001 test guard; no imported games or positions.

formationTags boolean false; maxFormationNodes integer 0..50000, shared across
history, counterframes, legal captures and complete actual reply enumeration.
Disabled exact parent. Exhaustion atomically drops all new certificates, keeps
parent events/comment. No extension change, engine inference or push.

Stonewall: actual own pawn move newly completes fixed files c3/d4/e3/f4 (black
c6/d5/e6/f5). Every named pawn present; original before lacks the full pattern.
Certify each of c3->d4, e3->d4, e3->f4 (color reverse) by an independently legal,
live counterframe replacing the supported own pawn by an enemy knight, setting
own turn, clearing en passant and retaining rights/counters. Enumerate ALL own
pawn captures of the replacement, require the stated sources. Absolute pins and
illegal/nonmoving-king-check counterframes refuse the new comment. No strength,
unbreakable wall, attack success, opening sequence or intended-plan claim.

Maroczy: newly complete own c4/e4 (black c5/e5), actual pawn move onto one of
these squares, no own d-file pawn or enemy c-file pawn, common target d5 (d4
for black) empty. Require legal recorded history rooted with the identified own
d2 pawn and enemy c7 pawn (black d7/enemy c2). Track piece identities through
captures, en passant and promotions. One identified pawn must capture the other,
then itself be captured by an opposite-color nonpawn on the next ply at the same
square. Accept either capture order. Both original identities gone. No FEN-only
exchange inference. Verify both named pawns can legally capture a hypothetical
enemy knight on the common target in a legal live own-turn counterframe.
Black comment explicitly says Reversed Maroczy bind. Current control does not
make an enemy pawn break illegal or losing, establish permanent restriction,
space superiority or tactical safety.

Actual after must be live. Retain complete history/actual record, exact shape,
all legal support/control countercaptures, tracked exchange when applicable,
ALL full-history enemy replies including captures, en passant, checks, promotions
and terminals; record named pawn presence after each. Loss after a reply is
allowed: comments describe the actual position only. Each comment <=24 words,
qualityClaim false, priorities101.008/101.009 below urgent tactical events.
Independent replay imports no detector helpers; independently reconstructs fixed
files, scalar original-pawn paths, legal counterframes/capture sets, all replies,
terminal history flags and exact text. Horizontal reflection is a new-study
negative, never silently mirrors named files; color reversal remains positive.

Separate positives/negatives for both formations: each completion pawn, capture
completion, both exchange orders, missing/wrong original identity or recapture,
no history, already-complete shape/quiet unrelated move, file/rank impostors,
pins/checks, named-pawn capture/en passant/promotions/terminal replies, actual
terminal suppression, invalid moves/options, exact budget boundary, atomic
exhaustion, legal histories/repetition and tampered saved certificates.

Cheap pilot and retained exposure ledger, focused development tests then full
cumulative/source/diff gates. Freeze source; main/repeat/initially clean detached
reused verification checkout runs, exact revision/input/physical output/metrics,
all ordered inherited fingerprints and original list unchanged, independent saved
proof replay. Estimate ~300s/run, three overlaps; complete canonical evidence
prospective20MB. Retain misses without pruning or loosening gates. Track names
only after full verification; synthetic mechanics do not establish real-game
precision or teaching value. Follow existing local fast-forward integration rules;
no new branch/clone, numerical research, cutoff, shutdown or automation revival.
