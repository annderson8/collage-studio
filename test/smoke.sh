#!/usr/bin/env bash
# End-to-end smoke test: every script runs, every output exists. Needs Chrome/Edge + ffmpeg + `npm install`.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd); K=$ROOT/skills/motion-studio
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT; cd "$T"
cp -r "$K/scripts/." . && cp "$K/templates/collage.html" piece.html && ln -s "$ROOT/node_modules" node_modules
ok() { echo "✓ $1"; }
fail() { echo "✗ $1"; exit 1; }

node render.mjs --check >/dev/null || fail "environment (run: node render.mjs --check)"; ok "environment"

# voiceover: three tone "phrases" separated by silence → 3 cues
ffmpeg -loglevel error -f lavfi -i "sine=f=220:d=1.2" -f lavfi -i "anullsrc=r=48000:cl=mono" -f lavfi -i "sine=f=260:d=1" -f lavfi -i "sine=f=300:d=1.4" \
  -filter_complex "[1]atrim=0:0.6[s1];[1]atrim=0:0.6[s2];[0][s1][2][s2][3]concat=n=5:v=0:a=1" voice.wav
printf "One line here.\nA second line.\nAnd the last line.\n" > script.txt
node voice-sync.mjs voice.wav --script script.txt | grep -q "3 phrases" || fail "voice-sync"; ok "voice-sync (3 phrases)"

# cut-out: a yellow square on blue → piece + plate
ffmpeg -loglevel error -f lavfi -i "color=c=0x8fb4bf:s=1080x1920" -f lavfi -i "color=c=0xe9d88f:s=300x300" -filter_complex "[0][1]overlay=390:500" -frames:v 1 scene.png
node cutout.mjs scene.png --name sun --box 300,400,500,500 | grep -Eq "(29[6-9]|30[0-4])×(29[6-9]|30[0-4])" || fail "cutout size"; ok "cutout"
node cutout.mjs scene.png --plate >/dev/null && test -s cutouts/scene_plate.png || fail "plate"; ok "plate"
rm -rf cutouts   # keep the template on its demo pieces

node render.mjs piece.html --stills 0.5 4 >/dev/null && test -s stills/row.png || fail "stills"; ok "stills"
node render.mjs piece.html out.mp4 --from 2.8 --to 4 --jobs 2 >/dev/null && test -s out.mp4 && test -s out.events.json || fail "render (parallel range)"; ok "render (parallel range)"
node score.mjs out.events.json sfx.wav >/dev/null && test -s sfx.wav || fail "score"; ok "score"
bash deliver.sh out.mp4 sfx.wav final.mp4 voice.wav >/dev/null && test -s final.mp4 || fail "deliver"; ok "deliver"
echo "all good"
