# E058: wrong bishop, rook pawn and legal promotion-corner access

2026-10-07. Research only, numerical goal paused, usage cutoff/shutdown cancelled.
No extension changes, remote pushes or external games. Original list unchanged.

Opt-in wrongBishopTags identifies exact pure K+B+one a/h pawn versus bare K,
with bishop color opposite the pawn's promotion corner. The comment explains
that the bishop cannot control that square. A second label requires the
defending king already there or an actual legal immediate king move there.
Complete legal next moves preserve pawn/bishop captures. No drawn-ending,
permanent-fortress, best-move or strategic-result claim. Default-disabled and
exhausted profiles preserve frozen parent facts. Full canonical history,
material, identities, colors, every reply, corner moves and exact short text
are independently replayed; altered or omitted evidence fails.

Selected examples:

- “Wrong-colored bishop: bishop b4 cannot control a8, the promotion square of pawn a6.”
- “Wrong rook pawn: bishop b4 cannot control a8; ...Ka8 is legal now.”
- “Wrong rook pawn: bishop c3 cannot control a8; occupied by the defending king.”

Authored setup errors/exposures recorded in EXPOSURE.md, including an incorrect
assumption that Kb6 controls a8 and roots that already checked nonmoving kings.
Legal Kc8–b7 approach denial is exercised, not an invented adjacent-corner
denial. Capture transitions into pure material, both files/colors, actual
defending king moves, distant king, captures of pawn/bishop, promotion and
actual mate/stalemate/dead/clock endings tested. No geometry-only draw inferred.

Final target110 tests, cumulative E020–E0582,446 tests all pass. Maintained
source verification/diff pass. Full run2,236 cases:2,166 with facts,48
abstentions,22 refused illegal moves; selected comments<=19 words. Independent
cumulative replay4,483 certificates,288 queries,13,571 reply/history edges and
34,196 leaves. New classification644 nodes; inherited trap checks8 on new
cases. No engine evaluation, numerical fitting or human-outcome measurement.

Initial clean run at904d3d9 succeeds with empty working-tree status. Original
main/repeat fail before writing evidence after another activity switches the
shared checkout to66a4256 and research inputs disappear. Leave that branch
untouched. Replacement main/repeat run in the existing isolated local clone
on codex/coach-concepts-e058-evidence at exact same source904d3d9. Successful
main/repeat/clean all match source, normalized inputs, physical output hashes
and metrics;173–193 seconds. Saved-JSON verifier reconstructs72 new labels on
44 positive rows:44 wrong-color,28 corner. Complete evidence has404 reply
references,40 legal corner-move references,16 occupied-corner references,
12 pawn captures,four bishop captures,eight full histories. All56 legal
names-absent rows/four illegal moves checked. Corner entry, illegal king
approach, pawn/bishop captures and terminal results physically executed.
All2,132 inherited full-result fingerprints match E057 in order; original-list
hash unchanged. Full evidence2,911,401 bytes<3MB, all proofs retained.

Coverage282 verified names/322 original occurrences,76 partial,687
unimplemented. New names Wrong-colored bishop and Wrong rook pawn within the
stated pure-material/color/corner-legality scope. Human teaching benefit,
real-game precision and extension readiness remain unmeasured.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md),
[results](evidence/results.json), [main](evidence/run.json),
[repeat](evidence/repeat-run.json), [clean](evidence/clean-run.json).
Reproduce: `node research/experiments/E058-wrong-bishop-rook-pawn/code/run.mjs --out research/runs/E058/reproduction`.
Guarded D001 test receipts retained.

Next:E059 investigate self-blocking pawns and current blocked pawn positions,
with exact before/after occupancy and complete legal pawn moves, including
captures. Distinguish current forward restraint from permanent immobility or
strategic weakness. Continue in isolated research checkout while the shared
checkout remains on another branch.
