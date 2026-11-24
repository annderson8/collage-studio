# Drawing recipes (drawn mode)

Small helpers that keep coming back. Write each as a function; pre-render everything static once in `makeAssets()`; keep `render(f)` pure. The paper texture, sprite, easing, `onTwos`, grain and torn-edge helpers already exist in `templates/collage.html`; copy them from there.

## Line and texture
- **Ink line**: turn a polyline into a filled ribbon of varying width with tapered ends; reseed the wobble every 2 frames (boil); draw-on progress `p` with a nib dot at the tip.
- **Paper**: base colour, soft mottled blobs, fibres, specks and per-pixel noise baked into one canvas (`paperTexture`). **Grain**: 4 noise frames cycled with `overlay` at ~0.15.
- **Watercolour**: clip to the shape, add soft radial washes, granulation specks and a blurred darker edge, then draw white "resist" lines over it.
- **Riso / screen print**: each ink is a rotated halftone dot layer, multiply-blended and offset 1–3 px (misregistration).
- **Stipple / engraving**: turn intensity into dots, plus parallel hatching clipped to the shadow side.
- **Text or ASCII inside a shape**: render the shape to a mask, sample it on a coarse grid, and draw a letter or a 3×5 dot glyph per filled cell.
- **Outline of any mask**: the mask minus the mask eroded by 8 offset `destination-in` draws. **Pen tracing a silhouette**: marching-squares contour of the mask, then the ink line with progress.
- **X-ray**: a translucent blurred body, bones as gradient capsules along the rig, and a blurred `lighter` copy for glow.

## Time and motion
- **Time warp**: `tau(t)` = the integral of a rate function (1 normal, 0.1 slow-mo, 0 freeze) drives the subject, its particles and its sound events, so slow-mo stays in sync.
- **Cycles**: periodic keyframes for gallop, walk and wings; 2-bone IK for limbs; check a 12-pose sheet before animating.
- **Particles** are anchored in world coordinates so they stay behind a moving camera. Seed each particle by its index, never by frame.
- **Easing personality**: `outBack` (playful overshoot), `spring` (swing and settle), `outBounce` (drops), `inOut` (camera). Every move lands with a hold.

## Transitions
- Clip-path wipes by a line fixed in the world, iris circles from a dot, windows that grow to fill the frame, flashes only on real impacts.
- Torn paper (`tearWipe` in the template), ink spreading (a growing noisy blob as a clip), a scanner bar.

## Type
- Typewriter reveal driven by events (footfalls, beats); words assembled from particles; word-by-word captions (`drawCaptions` in the template).
- Load Google Fonts with a timeout (`Promise.race([document.fonts.load(...), sleep(4000)])`) so offline renders don't hang.

## Performance
- `getContext('2d', {willReadFrequently: true})` is required: the renderer reads every frame.
- Avoid `filter: blur()` and `shadowBlur` per frame on big layers. Bake them into sprites.
- `render.mjs --jobs N` splits frames across N browsers (possible because `render(f)` is pure). 4 jobs on a laptop renders 15 s of 1080×1920 in roughly a minute for collage-weight scenes.

## Sound (extending score.mjs)
`score.mjs` already has a TPT state-variable filter, a reverb bus, soft-clip, peak normalisation and NaN/silence guards. For a full score in drawn mode, add instruments to `SFX` and drive them from `window.EVENTS`:
- **Karplus–Strong pluck**: a noise burst into a delay line of length SR/f with an averaging low-pass in the loop.
- **Inharmonic bell**: partials ×1, 2.76, 5.4, 8.93 with faster decay for higher partials (`chime`).
- **Pad**: detuned sines per chord note; change the chord where the picture changes (`--style paper+music`).
- **Synth**: saw/square through a one-pole low-pass. **Drums**: kick = sine sweep 150→45 Hz; clap = 3 bursts of band-passed noise; hat = high-passed noise, 30 ms.
- **Risers** into transitions, **sub-drop impacts** on them, silence on a freeze.
- Unknown note names produce NaN: the guard throws.
