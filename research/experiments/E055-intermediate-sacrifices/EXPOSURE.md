# Synthetic development exposure

2026-10-07. D001 test preflight/guard before fixture import. No acquired games,
engine evaluation, numerical fitting or extension changes.

Initial local import failed because relocating a king serialized a temporary
kingless board between edits. Relocation now edits one Chess instance before
serializing. First guarded smoke then replayed all emitted new certificates.
Two authored fixtures had illegal intended moves: adding Ne6 blocked Qd5–g8,
and Pg7 blocked Rg1–g8. Use Nd7 as the queen's legal recapturer; use Nh5 to
guard g7 without providing a recapture or obstructing the rook's file. Neither
correction changes the preregistered label or evidence requirements.

Initial target passes 77 tests (72 cases plus five proof/tamper groups).
Added a five-ply older-capture/last-quiet negative before final evaluation.
Final target covers all 76 cases and independently checks missing history,
illegal pinned recapture, mate-one availability, EP victim location, promoted
capturer type, full legal recapture sets, exact counters, terminal histories,
foreign/ambiguous same-row proof references and budget exhaustion. All positive
new examples exercise mateIn2; mateIn3 remains inherited API support, not an
observed new positive timing fixture. Final target passes 81 tests; cumulative
E020–E055 passes 2,114 tests. Maintained source verification and diff check pass.
