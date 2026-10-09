# E111 causal pawn-chain obstruction and local mating weaknesses

2026-10-09 prospective build-first batch, parent E11066285ed. Existing isolated
research branch only. chainConstraintTags defaultfalse wraps E110; integer
chainMatePlies0..4default2 and maxChainMateNodes0..50000default50000, one shared
atomic budget, strict inputs/history and disabled equality. Reuse unchanged
E029 query/replayQuery, E020 legal/uci, E024 history and E021 pawnFeatures full
support components used by accepted E078. Do not change frozen dependencies.

Scope actor exactly K+Q, defender exactly K+B+2..4pawns, <=8units, no rights.
Actual noncapturing/nonpromoting queen entry, actual terminal mate allowed.
Find complete defender pawn support components with >=2members, all ahead of
bishop in defender pawn direction, and first occupied square on at least one
forward bishop ray is a same-color pawn belonging to that complete component.
This reuses E078 behind-chain semantics, not arbitrary blocking geometry.
Retain exact full components/edges and rays, including irrelevant blockers.

Require complete actual known-history actor mate AND fresh actual post-clocks
mate. Separately remove an entire selected defender chain component, preserving
all other units/turn/post clocks, clearing EP and using fresh history. Require
legal opened frame and complete FAILED same-horizon actor mate policy. Then
remove ONLY defender bishop from that opened frame; this legal opened-without-
bishop frame must restore full actor mate. This isolates a newly usable bishop
as the reason chain opening saves the defender, rather than merely changing
pawn counts or king flights. Nominal removed pawns explicit; no legal-move or
null-move claim for artificial frames, illegal controls abstain. Try deterministic
complete eligible component list until first qualifying causal witness, retaining
tried prefix/failures; atomic exhaustion discards all new facts.

C0320: full behind-chain structure plus above actual/opened/bishop-removed causal
mate controls. Broader liberation/best-alternative strategy remains unresolved.
C0311: same exact bishop obstruction prevents a defense to this finite mate,
not passive bishop inferred from low mobility or pawn color alone.
C0231: local color-complex mating vulnerability ONLY if actual queen entry is
terminal mate and its landing square has the defender bishop's square color,
plus same complete causal opening/bishop-removal controls. No global weak-color
score, permanence or claim every square of the complex is weak.
C0232/C0233: dark/light landing-square branches of same proven local vulnerability.
C0409: same actual terminal queen entry exploits the witnessed local weakness;
no best-move or strategic attack success inferred from an attacked square alone.
Six original pending scopes, all provisional and wider meanings preserved.

Prospective authored hypothesis (not evaluated): White Kh3 Qe2, Black Kh1 Bb8
Pc7 Pd6, actual Qe2h2 mate. Black Bb8 is correctly behind its forward own support
chain c7->d6. Removing both chain pawns opens Bb8xh2, whereas then removing
that bishop restores mate. White Kh3 deliberately outside the bishop ray; an
on-ray supporting king would make artificial opening illegal and must abstain.
Use H0 and H2, both colors, redundant/incomplete chains, forward-direction
mismatch, extra blocker, ineffective/illegal opening, missing bishop, played
capture/wrong army/rights, actual fifty-draw, strict disabled/budget/history,
full JSON and independent source/frame/component/color/label/proof mutations.
Unobserved hypotheses may fail; retain negative outcomes, never relax gates.

Guarded authored D001 pilot with full runtime/argv/engine:null/seed:null, exact
source/fixture/dependency hashes, retained independent complete replay. Accepted
E078 structural escape/behind facts unchanged; no geometry-only relabeling.
Priority deviation: this extends partial C0320 around its existing prerequisite
and shares complete mate machinery with early phase3 color vulnerabilities and
phase5 passivity/attack interpretation. Other position/weakness scopes require
broader goals or history; retain all1085original ideas, no placeholder coverage.
Deferred combined cumulative regression, complete semantic/absence/interaction/
priority/history/budget checks, exact frozen changed main/repeat/initially clean
reproductions, occurrence audit and real-game precision/usefulness.
