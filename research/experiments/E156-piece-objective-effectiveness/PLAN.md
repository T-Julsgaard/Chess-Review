# E156 — equal-value pieces against a declared capture objective

2026-10-10. Prospective build-stage registration, parent E155 at 2b0f20c.
Current main authorized; research-only, local commits, no push. Full catalog
remains in scope. No E156 chess query has run before this registration.

Claim C0301 only: two declared own nonpawn/nonking pieces with equal nominal
value are compared against one declared enemy pawn capture objective. After an
actual quiet nonchecking piece move, retain every legal enemy reply, every legal
capture of the tracked pawn by any own unit, and every immediate counterreply.
A unit covers the objective only if every enemy reply admits its capture and
every counterreply preserves at least one nominal material point over the
before-move balance. All involved states must be live and countersets nonempty.
Exactly one nominated original unit must cover the objective. This establishes
relative effectiveness for that objective, not general good/bad piece quality.
Track identities through the actual move; retain failed captures and responses.
Promoted target identity remains tracked; full real history preserves claims.
Any visited fifty-move/repetition claim withholds the finding globally.

Default-disabled pieceObjectiveTags wraps E155 exactly. Inputs objectiveTarget
(one square), objectiveUnits (two distinct squares), maxPieceObjectiveNodes
(integer 0..50000, default50000), optional independently admitted objectivePanel.
Missing history/objective inputs produce prerequisites; malformed inputs reject.
Actual capture/pawn/king/promotion/checking moves abstain. Nominees must be own
N/B/R/Q with equal values p1/n3/b3/r5/q9/k0. Atomic budget failure emits no new
event or partial witness. Event relative-piece-objective-effectiveness has
qualityClaim:false and <=24 words. Source closures include all parent behavior.

Collector ledger: 3 root/context operations plus one per historical move;
3 for the actual variant; 3 per enemy reply; 3 per objective capture; 1 per
counterreply. Wrapper adds3. Saved admission recomputes this full logical cost.
Independent legal checker reconstructs every inventory/state/claim/ledger using
Chess directly; independent witness checker recalculates per-unit policies and
event admission without importing detector or derive helpers.

Prospective authored hypotheses: White Kh8 Ra1 Bf1 Ne1 Pf6 versus Black Kh1
Ra7 Nb5 Pf7; recorded Rxa7/Nxa7, actual Bc4. Bf1 versus Ne1 for pawn f7:
bishop covers, knight does not. Add Black Be8: an independent defender refutes
bishop coverage. Add White Ng5 and nominate bishop/Ng5: both cover, so no relative
finding. Both colors; reversed nominee ordering; moving/captured nominated units,
strict inputs, disabled compatibility, terminal/claim and exact/one-short budgets.
Small 12-case pilot: these three families plus missing objective/history and
zero budget, each reflected. Retain all raw legal panels and failures. Run cheap
smoke before collection; reuse identical smoke observations. Soft evidence target
200KB compressed, no scientific storage gate. All chess entrypoints D001-test
guarded; no acquired games, engine, tablebase or external diagrams.

Scheduling deviation: C0301 has a finite objective that can be tested now.
C0300 strategic trade and C0303 bind remain next, requiring positional comparison
or joint pawn-break/activity evidence. An equal exchange or pawn-capture tactic
does not discharge strategic trade; this batch claims no C0300 credit. The
recorded exchange here supplies genuine history only. Broader C0301 strategic
quality also remains unresolved after any narrow success.

Focused study and representative parent checks, guarded pilot, saved semantic
replay, source verification and diff checks now. Full cumulative regression,
exhaustive occurrence/priority/history/budget integration and exact main/repeat/
initially clean reproductions deferred to combined freeze under BUILD-FIRST.md.
