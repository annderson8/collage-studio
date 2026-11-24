# Collage explainer mode

Still collage images become a narrated short. Every piece is cut out, rebuilt on a clean background and animated in on twos. Torn paper carries you from scene to scene, captions land word by word on the voice, and the only sound is paper.

## The look in one paragraph
Vintage photo cut-outs (sepia/black-and-white people, statues, objects) glued onto flat, paper-textured colour grounds (dusty sky blue, cream), with one oversized impossible object per scene (a moon, a pyramid, a golden mask, a compass, a lemon sun) and a lush foreground band (clover, flowers, grass) that comes back in every scene as the continuity device. Soft drop shadows make everything feel glued on. Captions are bold typewriter caps near the top: the active word is red and the others warm grey, with a paper-coloured outline.

## Pipeline
1. **Scenes**: one image per line of voiceover (6–10 for a 30–60 s piece), all the same aspect ratio as the video. If none exist and an image tool is connected, generate them (`scene-prompts.md`).
2. **Script → cues**: `node voice-sync.mjs voice.mp3 --script script.txt`. Put one sentence per line in `script.txt`. If the line count matches the pauses, each line is cut exactly at its pause.
3. **Pieces**: for each scene, list its 2–6 movable pieces (the big object, each person, props). Cut them out:
   ```bash
   node cutout.mjs scenes/01.png --name moon01 --box 190,60,720,720            # plain backgrounds: colour key
   node cutout.mjs scenes/01.png --name people01 --box 150,950,800,600 --mask masks/01_people.png   # busy ones
   node cutout.mjs scenes/01.png --plate                                        # rebuild what was behind them
   ```
   - Find boxes by viewing the image; boxes may be generous: the key removes the background connected to the box edge.
   - `--tol` 25–45 (raise if sky remains, lower if the piece gets eaten). `--shrink 2` removes the halo.
   - For pieces on busy backgrounds (people in clover), get an alpha mask from a background-removal tool (e.g. a Higgsfield MCP `remove_background`, `rembg`, Photoshop) and pass `--mask`. The mask must be the scene's full size.
   - Plates: the built-in fill is fine for skies and flat grounds. For big holes in detailed areas, ask an image model to "remove the <piece>, keep everything else identical" and use that image as the plate.
   - Always check the cut-outs and plate on a contact row before animating.
4. **Animate**: in `templates/collage.html` set `bg: '<scene>_plate'` per scene (key from `cutouts/manifest.js` → `window.PLATES`) and add one layer per piece. A cut-out layer with no `x/y` lands exactly where it was in the original, so the end state of each scene matches the image the user approved.
5. Stills → render → `score.mjs --style paper` → `deliver.sh ... voice.mp3`.

## Choreography per scene (the part that makes it feel made by hand)
- **Order**: ground first (the foreground band rises), then the giant object (drops with a bounce, pops with overshoot, or swings in from above), then the people rise into place, then the leaves flutter. Stagger by 0.12–0.3 s, never all at once.
- **One little moment per scene**, tied to the line: a compass needle swings to north, a mask's lid drops into place, a hand reaches out of a picture frame, a constellation draws itself upward, a statue floats up a light beam. This is what the viewer remembers; write it in `fx` layers.
- **On twos**: the template steps animation time to 12 drawings/s (`onTwos`). Captions stay smooth.
- **Idle**: big objects bob 5–15 px over 3 s; light things sway; everything has the 1–2 px boil.
- **Scene length**: the line plus ~0.3 s. Hold the last scene ≥1 s after the last word.
- **Torn-paper wipe**: centred on the cut (`TEAR = 0.5` s), bottom to top, white fibre edge with a shadow. Use it for every scene change; it is this style's signature. Vary the seed so no two tears look alike.

## Entrances available in the template
| `in.type` | Motion | Sound event |
|---|---|---|
| `rise` | from below, slight overshoot | rustle |
| `drop` | falls from above, bounces | thud (on the first contact) |
| `pop` | scales up from 0 with overshoot | pop |
| `swing` | swings down from above on a spring | swish |
| `slideL` / `slideR` | slides in from the side | swish |
| `fade` | opacity | rustle |
`leaves: {at, count, x0, x1, y0, y1, vy, life}` makes clover leaves (or swap the `leaf` sprite for petals, stars or paper scraps) flutter with a 3D flip → `flutter` event.

## Captions
- `CAP = {y, size, maxWords, font}`. Defaults: y 230, 74 px Courier Prime bold, ≤3 words, broken at punctuation and pauses.
- Active word `P.capActive` (brick red), past words `P.capPast` (warm grey), outline `P.capEdge` (paper).
- With `--transcript` word timestamps the words land exactly; with `--script` they are estimated by length inside each line (good enough for 2–3 word chunks).

## Intro / outro patterns that work
- **Hook**: start on the most impossible image with the boldest line in the first second. Don't start on a title.
- **Tutorial-style intro** (show how it was made): a cream "plate" card (thin double frame, small caps "PLATE IX", italic serif subtitle) then screen recordings framed as cards. Keep each step ≤3 s.
- **Outro**: hold the final image, last caption, then a dark card with the creator's name. Leave the bottom 250 px clear.

## Sound: paper only
`node score.mjs out.events.json sfx.wav --style paper`: tears on wipes, soft thumps when objects land, pops, swishes, leaf ticks and a faint room tone. No music: the voice carries it. In `deliver.sh` the effects sit at 0.5× under the voice (5th argument to change).
