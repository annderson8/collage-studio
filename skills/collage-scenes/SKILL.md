---
name: collage-scenes
description: Plans and builds the scene images for a surreal photo-collage video — decides per scene which image model makes it, writes the prompts from the style bible and script, generates them on Atlas Cloud (Seedream etc.) or Higgsfield (GPT Image, Seedream, Nano Banana…) after a price confirmation, and splits each scene into a clean background plus one transparent layer per moving piece (Seedream Layer Decomposition, a background remover + local cut-outs, or colour-key cut-outs) ready to animate. Use when someone needs collage scenes/escenas/images generated or split into layers, or as step 4 of collage-reel.
license: MIT
---

# Collage Scenes: plan → generate → split into layers

Input: `style/style.json` (+ `style/refs/`), `script/script.json`. Images the user already has can replace any generated scene.
Output in `<project>/scenes/`: `scenes.json`, `01.png…`, `layers/<id>/` and `manifest.json/js` (format in `collage-reel/references/project-format.md`). Scripts are in this skill's `scripts/` folder; run them from the project root after `npm i puppeteer-core` there.

## 1 · Plan → scenes.json
One scene per script line (`01` = line 0). For each:
```json
{ "id": "01", "line": 0, "source": "generate", "provider": "atlas", "model": "bytedance/seedream-v5.0-pro/edit",
  "prompt": "<style.prompt> + the twist of this line + continuity device + composition notes",
  "pieces": ["red circle", "man", "spool head", "paper tape"], "moment": "the spool head drops on 'Turing'; the tape slides in",
  "split": "bytedance/seedream-v5.0-flash/layer-decomposition" }   // $0.16–0.29 per scene by layer count (tested)
```
**Provider.** Which connectors are live decides it: `atlas` (tools `atlas_*`) or `higgsfield` (tools `generate_image`, `models_explore`…). Both connected: ask the user once which one to use (the one where they have credit or a plan) and keep it for the whole project, so the look stays consistent. Only one connected: use it. The split can use a different provider than the generation (e.g. generate on Higgsfield, decompose on Atlas).

