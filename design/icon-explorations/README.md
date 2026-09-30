# Move icon design history

The maintainer, T-Julsgaard, confirmed authorship of the active badge artwork on
2026-09-30. The active drawings are distributed under the project's GPL v3.0;
see ATTRIBUTIONS.md for the file inventory and recorded provenance. Preserved
original snapshots document the earlier appearance and are not an authorship
claim about those historical designs.

Open [selected-preview.html](selected-preview.html) to view the implemented set, or [review.html](review.html) to compare all ten categories across all five saved sets. Selected versions are highlighted in the gallery.

- `original/`: the original symbols and circle styling from Git HEAD, before this exploration.
- `round-1/`: the complete first redesign, saved before any second-pass edits.
- `round-2/`: the complete second redesign. Masterstroke, Superb, Near best, Minor Misstep, Major Misstep and Missed chance have new symbols. Theory, Best, Decent and Blunder retain their first-pass symbols.
- `round-3/`: the complete third redesign, with a new symbol for every category: inspired knight, laurels, scroll, summit flag, rank chevrons, pawn, footprint, stop sign, crossed spark, and toppled king.
- `round-4/`: the complete fourth redesign: offered queen, key, opening blueprint, exact puzzle fit, almost-complete puzzle, level scales, chipped square, split square, closing door, and shattered square.
- The active application assets are the SVGs in the repository's top-level `icons/` folder.

## Implemented selection

The choices are recorded in `selection.json`. Active icons match the archived SVGs exactly.

| Category | Selected pass | Symbol |
| --- | --- | --- |
| Masterstroke | Second | Pen nib with spark |
| Superb | Second | Trophy |
| Theory | Third | Scroll |
| Best | Second | Crown |
| Near best | Second | Medal |
| Decent | Second | Checked shield |
| Minor Misstep | Second | Caution diamond |
| Major Misstep | Third | Stop sign |
| Missed chance | Third | Crossed spark |
| Blunder | Second | Fractured shield |

Each design is a single scalable SVG. There are no separate 16–32px assets. The application sets the rendered sizes in CSS: 17px in move lists, 18px in tooltips, 22px in summaries, 24px in the inline panel, and 30px in the main callout. Board badges scale with the board and the badge-size setting.

All redesigned circles preserve the original base colors with uniform fills. The original snapshot keeps its original gradients for reference.

`review.png` is a saved comparison image. `render-review.mjs` verifies the snapshots and active selections, then regenerates the comparison and selected-set previews using installed Node dependencies and local headless Chrome. `selected-preview.png` shows the active app icons enlarged and at the actual 30px callout size; both use the same SVG file.

Earlier review images are also retained as `first-three.png`, `round-1-complete.png`, and `round-2-review.png`. The previous comparison gallery is preserved as [round-2-review.html](round-2-review.html). The app uses the selection above; all alternatives remain available.

The third-pass comparison is also saved independently as [round-3-review.html](round-3-review.html) and `round-3-review.png`.

The fourth-pass comparison is preserved as [round-4-review.html](round-4-review.html) and `round-4-review.png`; the focused fourth-pass preview remains in [round-4-preview.html](round-4-preview.html) and `round-4-preview.png`.
