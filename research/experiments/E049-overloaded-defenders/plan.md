# E049: conditional overloaded defender and material deflection

2026-10-07. Research only, frozen E048. Cutoff/shutdown cancelled. No extension,
rating work or push. Original list unchanged; synthetic authored cases only.

Question: can a short conditional comment identify an enemy defender with TWO
real legal recapture duties and prove the material cost of abandoning one?
Names: Overloading, Overworked defender, Deflection combination, scoped to the
exact conditional capture/recapture/capture witness, not forced acceptance.

Opt-in overloadTags boolean defaultfalse preserves exact E048. Shared integer
maxOverloadNodes 0..50000 default50000. Exhaustion discards all new tags and
retains parent facts. <=24-word comments. No engine, global quality claim,
long-term evaluation or inference of intention.

Actual move must capture an enemy nonking A normally, not en passant or promote.
Before it, enemy D (N/B/R/Q) geometrically defends A AND another enemy nonking B.
An existing own unit other than the actual mover can legally capture B; D can
legally recapture that unit on B with net nominal gain <=0 relative to BEFORE
the actual move. Store this first defensive duty and full legal records.
After actual capture of A, D can legally recapture the actual mover on A,
giving own net material gain <=0 vs BEFORE: a second concrete defensive duty.
Enumerate EVERY legal such D recapture, retaining identities and full history.

For EVERY D recapture of A, require B identity persists and D no longer
geometrically defends B. The SAME own unit from the first-duty witness can
legally capture B. After that capture, EVERY legal enemy response must leave
strictly positive nominal material gain relative to BEFORE the actual move,
including the immediate position. Reject draw terminals and own checkmate in
any response; actual own mate after capturing B is permitted. Store complete
response set, SAN, before/after, material gains and minimum. Enumerate only
finite three plies after actual move; no future material stability claim.
Choose deterministic first successful witness per D; all D acceptance choices
are proved, but declines/other recapturers are not forced. Wording explicitly
says "if" and "through the next reply". qualityClaim false.

Independent replay imports no detector or arithmetic helpers; strict legal
history replay, full canonical FEN/counters, terminal guards, original piece
identities, geometric duties AND legal defensive recaptures, exact ALL D
acceptance set and exact ALL final reply sets. It recomputes material with
p1/n3/b3/r5/q9 and checks the horizon/baseline.

Authored tests: rook/queen/bishop/knight defenders where feasible; both colors
and file mirrors; missing second duty, wrong/absent attacker, D remains defending
B after recapture, another defender recaptures B and refutes net gain, loss of
costly first mover makes final net gain <=0, pinned first-duty recapture, illegal
second capture, draw/terminal lines, quiet move, disabled/exhausted settings,
tampered roles/history/records/acceptance sets/response sets/minima. Retain
meaningful legal negatives; log exposed fixture corrections without weakening
gates. Guard D001 test receipt before fixtures; no registered games analyzed.

Commit plan before evaluation, source before main. Cumulative E020–E049 tests,
maintained-source/diff checks; main/repeat/initially clean local checkout match
exact revision, normalized inputs, deterministic outputs and metrics. Separate
saved-JSON replay; all inherited full-result hashes unchanged; full new evidence
<3 MB. ~120 seconds per full run, three concurrent runs. Synthetic mechanics
only; real-game precision/human benefit unmeasured.

Exposed smoke: an initially mislabeled pin setup instead directly checked the
nonmoving king and was refused. Replaced it with a real pinned defender whose
legal duty fails; that negative receives no overload label. An intended
acceptance-check negative initially put its own king under a knight attack;
relocated the second target and attacker so the root is legal while the
acceptance genuinely checks and prevents the follow-up capture. Added explicit
legal refutation, terminal same-color bishop draw and zero-net-gain cases.
Proof gates are unchanged. All smoke failures and corrections precede main.
