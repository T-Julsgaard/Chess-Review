# Prospective E078 source and work-unit clarification

2026-10-08, before implementation/evaluation. E021 exposes Q–R, Q–B and R–R
adjacent unobstructed pairs. Validate every adjacent reused-family edge of the
new maximal group against those exact source arrays. Q–Q/B–B are explicit new
families; a middle compatible slider extends the group rather than disappearing
from an allegedly empty gap. Identity-mapped equality includes orientation and
all member square/type pairs; changed bounds alone do not form a new group.

Deterministic work units: root reconstruction 1 plus each history ply; root legal
query 1; each full frame 1; four ray walks per own bishop per frame; each of 46
maximal board lines (8 ranks, 8 files, 15 of each diagonal orientation) 1 per
frame, including length-one edge lines; each new event 1. Snapshot library
internal loops are not additional work units. Atomic budget and every original
live/legality/completeness/negative/reproduction gate remain unchanged.
