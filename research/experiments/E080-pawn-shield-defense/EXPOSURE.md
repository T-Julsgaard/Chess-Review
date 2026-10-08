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

Subsequent rook-family hypothesis failed both expected positives (focused
collection 2.8s): White Kg1/Pg2/Ph2, Black Kh8/Rg4/Bf3/Bb5/Nf2, g2g3.
Both return no-new-fact. Retain that exact root/reflection as negatives, with
both before and after complete one-ply winning proofs required; no detector
predicate or gate changed. A different authored rook candidate blocks both
king side escapes with own Nf1/Rh1 and keeps Pf2/Pg2/Ph2: Black Kh8/Rg4/Bf3.
Expanded nine focused tests then pass in 2.8s: corrected rook candidate and
reflection prove the registered effect, while original roots retain before
and after mate proofs. No rule, search ordering or acceptance gate changed.

Home-c/e translation and opposite bishop support ray collection (21 tests)
initially failed six expected queen positives in 3.2s. All exact roots retained
as negatives: c-file Qf1# remains after c2c3, e-file Qh1# remains after e2e3,
and home-g opposite bishop ray's selected initial Qd1# does not have the required
captured-cover-pawn obstruction. Black mirrors likewise retained. Guarded compact
probe independently exposes selected source moves and after win states, never
changes search ordering. Rook candidates on c/e/g and opposite support ray pass
both colors, yielding ten positive cases including the original queen pair.
Thus the registered home files/two slider families have candidate coverage, but
full independent wrapper verification and final gates still remain unmet.
Corrected focused collection passed all 21 tests in 3.8s; maintained source and
diff checks pass. Original PLAN unchanged, no gate weakened or case removed.

Independent scalar wrapper verifier added without new detector/source-solver
imports. It builds the finite one-ply table directly with legal move/history
transitions, and separately calls frozen E029 replayQuery for each supplied
proof. Exact source move ordering and work units remain fixed; inventories,
cover and rays use separately derived enumerations. All 22 focused tests pass
in 6.9s, including 21 deliberate witness/proof/wording/selection forgeries.
No test failure occurred in this addition; all earlier failed roots retained.

Expanded history/terminal/refusal collection failed ten assertions (110 tests,
10.8s): castling root's Rh1 already checked nonmoving Kh8; an authored Bh4 ray
did not pin Pf2 to Kg1; three borrowed parser/illegal guard roots lacked exact
expected-error metadata. Both color reflections retained. Guarded full original
fixture/results saved at research/runs/E080/development/guards-original.json,
with D001 receipt and exact fixture source hash. Disabled entries in that compact
probe were a display projection omission (no new analysis when disabled), not
additional test failures; disabled exact-parent checks already passed.

Retain checked-enemy castling root as explicit error, add legal castling with
Ka8; retain unpinned f2f3 root as no-new-fact, add genuine Be3 pin. Borrowed
malformed-FEN/UCI/illegal fixtures now require their exact established error
reason instead of absent metadata. No detector, scientific acceptance, source
ordering or budget change; no failed position removed. Full actual history,
zero/short/new strict options, nonpawn/king/capture/promotion/two-square outside
cover, outside home file/rank, pinned-slider and noncausal bishop mate gates
are included; corrected terminal outcome remains pending.
Corrected collection passes all 114 focused tests in 11.1s. Both literal failed
roots and both corrections remain in the input set; all previous guard states
and independent proof/tamper gates pass without detector changes. A guarded
110-case saved development pilot is prepared; final cumulative acceptance and
exact reproductions remain required.
Guarded saved 110-case pilot at bca51b0 passed in 6.314s; separately saved JSON
replay and all 267 input hashes pass. Twelve proven/32 no-new-fact/two disabled/
four exhausted/12 not-applicable/ten not-live and 38 exact errors; 324 proof
replies/leaves. Full artifact 665,381 bytes at research/runs/E080/pilot/results.json;
recorded exact hash in RESULT. No failure, pruning or storage-only complexity.

Remaining checking-move/distant-pawn/higher-warning selection and rehashed
storage-forgery gates pass; focused 121 tests in 11.1s, then candidate tracker/
preview audit brings total 122 tests, all pass in 12.8s. All 1,083 outside rows
unchanged; broader cover/enduring safety remain partial. Higher missed-mate
warning stays selected despite a valid shield event, both colors. No failure
or source search/budget/predicate change. Cumulative runner reuses exact E079
reflection routing and storage; expose expanded 116-case core pilot next, with
distinct output directory and complete source/input provenance. Canonical
tracker remains E079 until all unchanged registered final gates pass.

Expanded c205d01 116-case pilot passed in 7.536s; full cumulative suite 534.9s;
cumulative 5,306-case development collection 770.597s. Saved independent audit
passes all 5,190 inherited fingerprints, original-list hash, 1,083 outside rows,
all physical input/output hashes and 16 complete shield proofs. Evidence
4,751,354 bytes below soft target; no size-only optimization needed.

Manual notation audit then found an unconditional Black ellipsis on White
threats in Black-player examples. Preserve all old observations; correct only
emitter/replayer threat prefix from actual opponent color and add explicit
both-color notation gate. No scientific predicate, tree, ordering, budget or
metric altered. Final full suite and corrected cheap pilot remain required;
no source freeze or accepted advancement yet, three cold exact runs unchanged.
Corrected focused collection passes all 122 tests in 14.1s, including explicit
White-threat/no-ellipsis and Black-threat/ellipsis assertions. Source/diff pass.
