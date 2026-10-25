# Learning content sources and validation

## Puzzle library

`puzzles.json` contains 50,000 distinct positions from the
[Lichess puzzle database](https://database.lichess.org/#puzzles), whose exports are
dedicated to the public domain under
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
Every record retains its original puzzle ID, game URL, training URL and a SHA-256
of its source CSV row. The archive URL, retrieval timestamp and imported row count
are in the JSON header. The app never downloads puzzles during use.

The importer targets 50,000 positions across three difficulty bands and twelve
themes, requiring at least 500 plays, popularity 85 and rating deviation at most
100. It assigns multi-theme candidates to the least populated eligible group,
caps each group at 2,084 positions and reserves at least twelve per group.
Rare combinations such as advanced mate-in-one positions naturally have fewer
examples; counts are recorded in the JSON header. Difficulty bands use source
ratings below 1,300, 1,300–1,849, and 1,850 or higher, not estimated user ratings.
Positions are deduplicated by the first four FEN fields; reflected copies are
not used to increase the library count. Every setup move and continuation is
legally replayed and every position passes the existing exact-position admission
check. Both the importer and content tests require advertised mate continuations
to end in checkmate. Content tests replay every move of every puzzle; runtime
validation and generated commentary are also checked on a deterministic sample
covering all 36 theme/difficulty groups.

Lichess supplies the solutions and themes from its Stockfish puzzle-generation
pipeline. We do not claim independent engine reproduction of its original
40-meganode searches. As documented by Lichess, player moves are unique winning
continuations except that mate-in-one puzzles can admit multiple mating moves.
The runtime accepts every legal checkmate, and otherwise follows the retained
solution. No runtime engine evaluation is exposed while solving.

To refresh deliberately, use Node 24 and run
`node scripts/import-learning-puzzles.mjs`, then run the learning content tests.
This maintenance command downloads at most a 64 MiB archive prefix and decodes
successive compressed frames until the target and coverage requirements are met.
Ordinary tests, builds and application use stay offline. Existing records and IDs
are retained so saved progress and resumable puzzles survive expansion. A library
already meeting the target is left untouched. Increase the explicit target in the
importer to expand further. Failed or insufficient imports never replace the library.
Records use one JSON line each to keep the larger library compact and reviewable.

The displayed solution commentary is original to Chess Review, derived from
the actual moves and their captures, checks, promotions and tactical targets.

## Other sources considered

The official [Lichess Hugging Face dataset](https://huggingface.co/datasets/Lichess/chess-puzzles)
offers another distribution of the same CC0 puzzle collection, useful for data
tooling rather than adding unique positions. The direct official database is
the source used here. Lichess reported 6,157,341 puzzles in its October 5, 2026
export, leaving substantial room for future expansions.

[ChessTempo](https://chesstempo.com/tos) provides online puzzle practice, but its
terms prohibit bulk downloading problems and screen scraping. It is not used
as a redistributable content source. Free access to solve puzzles alone does
not establish permission to bundle a site's collection.

## Lessons and opening courses

The explanations, common mistakes, plans, annotations and composed teaching
positions in `lib/learning/content.js` and `lib/learning/opening-variations.js` are original project content under the
repository's GPL-3.0 license. Standard opening sequences are legally replayed
and matched against the existing offline `data/book.json` from
[lichess-org/chess-openings](https://github.com/lichess-org/chess-openings), CC0.
Every variation has one annotation per move. Courses teach plans for both colors;
the offline book supplies names and position recognition, not instructional text.
The opening library contains 36 courses, 220 variations and 3,216 annotated half-moves.
Every course has at least six variations; the Ruy Lopez and Sicilian Defense each
have eight. The alternatives cover central exchanges, gambits, quieter setups
and characteristic pawn structures, with continuations illustrating plans rather
than claiming forced or engine-ranked best play. Shared move prefixes reuse the
introductory annotations, and every new continuation has original move notes.
The original two variations retain their indexes and moves for saved study positions.
All variations are legally replayed and checked for their course’s named book
positions, unique course IDs and nonempty move annotations by
`tests/learning-content.test.mjs`.

Each lesson records related existing concept IDs. Technical catalog variants are
grouped into familiar topics instead of presented as research-named lessons.
Rules such as castling, promotion and checkmate use the bundled chess.js. Static
pawn, file, bishop-pair and opposition facts reuse E021 features. Tactical move
exercises reuse E020/E022 mechanics and their exact bounded scopes. Recognition,
objective satisfaction and move quality are separate result fields. None of
these exercises claims an engine-ranked best move. Search exhaustion, invalid
position admission, unsupported objectives and worker failures return
inconclusive, never an incorrect answer.

These are 23 fully authored lessons, not a claim that every entry in the large
research catalog has become a lesson. Provisional research remains preserved and
is not used to certify broader strategic benefit. Further topics can be added
through the same content schema only when their instruction and validation are
complete.
