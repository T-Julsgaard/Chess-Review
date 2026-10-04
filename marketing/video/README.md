# Chess Review introduction video

A 69-second introduction to Chess Review for YouTube, with its thumbnail,
narration, captions and script. Everything is rendered from this folder, and the
extension itself is filmed rather than mocked. Nothing here is part of the
extension package.

## Files

| File | What it is |
| --- | --- |
| `media/chess-review-intro.mp4` | Finished introduction supplied for the repository, linked from the main README. About 84 MiB; preserved without re-encoding. |
| `media/chess-review-thumbnail.png` | Finished thumbnail supplied for the repository, used as the main README's clickable preview. |
| `out/chess-review-intro.mp4` | The video. 2560×1440 at 60 fps, scaled down from a 3840×2160 render. H.264 High 4:2:0 BT.709 at CRF 12 with a keyframe every half second, AAC-LC 48 kHz stereo at a 384 kb/s target, mastered to -14 LUFS and -2 dBTP. |
| `out/chess-review-thumbnail.jpg`, `.png` | 3840×2160 thumbnail. The JPG is under YouTube's 2 MB limit for uploads from a phone. |
| `out/chess-review-narration.wav`, `.mp3` | The voice alone, timed as in the video, -16 LUFS mono. |
| `captions/chess-review-intro.en.srt`, `.vtt` | English captions, also copied to `out/`. |
| `script/narration-script.json` | The exact text sent to ElevenLabs and the caption text for each sentence. |
| `public/audio/` | The chosen narration take and the music, cached so rendering never calls ElevenLabs. |

`out/` and the UI captures are not in Git. Render them with the steps below.
The selected finished video and thumbnail in `media/` are tracked in Git and
are not overwritten by rendering. To update the video, copy the selected render
from `out/` to `media/chess-review-intro.mp4`. The supplied
`media/chess-review-thumbnail.png` is the only thumbnail source: rendering copies
it unchanged to `out/` and derives the JPG from that PNG. To update the thumbnail,
replace that source PNG directly.

## README video preview

