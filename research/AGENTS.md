# Research working instructions

These instructions apply to `research/`. Repository-wide commit and no-push
preferences still apply.

- Keep research on one existing branch and reuse the existing isolated research
  checkout. Do not create per-experiment branches, switch the shared checkout,
  or create another working clone unless the user explicitly requests it.
  Clean verification checkouts remain allowed for required reproducibility;
  they must not become additional development branches.
- Reuse one existing clean verification checkout instead of making a copy per
  experiment. Before moving it to the frozen source revision, verify its tracked
  and non-ignored state is clean, it has no unique work to lose, and no run is
  using it. Use detached HEAD for verification; preserve retained outputs and
  provenance. Never reset or delete an active or dirty checkout. Verify exact
  source/input hashes and use a distinct output directory for each reproduction.
- Import completed research from the isolated checkout into the shared
  repository's existing `codex/coach-concept-research` branch using a local,
  fast-forward-only fetch. Never create `codex/coach-concepts-e###-evidence`
  branches to transfer results. Keep unfinished work in the isolated checkout.
- After required checks and the result commit, fast-forward completed research
  into local `main` only when the shared checkout is already on `main`, its
  tracked and non-ignored working files are clean, and no operation is in
  progress. Ordinary divergence is expected when other tasks commit to `main`;
  it is not by itself a reason to leave completed studies unintegrated. The user
  authorizes the safe local reconciliation procedure below. Never force, reset,
  switch the shared branch, automatically stash work, or rewrite frozen evidence.
  Report the branch and whether local `main` includes the completed study.
  These local integrations do not authorize any push.
- Before preregistering the next study and again immediately before importing
  completed results, check both repositories' status, HEADs, ancestry and active
  Git operations. At a clean boundary with no running process depending on the
  mutable development checkout, fetch current shared local `main` into the
  existing isolated repository. If it is ahead, fast-forward the existing
  development branch; if histories diverge, merge the fetched `main` into that
  same development branch with a normal local merge commit. Preserve both
  histories and all completed evidence. Resolve only conflicts whose intended
  result is established by the retained changes and instructions; ask about
  ambiguous intent or conflicts in frozen evidence instead of guessing.
- Verify any reconciliation with source verification, diff checks and relevant
  checks for files whose behavior changed. Instruction-only merges do not require
  re-running unchanged experiments. After completion, locally fast-forward-fetch
  the reconciled development history into the existing shared research branch,
  then fast-forward clean shared `main`. Recheck status and ancestry immediately
  before each mutation; if `main` advanced meanwhile, reconcile again at the
  next safe boundary. Never move shared refs to unfinished study commits.
  For dirty/active checkouts, defer synchronization and state that specific
  blocker; do not discard work or abandon reconciliation merely due to divergence.
- Start with `README.md` and `INDEX.md`. Read the protocol on the first research
  task; thereafter open the active record and only relevant supporting files.
  Do not read all past experiments, bulk evidence or generated logs by default.
- Before starting/resuming a research goal or using game data, follow
  `DATA_POLICY.md` and run `npm run research:preflight -- <dataset IDs> --purpose
  <use>`. Only explicitly public, free-to-use, registered sources with documented
  permission qualify. Missing/ambiguous permission or untraceable provenance
  strictly prohibits every use, including training, inspection, evaluation,
  examples and derived caches/models. Never bypass the gate or substitute data.
  Source metadata/terms may be read to establish eligibility. Require the shared
  guarded loader in every entry point; keep its receipt in each run. Reverify
  terms before new acquisitions and origins before changed inputs. Keep game and
  bulk provenance records out of model context; report compact checks only.
- Before running work, check the index and dataset reuse records for the same
  question, search configuration and inputs. Reuse hash-matched observations;
  never substitute a different engine, budget or history silently.
- Keep experimental implementations and candidate parameters here. Reuse the
  maintained engine harness and math through imports where appropriate. Do not
  edit frozen public evidence or runtime scoring as part of an experiment.
  Production changes belong to an explicitly requested implementation task
  with a promotion record.
