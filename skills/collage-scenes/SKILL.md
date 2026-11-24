---
name: collage-scenes
description: Plans and builds the scene images for a surreal photo-collage video — decides per scene which image model makes it, writes the prompts from the style bible and script, generates them on Atlas Cloud (Seedream etc.) after a price confirmation, and splits each scene into a clean background plus one transparent layer per moving piece (Seedream Layer Decomposition, or local cut-outs) ready to animate. Use when someone needs collage scenes/escenas/images generated or split into layers, or as step 4 of collage-reel.
license: MIT
---

# Collage Scenes: plan → generate → split into layers

Input: `style/style.json` (+ `style/refs/`), `script/script.json`. Images the user already has can replace any generated scene.
Output in `<project>/scenes/`: `scenes.json`, `01.png…`, `layers/<id>/` and `manifest.json/js` (format in `collage-reel/references/project-format.md`). Scripts are in this skill's `scripts/` folder; run them from the project root after `npm i puppeteer-core` there.

## 1 · Plan → scenes.json
One scene per script line (`01` = line 0). For each:
```json
{ "id": "01", "line": 0, "source": "generate", "model": "bytedance/seedream-v5.0-pro/edit",
  "prompt": "<style.prompt> + the twist of this line + continuity device + composition notes",
  "pieces": ["moon", "three figures", "clover band"], "moment": "moon drops and bobs; leaves float up",
  "split": "bytedance/seedream-v5.0-flash/layer-decomposition" }   // ≈ $0.22 per scene (tested)
```
Choose per scene:
- **source**: `generate`, `user` (an image the user gave, copied to `scenes/<id>.png`), or `edit` (derive from an earlier scene for continuity, e.g. same field and figures, new object).
- **model** (check what's live with `atlas_list_models type=Image` and parameters with `atlas_get_model_info`):
  - default `bytedance/seedream-v5.0-pro/edit`, with the style references as input images (keeps the look);
  - a set that must match closely: `bytedance/seedream-v5.0-lite/edit-sequential` or `bytedance/seedream-v4.7/edit-sequential` (up to 15 coherent images in one request);
  - sharp typography inside the image (rare: captions are drawn in code): `openai/gpt-image-2.5-sunburst/edit`;
  - if a model is missing or can't take the inputs, use the next in Atlas Cloud's default order (GPT Image 2.5 Sunburst, then Nano Banana, then GPT Image 2).
- **split**: `bytedance/seedream-v5.0-flash/layer-decomposition` by default; `…-pro/layer-decomposition` for crowded scenes; `local` to use `cutout.mjs` (free, best on plain grounds).

Size: the video's aspect (9:16 → the model's closest portrait size, ≥ 1080×1920 when allowed).

### Prompt rules
- Start from `style.prompt`, then the twist, then composition: "giant <object> in the upper half, figures small in the lower third, clover band along the bottom, plain sky between them".
- Ask for **clearly separated pieces with space around them** and **plain ground behind them**. It makes the layers clean.
- No text in images. Same continuity device in every scene.
- Full template and tips: `references/scene-prompts.md`.

## 2 · Quote, confirm, generate
1. References: upload `style/refs/*` once with `atlas_get_upload_url` (one URL serves several files), or reuse library assets with `atlas_search_assets` + `atlas_use_assets`.
2. Quote **every** generation and split call (no `confirmed`) and show one table: scene, model, price, plus the total. **Wait for the user's OK in a new message.** If they change something, withdraw the old quotes with `atlas_cancel_quote` (reason `replaced`).
3. Submit the confirmed calls, poll `atlas_get_prediction`, download each image to `scenes/<id>.png`.
4. Look at all scenes as one row before splitting:
   ```bash
   ffmpeg -y -loglevel error $(for f in scenes/[0-9]*.png; do echo -i $f; done) -filter_complex "$(n=$(ls scenes/[0-9]*.png | wc -l); for i in $(seq 0 $((n-1))); do printf "[$i]scale=240:-1[v$i];"; done; for i in $(seq 0 $((n-1))); do printf "[v$i]"; done; echo "hstack=inputs=$n")" scenes/row.png
   ```
   Check the look is consistent, the twist reads at thumbnail size, the pieces are separable and there's no text. Regenerate only the scenes that fail (quote again). Show the row and **wait for approval**: splitting and animating build on these.

## 3 · Split into layers
**Layer decomposition (Atlas).** Call the split model with `{"image": "asset://<asset_id>"}` (quoted in step 2; use the asset id from the upload so the input doesn't expire before confirmation). What comes back (tested): only files: `…_base.jpeg` (the clean background) and `…_layer_1.png … _layer_N.png`, **each cropped to its piece, often re-rendered at its own scale, with no names, order or positions**. Poll `atlas_get_prediction`: `outputs` stays empty for a few seconds while files copy to Atlas storage (`transfer_pending`); poll again, or use `temporary_outputs` (valid 24 h). Download into `scenes/layers/<id>/` as `base.jpeg` and `layer_1.png …` (keep the numbers).

Then look at the layers as one contact row and write `scenes/layers/<id>/layers.json` to name the pieces you'll animate and skip what you won't (text baked into the image, specks, duplicates):
```json
{ "layers": [ { "file": "layer_8.png", "name": "moon" }, { "file": "layer_5.png", "name": "pharaoh_left" },
              { "file": "layer_9.png", "skip": true } ] }
```
```bash
node "<skill dir>/scripts/layers-import.mjs" scenes/layers/<id>      # ~20 s per scene; DEBUG=1 shows overlap decisions
```
It finds each layer's **scale and position** by matching it against `scenes/<id>.png`, works out which layer is in front where they overlap, trims, and registers everything in `scenes/manifest.js`. Check the printout: `err` under ~25 is a solid match; a `⚠ weak match` needs a look (or a `"bbox": [x, y, w, h]` in `layers.json`). Verify by rendering the animation's last frame next to the scene image: they should look the same. Known limit: the base sometimes keeps foreground elements (e.g. clover in front of figures' legs); one z order can't express that, and it's rarely visible in motion.

**Local cut-outs (free).** For plain grounds, or without Atlas:
```bash
node "<skill dir>/scripts/cutout.mjs" scenes/01.png --name moon --box 190,60,720,720 [--tol 34] [--mask m.png]
node "<skill dir>/scripts/cutout.mjs" scenes/01.png --plate
```
Find boxes by looking at the image; `--mask` takes a full-size alpha mask from any background remover (e.g. `midjourney/v8.2/remove-background` on Atlas).

## 4 · Check and show
Look at each scene's pieces and plate (a contact row of `scenes/layers/<id>/*.png`): pieces complete, no halos, plate clean where pieces were. Skipped layers vanish from the video (nothing is behind them in the base), so only specks may be skipped: if a visible piece was dropped, lower `--min-area` and rerun the import. Show the user a row per scene and the totals (scenes, pieces, money spent).