The main [README](../../README.md#watch-the-introduction) displays the thumbnail
as a link to the
[GitHub Pages video](https://t-julsgaard.github.io/Chess-Review/marketing/video/media/chess-review-intro.mp4).
That URL serves the file as `video/mp4`, so browsers with H.264/AAC support open
their video player. GitHub's raw repository URL serves it as
`application/octet-stream` and downloads it instead; the README retains that URL
only for the separate Download link. The thumbnail and download links remain
relative to the repository.

GitHub Pages is already configured to publish the root of `main`. The watch link
uses that published copy; updated videos become available after pushing to
`main` and completing the Pages build. Forks that enable their own Pages hosting
should update the watch URL to their own site. See
[GitHub Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

GitHub's Markdown renderer removes a hand-written `<video>` element, so a video
committed to the repository cannot be embedded that way. An inline player can
instead use a GitHub video attachment URL:

1. Drag the MP4 into GitHub's README editor to upload it as an attachment.
2. Copy the resulting `https://github.com/user-attachments/assets/...` URL.
3. Put that URL on its own line in the README and retain the thumbnail/download
   link as a fallback. Preview the README to confirm playback before committing.

Uploading an attachment immediately publishes it to GitHub; the repository copy
and clickable thumbnail need no separate upload. Nothing has been uploaded as
part of adding this preview. GitHub currently limits video attachments to 10 MB
on free plans or 100 MB on paid plans, so the supplied video needs a paid plan
or a smaller export for this option. See
[GitHub's attachment documentation](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files).

The tracked MP4 is below GitHub's 100 MiB limit for regular Git files, though
it exceeds the 50 MiB warning threshold. It does not require Git LFS. See
[GitHub's file size limits](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github).

## Render

Needs Node.js 24 or newer, ffmpeg on `PATH` and Google Chrome. Set `CHROME_PATH`
if Chrome is not in its default Windows location.

```sh
cd marketing/video
npm ci
npm run capture
npm run render
```

- `npm run capture` takes 5 to 10 minutes and about 1.4 GB. It loads the
  extension into headless Chrome, reviews the featured game and saves frames and
  element positions to `public/captures/`.
- `npm run render` takes about 15 minutes and writes everything in `out/`. Add
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
- **Thumbnail.** Replace `media/chess-review-thumbnail.png` with the supplied
  final image. `src/Thumbnail.tsx` previews that same image in Studio; the export
  copies it unchanged and creates a JPG from it.
- **Words.** Edit `script/narration-script.json`, generate a new take with the
  same voice and model, save it as `public/audio/narration-take.mp3` and run
  `npm run align` (Python 3.10+, numpy and faster-whisper). Then move the chunks
  in `src/data/edit.json` so they fit the new take.

## Script

| Time | Picture | Narration |
| --- | --- | --- |
| 0:00 | The featured game replays. The evaluation graph stays level for 27 moves, then 28.Qxd4 and 28...Qxg2#. | Twenty-seven moves. A close game. Then one pawn grab… and it's mate. So what should you have played? |
| 0:10 | Logo, then the review loading. | This is Chess Review. Free game review for Chess.com and Lichess, with Stockfish running right in your browser. |
| 0:17 | Chess.com and Lichess side by side with their Analyze buttons, from the store screenshots, then a link pasted into the popup. | Finish a game, and click Analyze with Chess Review. Or paste a link, or a PGN. |
| 0:23 | The review. Badges from Brilliant to Blunder, the graph, the Mistake on move 28, the arrow to Rg1, the tried move h3 answered by Qxg2#, accuracy and estimated ratings. | Every move is classified, from Brilliant to Blunder, and the graph shows where the game turned. Move 28, queen takes d4. A mistake. The arrow shows what held. Rook to g1. Try your own idea, and it's rated too. Pawn to h3? Still mate. You also get accuracy for both players, and an estimated performance rating. |
| 0:46 | Practice mode goes back to move 28 and the rook is dragged to g1. | Then, practice your mistakes. Chess Review takes you back to the moment… and you find the better move. |
| 0:53 | The ten coaches, then five board and piece looks. | Choose from ten coaches, and the board and pieces you like. |
| 0:57 | No account. No subscription. Open source. | No account. No subscription. Open source. |
| 1:01 | Logo, Chrome Web Store, source link, the five store screenshots and the independence notice. | Chess Review. Free on the Chrome Web Store. |

## How it was made

- **Footage.** The extension's store files, the same allowlist as
  `scripts/package.mjs`, run in headless Chrome at 1920×1080 with 4× pixels, so
  a full-window capture is 7680×4320. Animations are captured frame by frame at
  60 fps with virtual time. The video is laid out at 1920×1080, rendered at 2×
  and scaled down to 2560×1440. Close-ups up to 2× zoom stay sharp, and the
  downscale smooths edges while the camera moves. Boards, badges, arrows,
  numbers and coaches inside the browser frames are the extension's own output.
  Titles, rings, labels, the opening evaluation graph and the badge strip are
  drawn by the video from the same captured data. The thumbnail is the supplied
  final PNG in `media/`.
- **Voice.** ElevenLabs text to speech through the ElevenLabs connector in
  Claude, model `eleven_v4`. The first version used Justin Case, which sounded
  too much like an American advert. Six calmer voices then read the opening
  lines (Chris, Matt, Ollie, Emma, CJ and Archer). Ollie was dropped for the
  same rising pitch as the first voice and Archer for reading 20% slower than
  the edit allows. The other four read the full script, and CJ, a young voice
  with a light Swedish accent, was picked. The prompt spells "Chess dot com" so
  it is read correctly, and has no direction beyond "[calm]".
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
- **Mix.** The music dips 7 dB while the voice speaks and stays down through
  pauses shorter than 1.5 s. Gentle compression and a limiter run at 4× sample
  rate bring the mix to -14 LUFS with true peaks at -2 dBTP.
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
- The Chess.com and Lichess shots in the one-click scene come from the 1280×800
  store screenshots, shown side by side at about their own size in the 1440p
  video. `tools/prepare-assets.mjs` denoises them and scales them up 3× with
  ffmpeg first, which keeps their text crisp in the 4K render.
- The narrator, CJ, is a professional voice from the ElevenLabs library, which
  means a clone of a real speaker's voice. The music is generated too.

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
- The narration and the music were generated with ElevenLabs on 2026-10-04,
  on a Creator plan. ElevenLabs' pricing page lists a commercial licence and
  music commercial use for that plan.
- Rendering uses [Remotion](https://www.remotion.dev/license), installed by
  `npm ci`. It is free for individuals and companies of up to three people.
  Larger companies need a company licence.
