# E116 legal center influence, restraint and entry resources

2026-10-09 provisional build-first batch. Preregistration 5266b4a, parent E115
2a4670b. Current main authorized; research/local commits only, no push. Five
original candidate scopes: C0139 center control, C0181 fluid center, C0658 fixing
pawns, C0718 bishop-color fixation and C0659 creating entry squares.

Default-disabled centerRestraintTags wraps unchanged E115; maxCenterRestraintNodes
integer 0..50000, default 50000. Shared atomic budget covers all histories,
inventories, frames, replies, trials and certificates. Exhaustion preserves parent
events/comment and discards every new witness. Actual terminal after suppresses
new descriptive labels; comments <=24 words, qualityClaim:false.

Central control requires direct moved-piece influence on d4/e4/d5/e5 plus the
same denied enemy king entry becoming legal in both removed-piece and restored-
piece fresh frames. No castling rights, EP cleared, other pieces/turn/post clocks
preserved; illegal artificial frames abstain. These are comparisons, not moves.
Fluid center reports two legal distinct-pawn continuations with distinct central
c..f/ranks3..6 profiles, from a complete candidate inventory. It does not rank
them or claim structural resolution is forced.

Fixation requires a newly blocking pawn advance, no actual enemy pawn moves,
legal blocker-removal release, and EVERY opponent reply preserving both pawns.
Bishop-color fixation additionally requires a same-color bishop's profitable
capture after EVERY reply, E022-certified through every following enemy response.
New entry requires one stationary nonpawn/nonking piece to enter the newly vacated
central square after EVERY opponent reply, with nonterminal entry and no immediate
legal enemy capture of it. Failures are retained; no enduring safety, advantage,
global central superiority or permanent fixation is inferred.

Informative authored cases:
- Ka1/Bb2/Ng2/Pe3 versus Kh7/Pe5, e4 restrains e5, makes Bxe5 materially supported
  after every reply, and opens a safe immediate Ne3 entry under every reply.
- With Kh8 instead, Pe5 was already pinned by Bb2. Removing Pe4 does not release
  it, so causal fixation and bishop-color claims are withheld; Ne3 remains valid.
- Enemy Nd5 provides unsafe-entry/material-recovery branches: fixation remains,
  but stronger bishop/entry claims fail. Enemy Bf5 can capture the blocker:
  fixation fails, while its opposite-colored diagonal cannot capture Ne3, so that
  independent entry resource remains. Claims are not bundled indiscriminately.
- Nb1c3 denies Kf5e4; removing/restoring the knight releases that same flight.
  If Nc3 also blocks Bd4's attack on Ka1, those artificial frames are illegal
  and cannot support central-control claims.
- Two pawn captures can produce identical central profiles. Selection explicitly
  skips that pair and chooses distinct-pawn continuations with different profiles.

First focused run 47 passed/4 failed: wrong-color Bc2 illegally checked Kh7 and
was replaced by legal Bd1; capturable-blocker expected lists incorrectly omitted
the independent safe knight entry. No gates relaxed. Initial no-pawn K+N versus K
hypothesis was terminal insufficient material and rejected; adding an explicitly
authored pawn gives a live control test. Pinned-pawn failures are retained controls.

After corrections, 51 checks/32-case pilot passed. Added explicit illegal-frame
and duplicate-profile fixtures; reran focused checks because those new inputs
invalidate prior fixture coverage. Final 56 checks pass in 5.4 seconds. Three
E115 disabled/strict/history representatives pass in 9.7 seconds. Source verification
and diff checks pass. No cumulative suite, engine search or historical reruns.

Final distinct research/runs/E116/final pilot and neutral replay pass 36 cases,
32 witnesses, 24 positive cases and 4 expected exhaustions. All 123 normalized
source/fixture/dependency hashes, including representative parent tests, verify.
Checker reconstructs complete frames, inventories, every reply, every required
certificate, failed-trial prefixes, selected profiles and exact labels without
candidate import. Preliminary pilot remains separate and is superseded for final
coverage. Retained evidence binds preregistration revision plus actual source,
runtime/argv, engine:null, seed:null and guarded D001 receipt. Synthetic only;
no acquired games, human assessment or pristine frozen reproduction.
Plain 197,371 bytes; gzip 23,537 bytes. Packed SHA256
d0116c33021dc436b09dfe159f8aa73661a16b923ab28d79b80cf206ee6e8416;
plain SHA256 577f6d09f4f67c1840c7328dd5ce6ec8954d7222a36eb5e8e426dc769300fa53.
Replay: node research/experiments/E116-center-restraint-entry/code/replay-saved.mjs

Accepted E082 unchanged: 378/1085 occurrences (34.8%), 328 names. Build metadata:
279 provisional entries, 37 ready/0 stale; 657 accepted-or-candidate (60.6%),
428 without ready code. All broader original meanings retained. Deferred combined
cumulative regression, exhaustive semantic/absence/integration/priority/history/
budget/occurrence audit, frozen changed main/repeat/initially-clean reproductions
and real-game precision/usefulness. Focused success is provisional coverage only.

Next unused E117: inspect remaining phase3 pawn-cover/weakness and tactical attack
families, group compatible causal/quantified policies, preregister before evaluation.
Keep general opening-advice prerequisites explicit. Continue authorized main with
focused checks and small guarded pilots; numerical/production research unchanged.
