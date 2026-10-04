# Chess Review introduction video

A 69-second introduction to Chess Review for YouTube, with its thumbnail,
narration, captions and script. Everything is rendered from this folder, and the
extension itself is filmed rather than mocked. Nothing here is part of the
extension package.

## Files

| File | What it is |
| --- | --- |
| `out/chess-review-intro.mp4` | The video. 1920×1080 at 60 fps, H.264 High 4:2:0 BT.709 at CRF 12 with a keyframe every half second, AAC-LC 48 kHz stereo at a 384 kb/s target, mastered to -14 LUFS and -2 dBTP. |
| `out/chess-review-thumbnail.jpg`, `.png` | 3840×2160 thumbnail. The JPG is under YouTube's 2 MB limit for uploads from a phone. |
| `out/chess-review-narration.wav`, `.mp3` | The voice alone, timed as in the video, -16 LUFS mono. |
| `captions/chess-review-intro.en.srt`, `.vtt` | English captions, also copied to `out/`. |
| `script/narration-script.json` | The exact text sent to ElevenLabs and the caption text for each sentence. |
| `public/audio/` | The chosen narration take and the music, cached so rendering never calls ElevenLabs. |

`out/` and the UI captures are not in Git. Render them with the steps below.

## Render

Needs Node.js 24 or newer, ffmpeg on `PATH` and Google Chrome. Set `CHROME_PATH`
if Chrome is not in its default Windows location.

```sh
cd marketing/video
npm ci
npm run capture
npm run render
```

- `npm run capture` takes about 20 minutes. It loads the extension into headless
  Chrome, reviews the featured game and saves frames and element positions to
  `public/captures/`.
- `npm run render` takes a few minutes and writes everything in `out/`. Add
  `-- --only=video` (or `captions`, `audio`, `thumbnail`) to redo one step.
- `npm run studio` opens Remotion Studio to scrub the timeline.
- `npm run typecheck` checks the TypeScript.

## Change something

- **Timing.** `src/data/edit.json` places each narration chunk on the timeline,
  in seconds. Scenes time their beats from spoken words with `word()` in
  `src/lib/narration.ts`. Each scene's start and end are constants at the top of
  its file in `src/scenes/`.
- **Pictures.** One file per scene in `src/scenes/`, camera moves in
  `src/lib/camera.ts`. Overlays are placed from the element boxes the capture
  records, so they follow the UI after `npm run capture`.
- **Sound.** Music level, ducking and effects are in `src/Soundtrack.tsx`.
  Mastering targets are in `tools/render.mjs`.
- **Thumbnail.** `src/Thumbnail.tsx`, laid out at 1280×720 and rendered at 3×.
- **Words.** Edit `script/narration-script.json`, generate a new take with the
  same voice and model, save it as `public/audio/narration-take.mp3` and run
  `npm run align` (Python 3.10+, numpy and faster-whisper). Then move the chunks
  in `src/data/edit.json` so they fit the new take.

## Script

| Time | Picture | Narration |
| --- | --- | --- |
| 0:00 | The featured game replays. The evaluation graph stays level for 27 moves, then 28.Qxd4 and 28...Qxg2#. | Twenty-seven moves. A close game. Then one pawn grab… and it's mate. So what should you have played? |
| 0:10 | Logo, then the review loading. | This is Chess Review. Free game review for Chess.com and Lichess, with Stockfish running right in your browser. |
| 0:17 | The Analyze button on Chess.com and Lichess, from the store screenshots, then a link in the popup. | Finish a game, and click Analyze with Chess Review. Or paste a link, or a PGN. |
| 0:23 | The review. Badges from Brilliant to Blunder, the graph, the Mistake on move 28, the arrow to Rg1, the tried move h3 answered by Qxg2#, accuracy and estimated ratings. | Every move is classified, from Brilliant to Blunder, and the graph shows where the game turned. Move 28, queen takes d4. A mistake. The arrow shows what held. Rook to g1. Try your own idea, and it's rated too. Pawn to h3? Still mate. You also get accuracy for both players, and an estimated performance rating. |
| 0:46 | Practice mode goes back to move 28 and the rook is dragged to g1. | Then, practice your mistakes. Chess Review takes you back to the moment… and you find the better move. |
| 0:53 | The ten coaches, then five board and piece looks. | Choose from ten coaches, and the board and pieces you like. |
| 0:57 | No account. No subscription. Open source. | No account. No subscription. Open source. |
| 1:01 | Logo, Chrome Web Store, source link, the five store screenshots and the independence notice. | Chess Review. Free on the Chrome Web Store. |

## How it was made

- **Footage.** The extension's store files, the same allowlist as
  `scripts/package.mjs`, run in headless Chrome at 1920×1080 with 2× pixels.
  Animations are captured frame by frame at 60 fps with virtual time. Boards,
  badges, arrows, numbers and coaches inside the browser frames are the
  extension's own output. Titles, rings, labels, the opening evaluation graph,
  the badge strip and the thumbnail's enlarged badge are drawn by the video from
  the same captured data.
- **Voice.** ElevenLabs text to speech through the ElevenLabs connector in
  Claude, model `eleven_v4`. Four voices read the same test line with Chess.com,
  Lichess and Stockfish in it (Justin Case, Ashton, Harper Lawson and Ellis).
  Justin Case got two full takes and Ellis one. The first Justin Case take won
  for its calm, low read and clear words. The prompt spells "Chess dot com" so it
  is read correctly.
