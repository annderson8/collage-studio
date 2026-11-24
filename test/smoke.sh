#!/usr/bin/env bash
# End-to-end smoke test of every collage-* script on a synthetic project (no network, no paid APIs).
# Needs Chrome/Edge + ffmpeg + `npm install` at the repo root.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd); S=$ROOT/skills
P=$(mktemp -d); trap 'rm -rf "$P"' EXIT; cd "$P"
mkdir -p style script voice scenes build && ln -s "$ROOT/node_modules" node_modules
ok() { echo "✓ $1"; }
fail() { echo "✗ $1"; exit 1; }

node "$S/collage-animate/scripts/render.mjs" --check >/dev/null || fail "environment (run: node render.mjs --check)"; ok "environment"

# style
echo 'window.STYLE = {"format":"9:16","palette":{"capActive":"#c0392b"},"captions":{"font":"Courier Prime","size":70}};' > style/style.js

# voice: three tone "phrases" separated by silence
printf "One line here.\nA second line.\nAnd the last line.\n" > script/script.txt
ffmpeg -loglevel error -f lavfi -i "sine=f=220:d=1.2" -f lavfi -i "anullsrc=r=48000:cl=mono" -f lavfi -i "sine=f=260:d=1" -f lavfi -i "sine=f=300:d=1.4" \
  -filter_complex "[1]atrim=0:0.6[s1];[1]atrim=0:0.6[s2];[0][s1][2][s2][3]concat=n=5:v=0:a=1" voice/voice.mp3
node "$S/collage-voice/scripts/voice-sync.mjs" voice/voice.mp3 --script script/script.txt --out voice/voice | grep -q "3 phrases" || fail "voice-sync"; ok "voice-sync (3 phrases)"
cat > voice/transcript.json <<'J'
{"words":[{"word":"One","start":0,"end":0.3},{"word":"lyne","start":0.3,"end":0.6},{"word":"here.","start":0.6,"end":1.2},
{"word":"A","start":1.8,"end":2.0},{"word":"second","start":2.0,"end":2.5},{"word":"line.","start":2.5,"end":2.8},
{"word":"And","start":3.4,"end":3.6},{"word":"the","start":3.6,"end":3.8},{"word":"last","start":3.8,"end":4.2},{"word":"line.","start":4.2,"end":4.8}]}
J
node "$S/collage-voice/scripts/voice-json.mjs" voice/transcript.json --audio voice/voice.mp3 --script script/script.txt --out voice/voice | grep -q "100% matched" || fail "voice-json"; ok "voice-json (STT alignment)"

# scenes: 01 = local cut-out of a square on sky; 02 = a simulated layer decomposition
ffmpeg -loglevel error -f lavfi -i "color=c=0x8fb4bf:s=1080x1920" -f lavfi -i "color=c=0xe9d88f:s=300x300" -filter_complex "[0][1]overlay=390:500" -frames:v 1 scenes/01.png
node "$S/collage-scenes/scripts/cutout.mjs" scenes/01.png --name sun --box 300,400,500,500 | grep -Eq "(29[6-9]|30[0-4])×(29[6-9]|30[0-4])" || fail "cutout size"; ok "cutout"
node "$S/collage-scenes/scripts/cutout.mjs" scenes/01.png --plate >/dev/null && test -s scenes/layers/01/base.png || fail "plate"; ok "plate"
mkdir -p scenes/layers/02
ffmpeg -loglevel error -f lavfi -i "color=c=0xd9a66b:s=1080x1920" -frames:v 1 scenes/layers/02/base.png
ffmpeg -loglevel error -f lavfi -i "color=c=black@0:s=1080x1920,format=rgba" -f lavfi -i "color=c=0x46703a:s=1080x400" -filter_complex "[0][1]overlay=0:1520" -frames:v 1 scenes/layers/02/ground.png
# like Seedream: the piece comes back cropped and at 2× its size in the scene, with no position
ffmpeg -loglevel error -f lavfi -i "testsrc=s=400x400" -frames:v 1 -pix_fmt rgba scenes/layers/02/layer_2.png
ffmpeg -loglevel error -i scenes/layers/02/base.png -i scenes/layers/02/layer_2.png -i scenes/layers/02/ground.png \
  -filter_complex "[1]scale=200:200[o];[0][o]overlay=400:300[a];[a][2]overlay=0:0" -frames:v 1 scenes/02.png
printf '{"layers":[{"file":"ground.png","name":"Clover Band"},{"file":"layer_2.png","name":"sign"}]}' > scenes/layers/02/layers.json
out=$(node "$S/collage-scenes/scripts/layers-import.mjs" scenes/layers/02)
echo "$out" | grep -q "02_clover_band" || fail "layers-import"; ok "layers-import"
echo "$out" | grep "02_sign" | grep -Eq "at (39[7-9]|40[0-3]),(29[7-9]|30[0-3]) .*×0\.(49|50|51)" || { echo "$out"; fail "layer matching (scale + position)"; }; ok "layer matching (scale + position)"
grep -q '"02":"scenes/layers/02/base.png"' scenes/manifest.js || fail "manifest"; ok "manifest"

# animate
cp "$S/collage-animate/templates/collage.html" build/piece.html
R="$S/collage-animate/scripts"
node "$R/render.mjs" build/piece.html --stills 0.5 2.2 >/dev/null && test -s build/stills/row.png || fail "stills"; ok "stills"
node "$R/render.mjs" build/piece.html build/out.mp4 --from 1 --to 2.5 --jobs 2 >/dev/null && test -s build/out.mp4 || fail "render (parallel range)"; ok "render (parallel range)"
grep -q '"tear"' build/out.events.json || fail "events"; ok "events (auto scenes)"
node "$R/score.mjs" build/out.events.json build/sfx.wav >/dev/null && test -s build/sfx.wav || fail "score"; ok "score"
bash "$R/deliver.sh" build/out.mp4 build/sfx.wav final.mp4 voice/voice.mp3 >/dev/null && test -s final.mp4 || fail "deliver"; ok "deliver"
echo "all good"
