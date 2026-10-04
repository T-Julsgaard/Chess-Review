# Hardware compatibility audit — 2026-10-04

The extension can run on modest PCs with a supported browser and WebAssembly
SIMD. It cannot currently promise support for every CPU. Both bundled Stockfish
engines require SIMD; falling back between them does not remove that requirement.
This audit does not establish why users uninstall the extension.

## Requirements and findings

- The manifests require Chrome 121+ or Firefox 140+ on desktop. Other Chromium
  browsers need compatible extension APIs; Edge was not directly tested here.
- There is no native Intel/AMD binary, AVX/AVX2 requirement, GPU compute, WebGL,
  or WebGPU requirement. Engine computation uses bundled WebAssembly workers.
- Both engines need WebAssembly SIMD. In V8, disabling SSE4.1 support made both
  actual modules fail compilation. Chrome with that capability disabled now
  displays a specific explanation immediately, with no workers started.
- Single-threaded engines work without SharedArrayBuffer or cross-origin
  isolation. This was checked in the real extension pages.
- Engine assets match the recorded upstream SHA-256 checksums. No executable
  engine or network is downloaded when a review starts.
- Memory hints are approximate and unavailable in some browsers, including
  Firefox. They do not measure free RAM and are not used to cap review workers.

[Upstream build documentation](https://github.com/nmrugg/stockfish.js),
[V8 SIMD documentation](https://v8.dev/features/simd), and
[the Device Memory API](https://developer.mozilla.org/en-US/docs/Web/API/Device_Memory_API)
describe the relevant runtime requirements and hardware hints.

## Changes

The original CPU-based defaults are preserved: logical cores minus one, at least
one worker and at most four. If CPU information is unavailable, the original
three-worker default is retained. Explicit selections of 1–8 workers are honored,
limited only by the number of positions in the game. Neither RAM hints nor hash
size reduce a user's chosen parallelism. Existing saved choices are preserved;
there is no migration that guesses whether a choice was automatic or manual.

An earlier implementation capped unknown-memory browsers at two workers and
also reduced parallelism for RAM/hash hints. Those caps were removed following
the speed review: hints alone do not establish that a working pool must shrink.
Healthy worker pools retain their original concurrency. Fewer workers are used
when an actual startup failure leaves a smaller surviving pool, or when different
fallback builds must be separated to keep scoring consistent. Search depth,
hash preferences, and scoring budgets are unchanged.

Cold startup has a finite 60-second deadline rather than 10 seconds. A partial
worker startup failure lets the ready workers complete the review. A pool that
started different fallback builds keeps just one build so all positions use
the same scoring model. Unsupported WebAssembly/SIMD produces an actionable
message rather than repeatedly trying incompatible engines.

## Speed-preserving revision verification

All 303 automated tests passed after removing the RAM/hash caps. Regression tests
exercise the real application defaults across eight CPU/memory-hint profiles and
check manual selections of 1, 2, 4, and 8 workers with a 256 MB hash preference.
Healthy pools start the selected number of workers and keep search settings
unchanged. Existing partial-startup failure and unsupported-SIMD tests also pass.

Both rebuilt packages passed the updated hardware smoke tests: 24 complete
reviews across Chrome and Firefox, both engines, five default profiles plus a
manual-worker override. The observed default worker counts were 1, 4, 4, 4, 4
for the five profiles in the original table below. Selecting four workers
explicitly on the single-core profile started four workers as requested.
The Chrome GPU/AVX/AVX2 exclusions and 128 MB per-engine memory limit still
passed, as did the separate unsupported-SIMD check.

The revised package record is
`web-ext-artifacts/release-0.3.0-3cdhz4/release-record.json`; its results are
`web-ext-artifacts/release-0.3.0-3cdhz4/hardware-RCqkzE/results.json`.
These checks verify unchanged concurrency and search configuration, not a
wall-clock benchmark or physical low-RAM/slow-CPU validation.

## Original audit verification

These results describe the initial conservative worker policy, before the speed
revision above. They remain evidence of engine capability, not the current worker
counts. The revised policy is covered by the current regression tests and the
updated hardware smoke script.

All 295 automated tests passed in this working tree, including delayed startup,
partial worker failure, consistent fallback scoring, unsupported SIMD, and
eight CPU/memory hint scenarios. Engine checksums and the package build passed.
The standard packaged Chrome/Firefox smoke tests also passed, covering longer
reviews, rating controls, responsive layouts, reloads, and the release migration.

Real packaged extension tests used Windows x64, Chrome 154.0.8037.93 and Firefox
157.0. Each engine completed a seven-position review for every profile below
in both browsers: 20 completed reviews total, plus direct engine searches.

| Simulated logical CPUs | Simulated RAM hint | Actual review workers | Both engines, both browsers |
| --- | --- | --- | --- |
| 1 | 2 GB | 1 | Passed |
| 8 | 2 GB | 1 | Passed |
| 8 | 4 GB | 2 | Passed |
| 16 | Unavailable | 2 | Passed |
| 16 | 8 GB | 4 | Passed |

The Chrome run additionally disabled GPU acceleration, AVX, and AVX2 and capped
each WebAssembly memory at 128 MB. This is a per-engine linear-memory limit,
not a total browser/process RAM limit. A separate Chrome run disabled SSE4.1
and verified the specific unsupported-SIMD message before worker creation.
CPU/RAM hints were simulated; these runs did not physically change the machine's
CPU architecture, core count, or installed RAM, and did not benchmark slow CPUs.

The audited package record is
`web-ext-artifacts/release-0.3.0-ieAneV/release-record.json` and the hardware results
are `web-ext-artifacts/release-0.3.0-ieAneV/hardware-YsCX1V/results.json`.
Artifacts are local and ignored by Git. Initial sandboxed browser runs could
not launch Chrome child processes; the successful runs used isolated profiles
outside that command sandbox.

Repeat the audit after building the desired release:

```sh
npm test
npm run build
node scripts/hardware-smoke.mjs
npm run test:browsers
```

The hardware script modifies only disposable package copies. Test reporting
permissions, hardware overrides, and harness files never enter the store ZIPs.

## Remaining limits

Physical AMD, ARM/Windows-on-ARM, macOS, Linux, 32-bit browsers, the minimum
supported browser versions, and old CPUs without SIMD were not positively
validated. Browser policies that disable WebAssembly remain unsupported.
Supporting non-SIMD computers would require a scalar engine build with verified
search/scoring behavior; neither bundled fallback currently supplies that.

Uninstall percentages do not identify a hardware failure. There is no developer
analytics backend in this extension, so there is no install-to-engine-failure
evidence to connect the reported 10–25% uninstall rate to these findings. Actual
failure reports with browser version, CPU, RAM, and the displayed error would
help distinguish engine compatibility from game detection, loading time, or
other first-use problems.