- **Timing.** `tools/align_narration.py` transcribes the take with faster-whisper
  large-v3, matches the words to the script and cuts the take at the quietest
  point between sentences. Each chunk was transcribed again from the final mix
  to check it is still clear over the music.
- **Music.** One 75-second instrumental from Eleven Music
  (`eleven_music_v2_5`), used from 2.5 seconds in. The prompt was "Minimal modern
  electronic underscore: soft felt piano motif and warm analog synth pads over a
  gentle steady pulse at 92 BPM, light muted percussion and a round sub bass,
  clean spacious production that leaves room for a spoken voiceover, no vocals.
  Starts sparse and quietly suspenseful for the first ten seconds, settles into a
  calm confident groove, lifts gently in the last fifteen seconds, then resolves
  on a sustained warm chord."
- **Effects.** The extension's own move sounds from `sounds/fx/`.
- **Mix.** The music dips 7 dB while the voice speaks. Gentle compression and a
  limiter run at 4× sample rate bring the mix to -14 LUFS with true peaks at
  -2 dBTP.
- **Captions.** `tools/captions.mjs` writes one cue per sentence from the aligned
  timings, at most two lines of 42 characters.

## Where each claim comes from

| Claim | Source |
| --- | --- |
| Free, for Chess.com and Lichess, no account, no subscription | `README.md`, `PRIVACY.md`, the Chrome Web Store listing |
| Stockfish 18 NNUE running in the browser | `README.md`, `ATTRIBUTIONS.md` (the default engine) |
| The Analyze with Chess Review button, a link or a PGN in the popup | `content.js`, `lichess-content.js`, `popup.html` |
| Classes from Brilliant to Blunder, the graph, the arrow, rated own moves | The captured review |
| Level within ±1.2 for 27 moves, 28.Qxd4 marked Mistake, 28.Rg1 held, 28.h3 still allows Qxg2# | The captured review of the featured game with default settings. Before move 28 the evaluation stays between -1.12 and +0.74, and it is -0.41 with Rg1 still available. |
| Accuracy and estimated performance rating, shown as estimates that other tools can differ from | `README.md` |
| Practice your mistakes | The captured practice mode |
| Ten coaches | The coach picker in `analysis.js` offers the ten coaches with animated portraits |
| Analysis on your device, nothing sent to the developer | `PRIVACY.md` |
| Open source, GPL-3.0 | `LICENSE` |
| Not affiliated with, endorsed by or sponsored by Chess.com or Lichess | `ATTRIBUTIONS.md` |

## Choices and limits

- The featured game is a public Chess.com game played by Julsgaard, whose games
  also appear in the store screenshots. The opponent's name is replaced with
  "Opponent" and their flag is hidden in every capture. The popup shot still
  shows the game's link, as a user would paste it.
- Firefox is left out because the Firefox Add-ons page returned 404 on
  2026-10-04. Add it to the end card once the listing is live.
- The video gives no review time, promises no rating gain and compares no
  numbers with other sites.
- 28.Qxd4 keeps the extension's own label, Mistake, even though it allows mate
  in one.
- The coaches are shown as named characters. The video does not call them AI or
  say they answer questions.
- The narrator, Justin Case, is a professional voice from the ElevenLabs
  library, which means a clone of a real speaker's voice. The music is
  generated too.

## Publishing on YouTube

Nothing has been uploaded. When it is:

- Upload `out/chess-review-intro.mp4`, which uses YouTube's recommended
  container, codecs, keyframe interval and audio settings, and
  `out/chess-review-thumbnail.jpg`. Custom thumbnails need a verified channel.
- Add `captions/chess-review-intro.en.srt` as English subtitles.
- Answer Yes under "AI use". YouTube's disclosure page lists AI-generated music
  among the content to disclose, and the narrator is a clone of a real
  speaker's voice.

Title

```text
Chess Review - free game review for Chess.com and Lichess
```

Description

```text
Chess Review is a free, open-source browser extension for reviewing your finished Chess.com and Lichess games, with Stockfish running locally in your browser.

- Every move classified, from Brilliant to Blunder
- An evaluation graph and best-move arrows
- Try your own moves and see them rated
- Accuracy for both players and an estimated performance rating. Both are estimates from Chess Review's own scoring and can differ from other tools.
- Practice your mistakes from the position where they happened
- 10 coaches, board themes and piece sets
- No account and no subscription. Analysis runs on your device.

Get it on the Chrome Web Store
https://chromewebstore.google.com/detail/chess-review/pdbffcjdmcadihmnmenkadndbdbigfam

Source code (GPL-3.0)
https://github.com/T-Julsgaard/Chess-Review

Chess Review is an independent project. It is not affiliated with, endorsed by, or sponsored by Chess.com or Lichess.
Narration and music made with ElevenLabs.
```

## Credits and licences

- The code in this folder is GPL-3.0, like the rest of the repository.
- The footage shows the extension with its Cburnett and Merida pieces (GPLv2+)
  and the project's own badges, sounds, coach artwork and backgrounds (GPL-3.0).
  The logo mark is drawn with the Cburnett knight. See
  [ATTRIBUTIONS.md](../../ATTRIBUTIONS.md).
- Inter and Fira Mono are used under the SIL Open Font License 1.1 and copied
  from `fonts/` with their licences.
- The end card shows the screenshots in
  [marketing/chrome-web-store](../chrome-web-store).
- The narration and the music were generated with ElevenLabs on 2026-10-04.
  Their use follows the plan of the ElevenLabs account that generated them.
- Rendering uses [Remotion](https://www.remotion.dev/license), installed by
  `npm ci`. It is free for individuals and companies of up to three people.
  Larger companies need a company licence.
