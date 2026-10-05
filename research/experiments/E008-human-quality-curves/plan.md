# E008: human outcome and legal-choice curves on fresh development games

Registered2026-10-05 before real-game searches or candidate metrics. Accuracy
primitives, SF19 first. D002450 train /150 development validation only; no search
or fit on300 reserved games. No extension change or published-calibration edit.

## Changed premise and bounded claim

F003's old CP study had80 training choices and25 evaluated games; its joint gate
failed. F004's phase/strength WDL interactions missed the practical gate. Here
we test two simple curves on a fully traceable new cohort with450 training
choices and150 development games, using both colors and broader root outcomes.
No F004 interaction family or F002 rating features are retried. SF18 replication
is a later separate record; no transfer of SF19 parameters is implied.

Target: predict actual human game points at selected roots and observed moves
among every legal alternative. A useful curve can support a future decision-
quality primitive. Likelihood improvement does not validate a displayed accuracy
percentage, aggregation, causal counterfactual move value, rating estimate,
brilliance or human instructional usefulness. D002 prefix population and unknown
provisional status remain explicit. No player rating enters either curve/choice
fit; ratings only define prespecified diagnostic groups.

## Frozen comparisons

All searches: exact bundled SF19 Lite hashes through the maintained engine
harness,20,000 configured nodes, Hash32, one thread/MultiPV1, UCI_ShowWDL true,
full startpos history, cold newgame/Clear Hash/isready before every search.
No tablebases. Record raw exact score/PV and final info separately: the harness
can retain an earlier exact iteration when the final one has a bound. Configured
budget, selected-score nodes and final-search nodes are distinct. Preserve exact
recovery flags; no score-based dropping or silent engine/budget substitution.

- Fixed CP comparator: SF19's current outcome primitive sigmoid(0.368208*cp/100).
  Fit a training-only legal-choice inverse temperature for this comparator.
  This auxiliary choice predictor is not a claim that production display quality
  is a normalized human probability model.
- CP refit candidate: one nonnegative slope on cp/100, fractional Bernoulli
  likelihood, as the maintained human-outcome fitter (upper100).
- WDL candidate: sigmoid(b*logit(clamp(engineExpectedPoints,0.0005,0.9995))),
  b nonnegative, upper100, fitted with the same weighted outcome likelihood.
  This is simple calibration of engine points, not F004's context interactions.
- Fit each curve's positive inverse temperature using softmax over all legal
  alternative utilities on the450 training choices (upper1000). Boundary optima
  are reported and cannot qualify for a shortlist. Mate alternatives map by
  sign to0/1 in every curve; ambiguous mate0 is invalid.

Report both fitted candidates against fixed CP and against each other. Both are
registered now; no validation-driven search or retraining after validation. If
both pass, select lower validation choice loss only as development shortlisting,
then freeze one for a separately registered fresh confirmation. This never turns
the validation cohort into confirmation.

## Observations and cache

Unrestricted roots at plies10,11,30,31,50,51,70,71 where available. Fractional
target win1/draw0.5/loss0 from the root player's perspective. Exclude root mate
scores from outcome fitting/assessment for all curves; report counts. Each game
has unit weight across its remaining roots. Forced roots may inform outcomes.

One legal choice per game: eligible nonforced positions at plies11–80, chosen
by minimum SHA-256 `E008-choice-v1:` + game ID + ':' + ply. Selection uses legal
history only, never scores or targets. Evaluate every legal root move with a
restricted20,000-node search; retain the unrestricted root too. Both outcomes
and legal alternatives use the same scores for all curves. Outcome fitting uses
unrestricted roots; transferring the curve to alternatives is separately tested
by legal-choice likelihood, not assumed to establish causal values.

Reuse exact searches only with identical build/options/budget/reset/full history/
restricted move cache key. Common openings may share compatible observations
across games. Append raw searches and progress to ignored `runs/E008/sf19/` while
running; do not fit candidates until the completed compressed evidence is
registered and committed. Any later reuse/resume of partial files requires a
hash-bound registered derivative and validity checks; never trust a stale lock.
The collector rejects an existing unregistered partial run rather than consuming
it. Keep session handles live for polling; no automatic restart after a timeout.

## Joint development gates

For each candidate vs fixed CP: outcome log-loss reduction>=0.01 and choice
log-loss reduction>=0.02, positive97.5% paired game bootstrap lower bounds for
both (10,000 resamples, seeds20261035/36 for CP,20261037/38 for WDL). Both joint
metrics must pass; two candidates are declared in advance. Brier must not worsen;
coverage must match; fitted slopes/temperatures must have no boundary optimum.
Report raw WDL outcome loss as a diagnostic, with extreme-probability clipping
stated, but do not use that easy comparison to claim a CP-method improvement.

Prespecified diagnostic groups: root/choice own recorded rating<1200,1200–1999,
>=2000; ply<=20,21–50,>50; fixed-CP expected points<0.1,0.1–0.9,>0.9. At>=30
games per group, outcome deterioration<=0.03, Brier deterioration<=0.01 and
choice deterioration<=0.05. Sparse groups remain unresolved. Preserve all
failures. No subgroup defined by true target may become a use-time predictor.

## Cost, verification and access

Synthetic startpos pilot: unrestricted/restricted searches took45–77ms; selected
exact iterations had8,780–20,031 nodes, illustrating why final info is retained.
About23,000 searches expected,20–40 minutes on this machine; cap90 minutes and
50,000 requests. Retain under20 MiB compressed evidence. No network acquisition.
Two-game smoke precedes full collection and writes separately to ignored runs.
Commit plan/code before searches; record pilot, source/model/engine/code hashes.

Verify legal history, complete alternatives, raw score/PV/bounds, dataset roles
and all query bindings before fit. Fit train only; inspect development validation
only after code/thresholds are frozen. Exact offline numerical replay and an
independent binding/fold checker are required for development findings. A passing
candidate still needs locked fresh confirmation, search-budget stability and
separate display/aggregation evidence before a production promotion proposal.
