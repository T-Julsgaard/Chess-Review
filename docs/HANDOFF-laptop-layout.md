# Handoff: laptop layout polish (in progress)

Temporary note for the next agent session. Delete this file in the commit that
finishes the work.

## Background

Commit `2ce0aba3` (already on `main`) fitted the review and Playstyle layouts to
laptop screens and display scaling (coach clear of the explanations switch, no
scroll bars in Accuracy/Quality/Engine, Playstyle chapters fitted instead of
scrolled, rail clear of Feedback, `--laptop-fit` audit). The user reviewed it and
asked for two follow-ups. The branch `laptop-layout-polish` holds the work so far.

### The user's feedback

1. **Accuracy tab (Accuracy / Quality / Advanced), compact overview.** The overall
   accuracy dials were too small and looked off. The user *likes* the phase names
   (Opening / Middlegame / Endgame) placed in the middle between the two scores
   and wants that kept, but **all score boxes must be the same size** (before,
   the boxes were narrower in the Middlegame row because the label column was
   `auto`). They also asked to "take another look at how this tab looks on the
   different laptop screen resolutions. Be critical, make it nice."
2. **Playstyle tab.** The previous commit let the panel grow above and below
   the chessboard (into the player-strip margins). The user does **not** want
   that: the panel must stay exactly the board's height; only fix the scaling of
   the content inside it.

The user cares a lot about every screen working: aspect ratios, resolutions,
browser zoom and Windows display scaling (100/125/150%). "It should just work."

## What is done (uncommitted work, now in this branch)

- `lib/panel-designs.css`: the compact overview block (`.acc-compact`) was rewritten.
  Every row (`.phase-summary` with the dials, each `.phase-report-row` and
  `.phase-rating`) is the same grid: `minmax(0,1fr) var(--phase-name-w) minmax(0,1fr)`
  (72px label column), using `display: contents` on the value wrappers and
  `order: -1` for the first value. So the score boxes are identical and each
  dial sits over its column. The "ACCURACY" label now sits between the dials.
  The dial width is `min(100%, var(--acc-dial))`, with its figure at
  `calc(var(--acc-dial) * .265)`. `.acc-compact-tight` (the shortest panels)
  hides the rings and keeps plain figures.
- `analysis.js`: in `scheduleAccuracyFit`, after adding `acc-compact`,
  `fitAccuracyDials(page, content)` sets `--acc-dial`. It starts at
  `ACC_DIAL_MAX = 100` and shrinks by the overflow, down to `ACC_DIAL_MIN = 54`;
  below that the tight class follows. `--acc-dial` is cleared on each refit.
- `lib/profile/workspace.js`: the growth into the strip margins
  (`PROFILE_FULL_HEIGHT` / `reach`) is removed, so the panel spans exactly the
  squares again. `PROFILE_SHORT_HEIGHT` went from 560 to 620, and a second tier
  was added: `PROFILE_TINY_HEIGHT = 420` (class `profile-tiny`).
- `lib/profile/designs/designs.css`: the `profile-short` and `profile-tiny` rules
  tighten the story gap, the hero figure (it was sized by `vw` only, so it was
  huge on short laptop panels), the fact rows, the W/D/L bar, the head, the
  story host and the nav buttons. `fitSlide()` (zoom-to-fit) is unchanged.
- `scripts/laptop-fit-audit.mjs` has new checks:
  - compact score boxes have equal width;
  - each dial is centred over its column;
  - the Playstyle panel stays within the board's height when it is beside the board.

  It also saves an Accuracy panel crop per viewport (`accuracy-<w>x<h>@<scale>-<lines>.png`
  for 1 and 3 lines), and `LAPTOP_FIT_ONLY=review|profile` runs one half.
- `docs/NATIVE_LAYOUT.md` is updated for both changes.

## Verification status

- **Review half** (`LAPTOP_FIT_ONLY=review`): 0 failures, but that run was
  *before* the dial figure was reduced from `.31` to `.265`. At `.31`, "97.0"
  touched the ring at dial sizes around 80–100px. Re-run it, and look at the
  crops.
- **Playstyle half**: the last complete run (before the `profile-tiny` tier and
  the 620 threshold) had 2 failures, both at 1280×550 (`numbers` chapter text
  8.3px against a 9px floor). Everything else passed, including the new
  "panel taller than the board" check. The tiny tier and the new threshold have
  **not been verified yet**. The run after them hit `Page.captureScreenshot timed out`
  at 2560×1300@1.5, apparently because about 25 leaked headless Edge instances
  from earlier runs were exhausting memory (the PC then crashed).
- Not run yet for this branch: `npm test`, `npm run lint`, `npm run verify:source`,
  the full `--laptop-fit` run, `--accuracy-fit` and `--engine-fit`.

## Remaining steps

1. Run both audit halves and fix any failures (see the commands below).
2. Be critical about the Accuracy crops at every laptop size (1 and 3 engine
   lines, all scales):
   - Check the dial size and figure size inside the ring.
   - Check the vertical rhythm: spare height is spread by flex spacers
     (`.acc-fit-content::before`, `.phase-overview` flex 3).
   - Check the alignment of player name cards against the score columns. The
     name cards use a plain 2-column grid, so their centres differ slightly
     from the score columns.
   - Check the tight mode at 1366×640 (no rings).
   - The user's own laptop screenshot looked like about 1536×730 or 1536×760
     at 125%.
3. Check that the Playstyle chapters look good at 1280×585, 1280×550,
   1366×640 and 1100×620. The panel must stay board-height.
4. Run `npm test`, `npm run lint` and `npm run verify:source`, then delete
   this file and commit.

## How to run the audits

The harness packages the extension, so it needs `npm run build` once
(`web-ext-artifacts/latest-release.json`). On the laptop, Chrome refused
`Extensions.loadUnpacked` ("Method not available"), so Edge was used:

```bash
CHROME_PATH="C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" LAPTOP_FIT_ONLY=review node scripts/learning-browser.mjs --working-tree --laptop-fit
CHROME_PATH="C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" LAPTOP_FIT_ONLY=profile node scripts/learning-browser.mjs --working-tree --laptop-fit
```

Each half takes a few minutes. Output, screenshots and `laptop-fit.json`
(failures plus per-chapter zoom/font evidence) go to the newest
`web-ext-artifacts/release-*/learning-audit-*` folder. After interrupted runs,
check for leftover headless browsers (`--headless=new --remote-debugging-port=0`)
and close only those.

### Failures that already existed on `main`

Each of these was reproduced on a clean checkout of the earlier commit:

- `tests/learning-ui.test.mjs` crashes with a Node out-of-memory error.
- `button-preview` is flaky; it passes on its own.
- `engine-fit` fails at random steps.
- `accuracy-fit` fails its final "Preserve the saved layout" step.
- `responsive-reference` crashes with "SCREEN_SIZES.Phone is not iterable".
