# Research working instructions

These instructions apply to `research/`. Repository-wide commit and no-push
preferences still apply.

- Start with `README.md` and `INDEX.md`. Read the protocol on the first research
  task; thereafter open the active record and only relevant supporting files.
  Do not read all past experiments, bulk evidence or generated logs by default.
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
- Use targeted checks for research code and `npm run verify:source` for retained
  changes. If active scoring is later changed, run the full relevant regression
  and reproduction checks described in `CONTRIBUTING.md` and the promotion record.
- Finish by committing coherent completed changes and reporting the evidence
  status, local commit and next action. Do not launch a goal, push, or publish
  research merely because the scaffold or an experiment is ready.
