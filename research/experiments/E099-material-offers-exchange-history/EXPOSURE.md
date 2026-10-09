# E099 exposure

2026-10-09: inspected catalog definitions and existing E022 capture certificate,
E024 history validation and E098 interface; no game contents or new acquisition.
Authored synthetic positions only; full combined validation remains deferred.

First cheap authored pilot: all positive scopes observed in both colors. Pawn
recapture of a knight still loses two points, so that initial attempted negative
was not a refutation. Replace with offered knight captured by a rook which can
be recaptured by a pawn. Extra rook on b4 obstructed intended h4-a4 recapture;
replace with b5 bishop legal countercapture. Gates unchanged. Source review
corrected bishop-pair root offset to include intervening enemy material changes,
not assume a quiet enemy reply. No accepted helper/evidence changed.

Focused pass initially failed three tests of the new intervening-loss fixture:
enemy Ra5 checked a1 king, preventing Bxe5. Move authored own king to h1; keep
material-loss proof gate and six-point root-relative expected loss unchanged.
Other focused and affected-dependency tests passed in that run.

33 active focused checks passed after legal fixture repair. Guarded 26case
pilot passed, but independent saved replay detected JSON normalizes -0 to0.
Normalize zero capture offsets in candidate and independent checker; retain
original run under ignored runs/E099/pilot and create normalized-zero run.
This is serialization exactness, not an altered material gate.