Choose per scene:
- **source**: `generate`, `user` (an image the user gave, copied to `scenes/<id>.png`), or `edit` (derive from an earlier scene for continuity, e.g. same paper and red circle, new object).
- **model on Atlas** (check what's live with `atlas_list_models type=Image` and parameters with `atlas_get_model_info`):
  - default `bytedance/seedream-v5.0-pro/edit`, with the style references as input images (keeps the look);
  - a set that must match closely: `bytedance/seedream-v5.0-lite/edit-sequential` or `bytedance/seedream-v4.7/edit-sequential` (up to 15 coherent images in one request);
  - sharp typography inside the image (rare: captions are drawn in code): `openai/gpt-image-2.5-sunburst/edit`;
  - if a model is missing or can't take the inputs, use the next in Atlas Cloud's default order (GPT Image 2.5 Sunburst, then Nano Banana, then GPT Image 2).
- **model on Higgsfield**: `models_explore` with `action: "recommend"`, `type: "image"`, `input: "image"` and a query like "vintage photo collage from style reference images, 9:16"; then `action: "get"` on the pick for its aspect ratios, parameters and `medias` roles. Default `gpt_image_2_6` (Higgsfield's general model, good at following references); a Seedream model when it is listed and the user prefers it. Don't use the specialised Higgsfield routes (Soul, Marketing Studio, influencers): they change the look.
- **split**: `bytedance/seedream-v5.0-flash/layer-decomposition` (Atlas) by default; `…-pro/layer-decomposition` for crowded scenes; `remove-background` (Higgsfield or Atlas background remover → `cutout.mjs --mask`, when there's no layer decomposition); `local` to use `cutout.mjs` alone (free, best on plain grounds).

Size: the video's aspect (9:16 → the model's closest portrait size, ≥ 1080×1920 when allowed). Seedream 5.0 Pro only takes its preset sizes: 9:16 is `"size": "1584*2816"` (`1440*2560` is rejected); read the list with `atlas_get_model_info`. Ask for `"output_format": "png"`.

### Prompt rules
- Start from `style.prompt`, then the twist, then composition: "the hero in the middle of the frame in front of a giant red circle, small red shapes around it, the top 15% plain graph paper".
- Ask for **clearly separated pieces with space around them** and **plain ground behind them**. It makes the layers clean.
- No text in images. Same continuity device in every scene.
- Keep the **top 15% of the frame as plain ground**: the captions sit there. A big shape in the caption colour (a red circle under red active words) makes them unreadable.
- **In a series with a kit** (`../_kit/kit.json` exists): leave the decorations out of the prompt and say so: "no red circle, no red squares or triangles, no geometry lines, no newspaper scraps: only [the pieces] on plain aged graph paper". Keep the hero where the kit's backdrop sits (centre, ~55–60% down). The split then returns only the real pieces.
- Full template and tips: `references/scene-prompts.md`.

## 2 · Quote, confirm, generate
### On Atlas Cloud
1. References: upload `style/refs/*` once with `atlas_get_upload_url` (one URL serves several files), or reuse library assets with `atlas_search_assets` + `atlas_use_assets`.
2. Quote **every** generation and split call (no `confirmed`) and show one table: scene, model, price, plus the total. **Wait for the user's OK in a new message.** If they change something, withdraw the old quotes with `atlas_cancel_quote` (reason `replaced`).
   Quotes are valid for **1 hour** (`confirmation_valid_seconds`). Quote the splits when you show the approved scenes, not earlier. If a confirmation comes back `expired` (nothing was charged), quote again and ask again: the new quote needs its own OK. A split is billed by the layers it returns, so the quote is a ceiling (tested: quoted $0.306, charged $0.16–0.29).
3. Submit the confirmed calls, poll `atlas_get_prediction`, download each image to `scenes/<id>.png`.
4. Look at all scenes as one row before splitting:
   ```bash
   ffmpeg -y -loglevel error $(for f in scenes/[0-9]*.png; do echo -i $f; done) -filter_complex "$(n=$(ls scenes/[0-9]*.png | wc -l); for i in $(seq 0 $((n-1))); do printf "[$i]scale=240:-1[v$i];"; done; for i in $(seq 0 $((n-1))); do printf "[v$i]"; done; echo "hstack=inputs=$n")" scenes/row.png
   ```
   Check the look is consistent, the twist reads at thumbnail size, the pieces are separable and there's no text. Regenerate only the scenes that fail (quote again). Show the row and **wait for approval**: splitting and animating build on these.

### On Higgsfield
1. References: `media_upload` with `files: [...]` for every `style/refs/*` (and any user image), PUT each file to its `upload_url` with curl, then `media_confirm`. Keep the returned media ids in `scenes/scenes.json` (`"refs": [...]`) so later scenes reuse them without uploading again.
2. Price: `estimate_image_cost` for each scene (same params you'll send: model, prompt, `aspect_ratio` 9:16, `medias` with the role the model lists for references). Show one table (scene, model, credits) and the total; **wait for the user's OK in a new message**. If a call answers with `unlim_choice` (free-trial generations vs credits), put that question to the user; never pick for them.
3. Generate: `generate_image_batch` with one item per scene (one call for the whole set keeps the look consistent), then `jobs_wait` until done. Follow the tool's own rules for the destination folder/project (`get_preferences`). On a timeout, don't resubmit blindly: check the job ids first.
4. Download each result to `scenes/<id>.png` (`curl -L -o scenes/01.png "<result url>"`; convert with ffmpeg if it isn't PNG) and keep the Higgsfield job id per scene in `scenes.json` (`"job_id"`): edits and background removal take it directly.
5. Same contact row and approval as on Atlas (step 4 above). For a scene that drifts, regenerate only that one; to keep continuity, pass the job id of a good scene as an extra reference.

## 3 · Split into layers
**Layer decomposition (Atlas).** Call the split model with `{"image": "asset://<asset_id>"}` (quoted in step 2; use the asset id from the upload so the input doesn't expire before confirmation). What comes back (tested): only files: `…_base.jpeg` (the clean background) and `…_layer_1.png … _layer_N.png`, **each cropped to its piece, often re-rendered at its own scale, with no names, order or positions**. Poll `atlas_get_prediction`: `outputs` stays empty for a few seconds while files copy to Atlas storage (`transfer_pending`); poll again, or use `temporary_outputs` (valid 24 h). Download into `scenes/layers/<id>/` as `base.jpeg` and `layer_1.png …` (keep the numbers).

Then look at the layers as one contact row and write `scenes/layers/<id>/layers.json` to name the pieces you'll animate and skip what you won't (text baked into the image, specks, duplicates):
```json
{ "layers": [ { "file": "layer_1.png", "name": "circle" }, { "file": "layer_5.png", "name": "turing" },
              { "file": "layer_9.png", "skip": true } ] }
```
```bash
node "<skill dir>/scripts/layers-import.mjs" scenes/layers/<id>      # ~20 s per scene; DEBUG=1 shows overlap decisions
```
It finds each layer's **scale and position** by matching it against `scenes/<id>.png`, works out which layer is in front where they overlap, trims, and registers everything in `scenes/manifest.js`. Check the printout: `err` under ~25 is a solid match; a `⚠ weak match` needs a look (or a `"bbox": [x, y, w, h]` in `layers.json`). Then look at the rebuild:
```bash
node "<skill dir>/scripts/layers-check.mjs"      # → scenes/layers/<id>/check.png per scene + scenes/check.png
```
Each check is the original next to the base plus every layer at its imported place, with a labelled box per layer. Missing, shrunken or misplaced pieces show at a glance; fix them with `bbox` or `skip` in `layers.json` and import that scene again.
- Flat shapes (a plain red disc) and pieces partly hidden behind others are handled: the matcher checks that the pixels just outside a piece don't share its colour, caps the cost of anything in front of it, and among near-equal fits keeps the largest.
- Small accents (squares, triangles) often come back upscaled 3–5×; they are kept down to 0.03% of the frame (`--min-area`).
- Thin line drawings (geometry, arcs) are the usual `weak match`: the lines are faint and sparse. If one lands wrong, `skip` it; the base usually keeps a faint copy. Known limit: the base sometimes keeps foreground elements (e.g. rocks in front of figures' feet); one z order can't express that, and it's rarely visible in motion.

**Local cut-outs (free).** For plain grounds, or without Atlas:
```bash
node "<skill dir>/scripts/cutout.mjs" scenes/01.png --name circle --box 190,560,720,720 [--tol 34] [--mask m.png]
node "<skill dir>/scripts/cutout.mjs" scenes/01.png --plate
```
Find boxes by looking at the image; `--mask` takes a full-size alpha mask from any background remover (e.g. `midjourney/v8.2/remove-background` on Atlas).

**Background remover + cut-outs (Higgsfield).** Higgsfield has no layer decomposition; its background remover gives the same result piece by piece:
1. `remove_background` with the scene's `job_id` (or its uploaded media id) and `media_type: "image"`; `jobs_wait`, download to `scenes/layers/<id>/nobg.png`. It must have the scene's size: if not, `ffmpeg -y -i nobg.png -vf scale=<W>:<H> nobg.png`.
2. One cut-out per piece, each with its own box around it and the shared mask: `node "<skill dir>/scripts/cutout.mjs" scenes/01.png --name machine --box 300,1150,500,560 --mask scenes/layers/01/nobg.png`.
3. Ground bands and big flat shapes the remover treats as background (a giant circle, ground bands): cut them with colour-key (no `--mask`), or generate an isolated version ("the [sun] alone on a plain white background", using the scene as reference) and remove its background.
4. `cutout.mjs scenes/01.png --plate` rebuilds the background behind everything cut. For a perfect plate, generate one: "the same image without the [pieces]", with the scene as reference.

## Series kit
Recurring decorations (the continuity circle, geometry lines, small red shapes, newspaper scraps) are ~half the layers of every split, and a split is billed by its layers. Cut them once per series:
```bash
# from a finished reel of the series, its layers already imported; look at them first and pick the cleanest
node "<skill dir>/scripts/kit-build.mjs" ../_kit . circle1=scenes/layers/03/circle.png lines1=scenes/layers/01/lines.png \
     news1=scenes/layers/02/news.png sq1=scenes/layers/01/sq1.png tri1=scenes/layers/01/tri1.png
```
The name sets the kind: `circle*` backdrop, `lines*`/`arc*` geometry, `news*` scrap, anything else accent. 3–4 backdrops, 4–5 geometry, 4–5 scraps and 6 accents give every scene a different mix. It is free and can be run again to add pieces. The folder must be called `_kit` and sit next to the reels.
- Later reels: prompts without the decorations (§ Prompt rules), name a scene's own circle layer `circle` in `layers.json` only when the scene really needs its own; every other scene gets kit decorations automatically in the animation.
- On scenes with plain graph paper behind 2–4 well separated pieces, the local route (background remover + `cutout.mjs --mask`) is also worth trying before the paid split.
- Show the user one still with the kit in place (`render.mjs --stills`) together with the contact row, so they approve the scene as it will look.

## 4 · Check and show
Look at each scene's pieces and plate (a contact row of `scenes/layers/<id>/*.png`): pieces complete, no halos, plate clean where pieces were. Skipped layers vanish from the video (nothing is behind them in the base), so only specks may be skipped: if a visible piece was dropped, lower `--min-area` and rerun the import. Show the user a row per scene and the totals (scenes, pieces, money or credits spent, per provider).
