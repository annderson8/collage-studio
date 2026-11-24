# Generating the scenes (collage mode)

Prompt craft for `collage-scenes`. The models and the generate/confirm flow are in its SKILL.md (Atlas Cloud or Higgsfield; any connected image tool works the same way).

## 1 · Turn the script into scenes
One scene per line of voiceover. For each line write: the **impossible image** (what ordinary thing does something impossible?), the pieces that will move, and the one little moment that will animate.

Give every scene a visual twist. What makes this style stop the scroll is **something ordinary doing something impossible**: a lemon becomes the sun, a hand reaches out of a painting, a paper tape becomes a zebra crossing. Literal scenes ("Turing + computer") look generic.

Keep one continuity device across all scenes (the same giant red circle, the same paper, the same group of people).

## 2 · Scene prompt template
```
Vertical 9:16 surreal vintage photo collage, [SUBJECT DOING SOMETHING IMPOSSIBLE].
Cut-out black-and-white / sepia vintage photographs of [PEOPLE/OBJECTS] glued onto a flat
[starry black] paper-textured background, oversized [OBJECT] as the focal point,
[grey desert hills] along the bottom third.
Soft drop shadows under every cut-out, visible paper grain, risograph-like muted palette,
clean separated elements with clear edges (each piece easy to cut out), no text, no frame.
Match the style of the reference images exactly.
```
- Attach the style references to every call (Atlas: `asset://` ids; Higgsfield: media ids in `medias`). If uploading from chat fails, upload them to the tool's library first and reference them from there.
- Ask for **separated elements with clear edges** and **plain background areas**: it makes the cut-outs clean.
- No text in the images; the captions are drawn in code.
- Keep the top 15% of the frame as plain ground: the captions go there.
- Generate all scenes in one batch when the tool supports it, so the look stays consistent; regenerate only the scenes that drift.

### Tested example (graph-paper science collage, Seedream 5.0 Pro edit, the reference image as input)
```
Vertical 9:16 surreal vintage photo collage on aged cream graph paper with a fine light teal grid, paper stains
and grain. A giant flat red-orange circle with a subtle printed texture sits behind the main subject. Main subject:
a black-and-white halftone cut-out photo of a 1940s wooden cipher machine with rotors and a keyboard, its lid open
like a birdcage door, in the lower middle of the frame; above it a flock of round vintage typewriter keys fly upward
like birds, well separated from each other. Thin black hand-drawn geometry lines and arcs, a few small flat red
squares and triangles. Keep the top 15% of the frame as plain graph paper. Clean separated elements with clear edges
and plain paper around each piece, generous empty space, faint soft drop shadows, no text, no letters on the keys,
no numbers, no formulas. Match the style of the reference image exactly, but do not copy its subjects.
```
All six prompts of the demo reel: `examples/alan-turing/scenes/prompts.json` in the repository. "Do not copy its subjects" matters: without it the model reuses the reference's figures.

## 3 · Helpful extras to request
- A **clean plate** per scene ("the same image without the [object] and people") gives a perfect background behind the pieces.
- An **isolated version** of hard pieces ("the [statue] alone on a plain white background") keys out perfectly with `cutout.mjs`.
- Layer decomposition does the cut-outs; for a single hard piece, a background remover's output can go to `cutout.mjs --mask`.

## 4 · Show before splitting
Show the user the scenes as one contact row with the one-line twist for each, and wait for approval.
