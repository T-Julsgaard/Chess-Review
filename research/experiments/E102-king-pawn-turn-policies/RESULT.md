# E102 full king-pawn policies and finite turn comparisons

2026-10-09. Research-only provisional implementation, default-disabled
`kingPawnPolicyTags` wraps E101. Preregistration 0055af7. Dated EXPOSURE
amendment extends the maximum horizon from 10 to 12 plies; default six and
50,000-node cap remain unchanged. Atomic exhaustion preserves parent behavior.
Exactly K+P versus K, actual noncapturing king move, live legal full history.

C0272/C0273/C0611/C0634: actual king entry has a complete surviving-queen
policy, but restoring only the king under the post-move clocks has complete
failure at the same bound. This is causal finite entry, not global key-square
theory or evaluation. C0614/C0652/C0766/C0983: defender-to-move admits that
policy, same-placement artificial actor-turn frame does not at the same bound.
C0615/C0767: finite queen/prevention role comparison only; true unbounded
reciprocal zugzwang remains unresolved. C0384/C0604: central king arrival supports
full legal king/pawn policy requiring subsequent king continuations; complete
pawn-only failure at the same bound. Accepted E037/E079 remain unchanged;
enduring safety, optimal play, other material and comprehensive theory deferred.

The objective follows the tracked pawn through all legal king and pawn choices
against every enemy defense, to queen promotion within the stated horizon and
survival against every immediate enemy reply. Promotion mate succeeds; draws,
captured queen, insufficient nominal gain and actor mate fail. Nonqueen promotion
is an explicit non-goal, not a bad-move judgment. Complete failures enumerate
all actor alternatives with chosen enemy counters or finite-limit leaves.
Library threefold/fifty-move game-over semantics apply; independent optional
claim/official rule handling remains a prerequisite. No tablebase or DTM/DTZ.

Memo keys retain full FEN/clocks and every historical repetition count capable
of reaching threefold within the remaining bound. Pawn movement resets the
irreversible history. Owner-relative ordering gives symmetric reflected cost.
Independent replay imports no E102 detector or cache: every supplied branch is
replayed with actual legal history, terminal checks and complete move inventories.
Thin event references avoid repeating query witnesses in runtime comments.

39 focused E102 checks: 38 passed in the initial aggregate, plus the corrected
exact-budget check passed independently. All E101/E037/E079 dependency files
passed in that aggregate. The aggregate exited nonzero solely because the
exact-budget test wrongly expected default limit metadata after explicitly
changing the limit. The corrected test requires full result equality with only
that explicit limit changed; behavioral/proof assertions were not weakened.
Initial aggregate runtime 397.2 seconds. The unfinished pilot was stopped by
verified process identity before changing its source-bound test; no retained
output was overwritten. Corrected pilot uses a distinct directory.

Positive/negative/reflected, original failed turn/center proposals, exact budget,
strict controls, disabled equality, full JSON, known twofold history, near-fifty
clock, underpromotion objective, terminal and extra-piece exclusions covered.
Original twelve-ply turn/center no-route observations and atomic exhaustion
remain in EXPOSURE. No negative bounded route is a claim of an unbounded draw.

30 guarded authored-synthetic D001 cases; 24 witnesses, 14 positive full policies,
two exhausted cases. Corrected run: research/runs/E102/corrected-budget.
104 normalized source/dependency hashes. Retained lossless gzip 2,673,868 bytes,
SHA256 50c18f3a52126db3daae01925098ff55c57b50860c51fddb8b8de491dc8cdfe5.
Complete plain JSON 76,180,417 bytes, SHA256
6947fdbb44a647b3fc9c11d089a0e86fdce565d908af2bca7e9a7cbec25911b6.
The larger plain trees preserve all required failed-policy branches; gzip is
within the soft storage target. run.json binds exact preregistered revision,
working source hashes, receipt, sizes and output hashes. No game contents,
engine acquisition, cumulative regression or historical regeneration.

Saved evidence replay command:
node research/experiments/E102-king-pawn-turn-policies/code/replay-saved.mjs

Deferred: combined full regression, independent comprehensive semantic/absence
and interaction/priority/terminal/history/budget checks, exact main/repeat/clean
reproductions at a frozen combined revision, original-occurrence scope audit and
real-game precision/usefulness. Prototype coverage never advances acceptance.

Canonical E082: 378/1,085 accepted entries, 328 names; 76 partial, 631 unimplemented,
707 remaining, 63 completed studies. Provisional 192 pending entries in 23 ready
batches, zero stale; accepted-or-candidate 570/1,085 (52.5%), 515 without candidate.
Backlog 668 working items. Full original catalog and broader scopes stay in view.

Resume existing research/runs/E020/clean branch codex/coach-concepts-e058-evidence.
Shared clean main d22290c includes E101. After completed result commit, use the
safe completed-only local fast-forward import; never push. Next coherent batch:
quantified square entry and pawn-resistant occupied squares, reusing accepted
E070 pawn-reach/support certificates and existing legal material machinery.
Do not infer permanent holes, global strength or strategic value from geometry.

Latest five-hour usage: 57% used, 43% remaining; secondary 86% used. Goal active.
At about 95% primary use, stop, commit completed work, retain exact resume state
and perform the explicitly authorized PC shutdown. Full objective incomplete.

Independent retained saved replay passed: all 30 cases, 24 witnesses, 14 positive
policies and two exhausted cases; all 104 source hashes, exact sizes and
compressed/plain hashes matched. Source verification and staged diff passed.
All E102 pilot/replay handles finished; no live frozen run uses these sources.
