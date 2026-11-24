# Collage Studio: reels de collage surrealista animados por Claude en código

Seis skills de Claude que convierten **una imagen de referencia y un tema** en un vídeo vertical terminado:
- Claude escribe el guion y ElevenLabs lo locuta.
- Se generan las escenas y se separan en capas.
- Cada fotograma se dibuja en código: las piezas caen y aparecen a dos fotogramas, el papel rasgado cambia de escena y los subtítulos siguen la voz palabra a palabra.

**Sin modelos de vídeo con IA.**

<p align="center"><img src="docs/demo.gif" width="240" alt="Demo de animación de collage"></p>
<p align="center"><sub>Demo del motor de animación. <a href="docs/demo.mp4">MP4 con sonido</a> · <a href="README.md">English</a></sub></p>

## El flujo

```
 referencia ──► 1 collage-style ──► style/      paleta, tipografía, ritmo, prompt de imagen
 tema ────────► 2 collage-script ─► script/     gancho + una frase por escena con su giro visual
                3 collage-voice ──► voice/      voz ElevenLabs + tiempos por palabra
                4 collage-scenes ─► scenes/     escenas generadas → fondo + una capa por pieza
                5 collage-animate ► final.mp4   animado en código, sincronizado, sonidos de papel
      ★ collage-reel ejecuta 1→5 y te pide permiso antes de cada gasto
```

| Skill | Qué hace | Coste |
|---|---|---|
| **collage-reel** | El productor: ejecuta todo, retoma proyectos a medias y pide confirmación antes de gastar | — |
| **collage-style** | Lee 1–3 referencias y escribe la biblia de estilo | Gratis |
| **collage-script** | Gancho, una frase por escena, una imagen imposible y un momento animado por frase, con datos verificados | Gratis |
| **collage-voice** | Voz con ElevenLabs v4, sincronizada por sus pausas: corte exacto por frase y palabras ancladas a las respiraciones. También sincroniza tu propia grabación | ≈ $0.01 |
| **collage-scenes** | Decide qué modelo hace cada escena, las genera y las separa en fondo + capas transparentes (Seedream Layer Decomposition) | ≈ $0.25–0.70 por escena |
| **collage-animate** | Coreografía de cada pieza, papel rasgado, subtítulos, sonido y render a MP4 | Gratis (en tu máquina) |

Todas comparten una misma [carpeta de proyecto](skills/collage-reel/references/project-format.md), así que puedes usarlas juntas o por separado.

## Instalación

```
/plugin marketplace add annderson8/collage-studio
/plugin install collage-studio@collage-studio
```
O a mano: `cp -r collage-studio/skills/* ~/.claude/skills/`.

**Requisitos**: Node ≥ 18, ffmpeg, Chrome/Edge instalado y el conector **Atlas Cloud** (para voz e imágenes). Sin Atlas puedes grabar tu voz y traer tus propias imágenes.

## Uso

```
/collage-reel
Reel de 40 segundos: ¿y si el último faraón fue un extraterrestre? Usa el estilo de estas imágenes.
[adjunta 1–3 referencias]
```
Claude te enseña el estilo y el guion (lo apruebas), luego el precio de la voz y las escenas (lo apruebas), después las escenas generadas (las apruebas) y te entrega `final.mp4` con lo que se gastó.

Los guiones y la voz salen en inglés por defecto; puedes pedir otro idioma en cada vídeo.

## Límites
- Claude ve los fotogramas pero no oye el audio: escúchalo antes de publicar.
- Un reel de 40 s cuesta unos $3–6 en Atlas Cloud. Cada precio se muestra y se confirma antes.

## Licencia
[MIT](LICENSE) © 2026 Annderson Rey
