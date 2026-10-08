# E080 development exposure

2026-10-08. Original PLAN committed at caca074 before implementation/fixture
evaluation. Existing isolated checkout retained. No external position, game,
diagram or model acquired. Every test entry opens the guarded D001 loader
before fixture inputs; reuse source logic only from retained E027/E029/E079.

First authored queen hypothesis: White Kg1/Pf2/Pg2/Ph2, Black Kh8/Qg4/Bf3,
actual g2g3. E029's selected hypothetical prior mating capture is Qxg2#;
g3 lies between g4 and g2 and blocks that capture. Complete after negative
proof covers every legal Black move, including Qxg3+. Black color reflection
also passes. Three initial focused tests passed in 1.6s; no failed root or
gate amendment. This is exposed synthetic development, not confirmation.

Expanded five tests passed in 1.9s. Exact wrapper budget preserves proofs;
one-less and zero budgets drop all new proof/event data atomically. Removing
Bf3 leaves cover geometry without the same mating threat; h2h3 preserves the
unblocked mating route. Both return no-new-fact. Strict boolean/budget errors
and disabled exact-parent behavior pass. Maintained source/diff checks pass.

Only home-g king/queen family positive coverage exists; home-c/e, another slider
family, full independent wrapper replay/tampering, history/terminal/refusal
matrix, cumulative final checks and exact reproductions remain required. No
acceptance, no occurrence advancement, no storage-only optimization or pruning.
