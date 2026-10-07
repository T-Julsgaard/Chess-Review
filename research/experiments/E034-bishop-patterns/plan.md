# E034: bishop diagonals and pawn-color patterns

Registered 2026-10-07 before evaluation. Import frozen E033; research only.

Name a fianchetto only for an actual bishop move from its ordinary home square
to b2/g2/b7/g7 behind its own b/g pawn advanced one or two squares. Say formation,
not first-ever development or strategic suitability. An existing second such
bishop may support factual double-fianchetto geometry, without opening naming.

An open diagonal requires an entire edge-to-edge bishop diagonal of length
>=5 with no other piece. A length-eight diagonal is a1–h8 or h1–a8; retain all
squares and exact geometric attacked-square set. Control means geometric attack,
not a legal capture promise for pinned bishops. Opening a diagonal additionally
requires a stationary bishop and actual removal/vacation of at least one prior
blocker from that exact line; full line must now be clear. No line-attack or
king-safety benefit asserted. Emit on bishop move or concrete line change,
not unrelated unchanged board facts.

Good-bishop pattern requires at least two own pawns, all on the opposite square
color to the bishop. Bad-bishop pattern requires at least two fixed central
c–f-file own pawns on its color and at least one directly blocking forward
diagonal; each fixed pawn is blocked forward by an enemy pawn. Describe the
pawn-color/blocking structure, not global strategic value or passivity.
Only emit when actual bishop/pawn move changes the pattern or bishop position.
Other pawn distributions abstain. No good-bishop-versus-bad-knight evaluation.

Authored home/flank preparation, wrong square/color/home, blocked/open short
and long lines, pawn clearance, same/opposite/mixed pawn colors, fixed/mobile
bad-bishop controls; rank/color reflection. Independent replay recomputes line
squares, all vacancies, bishop movement/identity, fianchetto pawn and complete
pawn-color/fixed-blocker witnesses without detector helpers. Tampering rejects.
Comments <=24 words; tactical warnings and proven tactics keep priority.

Guard D001 before dynamic fixtures. Pilot cumulative estimate <=180 sec and
<=3 MB retained evidence. Targeted cumulative tests and source integrity;
exact committed revision, normalized hashes, receipts/config/environment/time,
repeat and initially clean task-owned local checkout match. Definition metadata
only; no source games, positions or diagrams imported. All fixtures authored.

Coach expansion/live cutoff active; near 10% remaining checkpoint/commit,
disable heartbeat then authorized normal shutdown without /f. Numerical
research paused; no extension integration or push.
