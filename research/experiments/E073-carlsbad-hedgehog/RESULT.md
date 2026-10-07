# E073: verified Carlsbad and Hedgehog mechanics

Completed 2026-10-08. Research-only opt-in comments for **Carlsbad structure**
and **Hedgehog structure** from the unchanged original list. Names describe the
current pawn structure; no opening sequence or historical pawn identity is
inferred. `structureTags` defaults false and returns exact E072 when disabled.
`maxStructureNodes` is a shared integer budget 0..50000; exhaustion atomically
discards new certificates and preserves the parent events and comment.

Carlsbad requires own d4/e3 against enemy c6/d5, color reversed for black;
exactly one own pawn on each a/b/d/e/f/g/h file and enemy pawn on a/b/c/d/f/g/h,
with other pawns on their side's relative ranks 2..4. An actual own pawn move
newly establishes this shape, including capture completion. Both support links
own e3->d4 and enemy c6->d5 are independently proven by legal captures in explicit
opposite-knight replacement counterframes. Counts show own two versus enemy three
queenside pawns and own four versus enemy three kingside pawns. Example:

> Carlsbad structure: e3 supports d4 against c6/d5; your queenside pawns number two versus three.

Hedgehog requires own a6/b6/d6/e6 with enemy c4/e4 and no own c-file or enemy
d-file pawn. White uses the explicit reversed shape a3/b3/d3/e3 against c5/e5.
An actual pawn move newly completes the fixed core; all six forward targets are
empty. Every named pawn controlling each target must have its independently legal
capture in the explicit opposite-knight own-turn counterframe. Other legal target
captures are retained too. Example for black:

> Hedgehog structure: a6/b6/d6/e6 control a5/b5/c5/d5/e5/f5.

White says **Reversed Hedgehog structure**. Illegal counterframes, absolute pins,
wrong/missing files, occupied control targets, wrong ranks/colors and preexisting
unrelated moves refuse new labels. Actual after must be live. New comments are
at most 24 words, `qualityClaim:false`, priorities 101.010/101.011 below urgent
tactical warnings. No successful minority attack/break, permanent weakness,
strategic superiority, pawn-break prohibition, safety or player intent is inferred.

Certificates retain complete history/actual, before/after inventories, fixed
core, side counts, all legal countercaptures and every full-history enemy reply.
Replies include new inventories/counts, shape/core loss, captures, promotions,
check/mate/stalemate/draw/gameOver. A reply may destroy the structure or end the
game: comments describe the actual position, not permanence. Mating warnings
remain selected over structural annotations in authored terminal-reply cases.

The initial focused count check failed: expected eight Hedgehog attack edges,
actual seven. [AMENDMENT.md](AMENDMENT.md) prospectively corrects the arithmetic:
the a-pawn has one attack edge, the b/d/e pawns have two each. All six targets,
every required geometric source and all legal captures remain mandatory. The extra
f3/g3 probe has nine captures. No legality gate or budget was loosened. Original
plan and failed count retained in amendment/[exposure](EXPOSURE.md).
Qualifying core moves cannot produce immediate en passant in these subsets;
a legal en-passant reply after a nonqualifying double push is an explicit negative.

Frozen source **093dacb4ee1b2e919d03b7603949624dd2c19ba9**. Corrected focused
**210 tests** passed in 7.3s; full cumulative **4,546 tests** passed in 109.6s.
Maintained source and diff checks passed. Main/repeat/initially clean detached
runs all exited 0 and matched exact revision/input/physical output/metrics,
durations 239488/241510/241010ms. All **4,028 ordered E072 full-result fingerprints**
and original concept-list hash unchanged. Full corpus: 4,232 cases, 3,982 with
facts, 160 abstentions, 90 invalid moves; longest selected comment 21 words.

Independent saved-proof replay imports no detector helpers and reconstructs
inventory/file counts, current shape, every legal replacement capture and all
full-history replies. **42 positive certificates**: 20 Carlsbad and 22 Hedgehog;
154 legal negatives and 8 invalid moves across 204 new cases. Replayed 510 replies,
198 countercaptures, 4 history plies, 16 promotions, 6 terminal replies and
84 shape losses. Tampered inventories/counts, targets, required/extra capture
sets, history, reply sets/flags and text fail replay. Across full corpus: 7,235
certificates, 288 query proofs, 26,029 reply edges and 52,948 continuation leaves.
New structure budget consumed 1,314 counted nodes. Canonical evidence 5,522,555
bytes, within the prospective 20,000,000-byte budget.

[Results](evidence/results.json), [demo](evidence/demo.html),
[tracker](evidence/concept-status.md), and main/repeat/clean manifests retained.
Progress is computed by `npm run research:status`; checked names state these
explicit mechanics subsets. Synthetic development exposure does not establish
real-game precision or teaching value. Exact shape, missing-context/history-free
naming choices and legal-counterframe requirements can abstain on other valid
named structures. No extension integration or numerical scoring change.

Next **E074**: investigate French pawn chain and Sicilian Scheveningen structure
from the list, verify primary naming definitions, and preregister current support,
ram/control and context gates before implementation. No inferred opening or
successful attack/break. Reuse stable local branches/checkouts; no push, numerical
research, cutoff/shutdown, automation revival or agents.
