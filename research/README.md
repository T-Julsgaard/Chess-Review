# Chess Review research

Improve how Chess Review measures move quality, game accuracy and rating
performance, and how it explains moves. Success means useful, independently
assessed improvements over our own frozen baseline. Matching Chess.com or
Lichess scores is not an objective or an acceptance criterion.

This is a maintained research workspace, separate from the active methodology
in [`tools/calibration/`](../tools/calibration/README.md), the runtime in `lib/`
and `analysis.js`, and the bundled model in `data/calibration.json`. Research
results do not become extension behavior automatically.

## Start here

1. Read [INDEX.md](INDEX.md) for current state, prior findings and the next task.
2. Follow [DATA_POLICY.md](DATA_POLICY.md) and run the data eligibility preflight
   before starting/resuming a goal or using any games or derived data.
3. Read [BASELINE.md](BASELINE.md) when comparing with the extension.
4. Read [PROTOCOL.md](PROTOCOL.md) before designing or assessing an experiment.
5. Open only the relevant experiment, dataset or finding after that.

| Location | Purpose |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Scoped instructions for efficient, resumable research. |
| [INDEX.md](INDEX.md) | Compact experiment register, decisions and backlog. |
| [BASELINE.md](BASELINE.md) | Pinned starting implementation and known evidence limits. |
| [PROTOCOL.md](PROTOCOL.md) | Measurement, validation and promotion requirements. |
| [DATA_POLICY.md](DATA_POLICY.md) | Mandatory public-data eligibility, verifiable lineage and run checks. |
| [MEASUREMENT.md](MEASUREMENT.md) | Output definitions, development gates and research sources. |
| [experiments/](experiments/README.md) | One folder per experiment: plan, code, retained evidence and result. |
| [datasets/](datasets/README.md) | Dataset provenance, split ownership and reuse records. |
| [findings/](findings/README.md) | Durable positive, negative and inconclusive conclusions. |
| [promotions/](promotions/README.md) | Implementation decisions and exact adoption scope. |
| [templates/](templates/experiment.md) | Experiment, finding and promotion record templates. |
| `runs/` | Ignored bulk downloads, engine caches and intermediate outputs. |

Retain small, sufficient evidence in Git. For large evidence, retain a manifest
with hashes, acquisition/rebuild instructions and an accessible immutable
location; a local ignored path alone does not make a result reproducible.
Research is available in the Git repository. The current packaging allowlist
excludes `research/` from extension ZIPs and release source snapshots; those
snapshots retain the active calibration instead.

Seventeen studies/tasks are complete. A new 900-game cohort has fully traceable raw
frames and exact clean reconstruction. A CP curve improves fresh development
prediction; its clean replay passes, but the unchanged curve fails its frozen
300-game confirmation gates. Smaller point gains have intervals including zero.
Higher-budget studies retain overall and choice-vector stability failures,
while focal CP root points meet tolerance. Outcome and choice adoption remain
separate; the full root-budget panel also misses its stability gate. The reserved
cohort is consumed; revised candidates need fresh confirmation evidence.
A blinded 24-case category pack awaits later annotation. Its tactical audit
finds the capture-offer heuristic insufficient. A separate 16-case net-offer pack
passes prospective operational support/stability checks with independent local
material witnesses; human annotation remains pending. Both packs are preserved.
The restricted-chosen-move consistency study fails joint gates: SF19 mean
errors improve, SF18 mean errors increase, and both miss stability. Choice temperature using recorded rating has a tiny unresolved development gain and
misses both primary gates; exact fits/predictions and independent clean replay
verify. Linear CP choice utilities then worsen human prediction and calibration
despite lower search-vector drift; independent/exact/clean replay verifies that
negative result. Signed-log context scaling then has a small unresolved point
gain, failing primary, cross-fit and subgroup guards; full independent/exact/
clean replay passes. Both exact utility recipes stop. The subsequent fixed-component choice mixture
clears the practical point-gain threshold but fails its comparator interval
gate. Cross-fit prediction and descriptive calibration improve, while search-
budget vector drift worsens; all independent/exact/clean replay checks pass.
Stop this exact mixture and review precision/cohort/input limitations before
a distinct numerical study.
The index retains failed experiments and provenance/target limits.
No new model is confirmed or promoted; current scoring is B000.
