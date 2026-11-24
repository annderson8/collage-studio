// CUSTOM_SCENES used for the Alan Turing reel. Paste into section 5a of build/piece.html (replacing `const CUSTOM_SCENES = null;`).
// Piece keys (01_layer_8 …) come from scenes/manifest.js after layers-import.mjs; yours will differ if you regenerate the scenes.

// Alan Turing · 6 scenes on the voice cues. The red circle (continuity device) always pops first, never drops
// through the caption band. Heroes land on their key word: at = word − start − dur·hit.
const SCENES_START = [0, cue(1, 3.27) - .05, cue(2, 9.58) - .05, cue(3, 14.4) - .05, cue(4, 18.56) - .05, cue(5, 23.04) - .05];
const W_ = (sc, word, dur, hit) => +(word - SCENES_START[sc] - dur * hit).toFixed(2);
const CUSTOM_SCENES = [
  // 1 · "¿Sabías que tu teléfono nació en una hoja de papel?" — circle, paper stem grows, phone lands on "teléfono"
  { id: '01', start: 0, bg: '01', layers: [
    { a: '01_layer_4', in: { type: 'fade', at: .25, dur: .5 } },
    { a: '01_layer_1', in: { type: 'pop', at: 0, dur: .5 }, idle: { bob: 4, period: 3.6 } },
    { a: '01_layer_3', in: { type: 'fade', at: .35, dur: .5 } },
    { a: '01_layer_2', in: { type: 'rise', at: .25, dur: .6 } },
    { a: '01_layer_7', in: { type: 'pop', at: 1.6, dur: .4 } },
    { a: '01_layer_8', in: { type: 'drop', at: W_(0, .88, .8, .36), dur: .8 }, idle: { bob: 5, period: 2.8 } },
  ] },
  // 2 · "En 1936, Alan Turing imaginó una máquina hecha de una cinta y unas pocas reglas."
  { id: '02', start: SCENES_START[1], bg: '02', layers: [
    { a: '02_layer_1', in: { type: 'pop', at: .05, dur: .5 }, idle: { bob: 4, period: 3.6 } },
    { a: '02_layer_7', in: { type: 'rise', at: .3, dur: .65 } },
    { a: '02_layer_10', in: { type: 'drop', at: W_(1, 5.28, .9, .36), dur: .9 }, idle: { bob: 6, period: 2.4 } },
    { a: '02_layer_6', in: { type: 'pop', at: W_(1, 5.28, .9, .36) + .5, dur: .4 } },
    { a: '02_layer_9', in: { type: 'slideL', at: W_(1, 7.44, .65, 1), dur: .65 }, idle: { bob: 3, period: 2 } },
    { a: '02_layer_3', in: { type: 'pop', at: W_(1, 8.72, .4, .25), dur: .4 } },
    { a: '02_layer_4', in: { type: 'pop', at: W_(1, 8.72, .4, .25) + .12, dur: .4 } },
    { a: '02_layer_8', in: { type: 'pop', at: W_(1, 8.72, .4, .25) + .24, dur: .4 } },
  ] },
  // 3 · "En la guerra, sus máquinas ayudaron a descifrar Enigma, el código secreto nazi." — keys burst out on "descifrar"
  { id: '03', start: SCENES_START[2], bg: '03', layers: [
    { a: '03_layer_2', in: { type: 'pop', at: .5, dur: .4 } },
    { a: '03_layer_3', in: { type: 'pop', at: .6, dur: .4 } },
    { a: '03_layer_4', in: { type: 'pop', at: .7, dur: .4 } },
    { a: '03_layer_1', in: { type: 'pop', at: .05, dur: .5 }, idle: { bob: 4, period: 3.6 } },
    { a: '03_layer_5', in: { type: 'fade', at: W_(2, 10.6, .9, .36) + .3, dur: .3 } },
    { a: '03_layer_8', in: { type: 'fade', at: W_(2, 10.6, .9, .36) + .3, dur: .3 } },
    { a: '03_layer_6', in: { type: 'fade', at: W_(2, 10.6, .9, .36) + .3, dur: .3 } },
    { a: '03_layer_7', in: { type: 'drop', at: W_(2, 10.6, .9, .36), dur: .9 } },
    { a: '03_layer_9', in: { type: 'rise', at: W_(2, 11.52, .7, 0), dur: .7 }, idle: { bob: 10, sway: .02, period: 2.2 } },
  ] },
  // 4 · "Después se hizo una pregunta enorme: ¿puede pensar una máquina?" — gear face on "pensar", gears float up on "máquina"
  { id: '04', start: SCENES_START[3], bg: '04', layers: [
    { a: '04_layer_3', in: { type: 'pop', at: .6, dur: .4 } },
    { a: '04_layer_6', in: { type: 'pop', at: .7, dur: .4 } },
    { a: '04_layer_2', in: { type: 'pop', at: .78, dur: .4 } },
    { a: '04_layer_4', in: { type: 'pop', at: .86, dur: .4 } },
    { a: '04_layer_9', in: { type: 'fade', at: .4, dur: .6 } },
    { a: '04_layer_1', in: { type: 'pop', at: .05, dur: .5 }, idle: { bob: 4, period: 3.6 } },
    { a: '04_layer_15', in: { type: 'pop', at: W_(3, 17.12, .55, .25), dur: .55 }, idle: { sway: .03, period: 1.2 } },
    { a: '04_layer_10', in: { type: 'rise', at: W_(3, 17.72, .6, 0) - .3, dur: .6 }, idle: { bob: 6, sway: .08, period: 2.1 } },
    { a: '04_layer_11', in: { type: 'rise', at: W_(3, 17.72, .6, 0) - .15, dur: .6 }, idle: { bob: 7, sway: .08, period: 2.5 } },
    { a: '04_layer_12', in: { type: 'rise', at: W_(3, 17.72, .6, 0), dur: .6 }, idle: { bob: 6, sway: .08, period: 2.3 } },
    { a: '04_layer_13', in: { type: 'rise', at: W_(3, 17.72, .6, 0) + .15, dur: .6 }, idle: { bob: 8, sway: .08, period: 2.7 } },
    { a: '04_layer_14', in: { type: 'rise', at: .2, dur: .7 } },
  ] },
  // 5 · "Su país lo condenó por ser homosexual. Murió con solo 41 años." — slower: rain, the lily falls on "Murió"
  { id: '05', start: SCENES_START[4], bg: '05', layers: [
    { a: '05_layer_3', in: { type: 'fade', at: .8, dur: .5 } },
    { a: '05_layer_4', in: { type: 'fade', at: .9, dur: .5 } },
    { a: '05_layer_5', in: { type: 'fade', at: .3, dur: .8 } },
    { a: '05_layer_1', in: { type: 'pop', at: .05, dur: .6 }, idle: { bob: 3, period: 4.2 } },
    { a: '05_layer_6', in: { type: 'rise', at: .25, dur: .8 } },
    { a: '05_layer_2', in: { type: 'slideR', at: W_(4, 19.2, .9, 1), dur: .9 }, idle: { bob: 4, period: 3.8 } },
    { a: '05_layer_7', in: { type: 'drop', at: W_(4, 19.2, .9, 0) + .3, dur: 1.2 }, idle: { bob: 5, period: 1.1 } },
    { a: '05_layer_8', in: { type: 'drop', at: W_(4, 20.96, 1, .36), dur: 1 } },
  ] },
  // 6 · "Hoy, cada pantalla que tocas sigue sus reglas." — TV lands on "pantalla", the hand reaches in on "tocas"
  { id: '06', start: SCENES_START[5], bg: '06', layers: [
    { a: '06_layer_2', in: { type: 'pop', at: W_(5, 25.48, .4, .25), dur: .4 } },
    { a: '06_layer_5', in: { type: 'pop', at: W_(5, 25.48, .4, .25) + .12, dur: .4 } },
    { a: '06_layer_7', in: { type: 'pop', at: W_(5, 25.48, .4, .25) + .24, dur: .4 } },
    { a: '06_layer_6', in: { type: 'pop', at: W_(5, 25.48, .4, .25) + .24, dur: .4 } },
    { a: '06_layer_8', in: { type: 'fade', at: .3, dur: .6 } },
    { a: '06_layer_1', in: { type: 'pop', at: .05, dur: .5 }, idle: { bob: 4, period: 3.6 } },
    { a: '06_layer_10', in: { type: 'drop', at: W_(5, 23.84, .8, .36), dur: .8 } },
    { a: '06_layer_9', in: { type: 'swing', at: W_(5, 24.52, .9, 0) + .35, dur: .9 }, idle: { sway: .03, period: 2.4 } },
    { a: '06_layer_11', in: { type: 'slideR', at: W_(5, 24.52, .6, 1), dur: .6 } },
  ] },
];
