# Generating the scenes (collage mode)

Prompt craft for `collage-scenes`. The models and the generate/confirm flow are in its SKILL.md (Atlas Cloud by default; any connected image tool works the same way).

## 1 · Turn the script into scenes
One scene per line of voiceover. For each line write: the **impossible image** (what ordinary thing does something impossible?), the pieces that will move, and the one little moment that will animate.

Give every scene a visual twist. What makes this style stop the scroll is **something ordinary doing something impossible**: a lemon becomes the sun, a hand reaches out of a painting, a pyramid floats on a bed of clover. Literal scenes ("pyramid + UFO") look generic.

Keep one continuity device across all scenes (the same clover field, the same sky colour, the same group of people).

## 2 · Scene prompt template
```
Vertical 9:16 surreal vintage photo collage, [SUBJECT DOING SOMETHING IMPOSSIBLE].
Cut-out black-and-white / sepia vintage photographs of [PEOPLE/OBJECTS] glued onto a flat
[dusty sky-blue] paper-textured background, oversized [OBJECT] as the focal point,
lush [clover field with small cream flowers] along the bottom third.
Soft drop shadows under every cut-out, visible paper grain, risograph-like muted palette,
clean separated elements with clear edges (each piece easy to cut out), no text, no frame.
Match the style of the reference images exactly.
```
- Attach the style references to every call. If uploading from chat fails, upload them to the tool's library first and reference them from there.
- Ask for **separated elements with clear edges** and **plain background areas**: it makes the cut-outs clean.
- No text in the images; the captions are drawn in code.
- Generate all scenes in one batch when the tool supports it, so the look stays consistent; regenerate only the scenes that drift.

## 3 · Helpful extras to request
- A **clean plate** per scene ("the same image without the [object] and people") gives a perfect background behind the pieces.
- An **isolated version** of hard pieces ("the [statue] alone on a plain white background") keys out perfectly with `cutout.mjs`.
- Layer decomposition does the cut-outs; for a single hard piece, a background remover's output can go to `cutout.mjs --mask`.

## 4 · Show before splitting
Show the user the scenes as one contact row with the one-line twist for each, and wait for approval.