- Create one `E###-short-name/` folder per coherent experiment. Use `plan.md`
  for the dated protocol, `RESULT.md` for the compact result and resume state,
  and local code/evidence subfolders only when needed. Commit the plan before
  its decisive evaluation; log deviations instead of rewriting the original.
- Keep bulk outputs under `research/runs/<experiment-id>/<run-id>/`. Run records
  must name the exact code revision, dataset hashes, command, seed, engine
  configuration, environment, output hashes and evaluation role.
- Keep `RESULT.md` current at work boundaries: what ran, what was learned, what
  failed, paths to evidence, remaining uncertainty and one concrete next step.
  Update the corresponding index row. Do not create a parallel narrative log.
- Record negative and inconclusive results with the same care as improvements.
  Check existing findings before retrying an approach; state what new evidence
  or hypothesis justifies a retry.
- Search or stream large artifacts rather than placing them in chat context.
  Run a cheap smoke/sample check before a costly collection; estimate and record
  the full run's compute/storage cost. Cache raw engine observations separately
  from candidate scoring so compatible candidates can reuse searches.
- Minimize retained evidence size where practical, but use soft storage targets
  by default, not scientific acceptance gates. Prefer simple lossless compression,
  compatible proof sharing and avoiding redundant copies; do not spend excessive
  development or compute time solely to meet a byte target. Keep all required
  cases, branches, histories, failures, provenance and independent replay.
  Record justified overruns, actual sizes and the storage/retrieval recipe; an
  overrun alone does not invalidate a scientific result. Follow PROTOCOL.md for
  dated changes to existing registered caps; never rewrite frozen outcomes or
  silently weaken engine/search budgets, runtime correctness or final gates.
- Use targeted checks for research code and `npm run verify:source` for retained
  changes. If active scoring is later changed, run the full relevant regression
  and reproduction checks described in `CONTRIBUTING.md` and the promotion record.
- During development, use `npm run research:coach-tests -- E###` for the active
  study and explicitly include any affected dependent studies. Finish the
  registered fixture matrix, independent replay/tamper tests, cheap saved pilot
  and candidate runner/tracker/demo before launching the full cumulative suite;
  check development corrections with focused tests and affected dependencies.
  Do not run the full suite or collect all inherited cases after each small edit,
  at routine commits/resumes, or while known acceptance work remains unfinished.
  Before freezing source, run `npm run research:coach-tests` for the full
  cumulative coach suite, source verification and diff checks. Focused tests
  never replace final gates.
  Repeat a passed full suite only when subsequent behavior/test/input changes,
  a failure or an unresolved integration concern invalidate that check; record
  the reason in `RESULT.md` before starting it. Documentation-only edits do not
  invalidate an unchanged regression, but exact run input hashes must still match.
  Keep independent saved-proof replay, inherited-result checks and the required
  main/repeat/initially clean runs with exact source/input/output hashes. Do not
  skip them using cached success or weaken an already registered plan.
- Use `npm run research:status` for progress counts instead of hand-counting.
  Study runners already generate trackers, demos and hash manifests; reuse those
  outputs and their existing acceptance checks rather than creating parallel
  summaries. Related concepts may share a prospectively registered study and
  common proof machinery, with separate positive/negative gates for each claim.
- For coach expansion, follow the user-approved scheduling and support routing
  in `concepts/ACTIVE-QUEUE.md`. Use the fixed easier-to-harder ranks filtered
  against current canonical status, batch compatible claims, preserve duplicate
  occurrence scopes and keep support work separate from verified detectors.
  Record prerequisite-driven deviations before implementation; keep all final
  scientific gates and the complete teaching catalog.
- Finish by committing coherent completed changes and reporting the evidence
  status, local commit and next action. Do not launch a goal, push, or publish
  research merely because the scaffold or an experiment is ready.
