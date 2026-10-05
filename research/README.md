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
2. Read [BASELINE.md](BASELINE.md) when comparing with the extension.
3. Read [PROTOCOL.md](PROTOCOL.md) before designing or assessing an experiment.
4. Open only the relevant experiment, dataset or finding after that.

| Location | Purpose |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Scoped instructions for efficient, resumable research. |
| [INDEX.md](INDEX.md) | Compact experiment register, decisions and backlog. |
| [BASELINE.md](BASELINE.md) | Pinned starting implementation and known evidence limits. |
| [PROTOCOL.md](PROTOCOL.md) | Measurement, validation and promotion requirements. |
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

The evidence audit is complete and numerical development studies are registered
in the index. See the measurement contract and protocol for what a supported
claim can mean. Research candidates require independent evidence before adoption.
