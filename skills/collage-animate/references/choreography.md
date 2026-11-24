# Choreography: making collage pieces feel made by hand

## Scene anatomy (CUSTOM_SCENES)
```js
const CUSTOM_SCENES = [
  { id: '01', start: 0, bg: '01', layers: [                       // bg = plate key from PLATES
    { a: '01_clover_band', in: { type: 'rise', at: 0, dur: .5 } },  // a = key from CUTOUTS; no x/y = original position
    { a: '01_moon', in: { type: 'drop', at: .35, dur: .9 }, idle: { bob: 6, period: 3.6 } },
    { leaves: { at: 1.0, count: 10, x0: 80, x1: 1000, y0: 1500, y1: 1700, vy: -150, life: 3 } },
    { a: '01_figures', in: { type: 'rise', at: .6, dur: .55 } },
    { fx: (g, t) => { /* the scene's little moment */ } },
  ] },
  { id: '02', start: cue(1) - .05, bg: '02', layers: [ /* ... */ ] },
];
```
- Layers draw in list order: back to front. Keep the z order of the manifest unless a moment needs otherwise.
- `start: cue(i) - .05` cuts a hair before the word. The torn-paper wipe (`TEAR = .5`) is centred on `start`.
- A piece with `x/y` set is placed there (centre, scaled by `s`); without, it lands where it sat in the image (`ax/ay` = anchor, default centre).
- Land the hero on the key word: `in.at = word.start - scene.start - dur * hit`. `hit` = .36 for `drop` (first contact), .25 for `pop`, 0 for `swing/slide`.

## Order and timing
- Ground first (the foreground band rises), then the giant object (drops with a bounce, pops with overshoot, or swings in from above), then the people rise into place, then leaves flutter.
- Stagger entrances by 0.12–0.3 s, never all at once.
- Scene length = its line + ~0.3 s. Hold the last scene ≥ 1 s after the last word.
- On twos: the engine steps animation time to 12 drawings/s (`onTwos`); captions stay smooth.
- Idle: big objects bob 5–15 px over ~3 s; light things sway (`sway: .02`); everything boils 1–2 px (`jitter`, default 1; 0 for pieces that must stay rock-still).

## Entrances
| `in.type` | Motion | Sound event |
|---|---|---|
| `rise` | from below, slight overshoot | rustle |
| `drop` | falls from above, bounces | thud (first contact) |
| `pop` | scales from 0 with overshoot | pop |
| `swing` | swings down on a spring | swish |
| `slideL` / `slideR` | slides in from a side | swish |
| `fade` | opacity only | rustle |

`leaves: {at, count, x0, x1, y0, y1, vy, life}` makes clover leaves flutter with a paper flip (`flutter` event). Swap the `leaf` sprite in `DEMO` for petals, stars or paper scraps that fit the style.

## Little moments (fx layers)
An `fx` layer is `(g, t, f) => {}` drawn in place, `t` = seconds since scene start (stepped on twos). Use `prog(t, at, dur)` and the easings in `E`. Draw sprites with `g.drawImage(SPR[key].c, …)`; read a piece's home position from `SPR[key].home`.
- **Needle swings to north**: a thin needle drawn over the compass, rotation `lerp(-1.2, 0, E.spring(prog(t, .8, 1.2)))`.
- **Lid drops into place**: cut the lid as its own piece (`drop`), the rest pops first.
- **Hand reaches out of a frame**: clip to the frame's opening (`g.save(); g.beginPath(); g.rect(...); g.clip()`), slide the arm piece out along its axis with `E.outBack`.
- **Constellation draws upward**: stars as dots, lines drawn with progress `p` from the tip upward, a small glow (`g.globalCompositeOperation = 'lighter'`).
- **Statue floats up a beam**: `beam(g, x, y0, y1, p)` then the statue with `y -= E.inOut(prog(t, 1, 2)) * 300`.
- Add `window.EVENTS`-style sounds for custom moments by pushing to the list in `buildEvents()` (`{t, type: 'swish' | 'tick' | 'chime' | 'riser' | 'impact'}`).

## Captions
Style comes from `style.js`: font, size, y, colours, max words per chunk (default 3), uppercase. Chunks never cross a sentence end or a pause. The active word is `capActive`; past words are `capPast`; the outline is `capEdge`. If a scene's sky is busy behind the captions, raise `edge` or move `y`.

## Sound: paper only
`score.mjs --style paper`: tears on wipes, soft thumps when objects land, pops, swishes, leaf ticks and a faint room tone. No music: the voice carries it. `deliver.sh` puts the effects at 0.5× under the voice (5th argument to change). `--style paper+music` adds a quiet pad that changes chord at every scene.

## Common failures
- Halo around a piece → the layer has background pixels at its edge; ask `collage-scenes` to re-split or use `cutout.mjs --shrink 3`.
- A hole appears when a piece moves → the plate wasn't clean behind it; re-split, or keep that piece's entrance short and its idle small.
- Pieces pop in all at once → staggers missing; the automatic pass is only a start.
- Captions over a bright object → move `CAP.y`, or reposition the piece's entrance so it lands below the caption band.
