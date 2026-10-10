# E144 frame metadata refinement

2026-10-10 after the cheap two-root smoke, before final cache/pilot. Preserve ALL
original nonplacement FEN fields in edited frames, not merely turn/clock. Chess
remove/put may update castling rights automatically; reattach the original fields
and explicitly validate them. Thus inconsistent rights/EP become unavailable
controls rather than silently changing a second variable. Authored smoke roots
have no rights/EP, so observed proofs/role hypotheses are unchanged. Bind the
refined collector source in final observations; no engine/tablebase recollection.
