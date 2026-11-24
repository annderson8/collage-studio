#!/usr/bin/env bash
# deliver.sh: mux picture + sound effects (+ optional voiceover), loudness-normalise for social (-14 LUFS).
#   bash deliver.sh out.mp4 sfx.wav final.mp4 [voice.mp3] [sfx_gain=0.5]
# With a voice, the effects sit under it at sfx_gain. Then writes final_sheet.png (a contact sheet to review).
set -euo pipefail
video=$1; sfx=$2; final=$3; voice=${4:-}; g=${5:-0.5}
enc=(-c:v libx264 -preset slow -crf 20 -maxrate 22M -bufsize 44M -pix_fmt yuv420p -c:a aac -b:a 256k -ar 48000 -movflags +faststart)
if [[ -n "$voice" ]]; then
  ffmpeg -y -loglevel error -i "$video" -i "$voice" -i "$sfx" -filter_complex \
    "[2:a]volume=${g}[s];[1:a][s]amix=inputs=2:duration=longest:normalize=0,loudnorm=I=-14:TP=-1.2:LRA=11[a]" \
    -map 0:v -map "[a]" "${enc[@]}" -shortest "$final"
else
  ffmpeg -y -loglevel error -i "$video" -i "$sfx" -map 0:v -map 1:a -af "loudnorm=I=-14:TP=-1.2:LRA=11" "${enc[@]}" -shortest "$final"
fi
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$final")
ffmpeg -y -loglevel error -i "$final" -vf "fps=36/$dur,scale=144:-1,tile=12x3" -frames:v 1 "${final%.*}_sheet.png"
echo "wrote $final and ${final%.*}_sheet.png (${dur}s)"
