# Guía de estilos — dónde vive cada cosa

Pensada para trabajar la estética por fuera y traerla de vuelta sin romper nada.
Estado al escribirla: `main` = 7166d63.

## Los dos archivos

| archivo | qué estila | líneas |
|---|---|---|
| `styles.css` | **todo** `index.html` | ~2510 |
| `eco-rapido.html` | eco focalizado, en un `<style>` propio al principio | ~190 de CSS |

No comparten hojas: son dos sistemas paralelos con la misma intención. Si
cambiás la paleta, hay que tocar los dos.

`css/voice-styles.css` es sólo el dictado por voz; casi no se ve.

## La única regla dura

**Un color no puede escribirse en el HTML.** Va en una variable del tema, o el
modo oscuro no puede tocarlo. Así fue como los antecedentes terminaron con
texto casi blanco sobre fondo casi blanco: un `style="background-color:#f0f7ff"`
inline, que le gana a `[data-theme="dark"]`.

`tests/no-inline-colors.test.js` falla si reaparece uno, y además verifica que
toda `var(--algo)` usada exista. Corrélo con `node tests/no-inline-colors.test.js`.

## Las variables

81 en `:root` (modo claro) y 61 redefinidas en `[data-theme="dark"]`.
Si agregás una variable de color, **agregala en los dos bloques**.

Grupos, por si querés repintar:

- **Marca**: `--color-primary`, `--color-primary-dark`, `--color-primary-light`,
  `--color-primary-bg`. El teal de la app.
- **Semánticas**: `--color-success|warning|error|info`, cada una con su `-bg`.
- **Neutros**: `--color-text-primary`, `--color-text-secondary`,
  `--color-text-muted`, `--color-bg-main`, `--color-bg-card`, `--color-border`.
- **Tintes de bloque**: `--tint-{neutral,info,success,danger,accent,pink,warning}`
  cada uno con `-bg`, `-border` y `-on` (el color de texto que se lee encima).
  Son los recuadros de aviso, los módulos valvulares, los callouts.
- **Gravedad**: `--sev-{normal,leve,moderado,severo}-bg` / `-fg` para rellenos,
  y `-text` para cuando la gravedad es color de texto sobre tarjeta.
- **`--on-solid`**: el color de texto que va sobre un relleno sólido. Cambia con
  el tema: en claro el relleno es profundo y el texto va blanco; en oscuro el
  relleno se aclara y el texto se invierte. Si ponés texto blanco fijo sobre un
  botón, en oscuro queda en 1.8:1.
- **`color-scheme: light` / `dark`** en los dos bloques: sin eso el navegador
  pinta la flecha de los `<select>` y las casillas en claro sobre fondo oscuro.

## Mapa del archivo

| zona | qué estila |
|---|---|
| 1–268 | variables de los dos temas |
| 269–470 | base, contenedor, encabezado, tarjetas, grillas, formularios |
| 472–526 | **campos calculados** (SC, IMC, E/A, E/e'…): son resultados, sin caja |
| 527–720 | banners, cajas plegables, módulos por válvula |
| 719–900 | presets, selector de modo del informe, badges de severidad |
| 900–1050 | botonera, **borrar todo**, **barra de deshacer** |
| 1138–1350 | dictado por voz y bull's-eye (SVG, leyenda, vista previa) |
| 1347–1875 | módulos de insuficiencia, semáforo de inputs, badges por criterio |
| 1876–2150 | atajos de gravedad, filtro de vista, pincel de grado, diálogos |
| 2150–2470 | clases que reemplazaron los colores inline: `.hint`, `.callout-*`, `.module-accent-*`, modales |
| 2474–2510 | encabezado en pantalla chica y aire al final de la página |

## Lo que no conviene tocar sin mirar

- **`.segment-number-bullseye` y `.anatomy-label`** llevan `pointer-events: none`.
  Si se las saca, los números tapan el click y los segmentos dejan de responder.
- **La paleta del bull's-eye** (`#10b981` normal, `#fbbf24` hipo, `#ef4444` aqui,
  `#a855f7` disq) es la referencia que se lee en el SVG y en la leyenda. Los
  botones del pincel usan un tono más profundo del mismo hue
  (`--grado-color-fuerte`) porque sobre el original el texto blanco no llega a
  4.5:1. Si cambiás la paleta, cambiá las dos cosas a la par.
- **`.btn-reset`** ya está en uso por el "Resetear Todo" del bull's-eye. No
  reutilizar ese nombre para otro botón: pisa el color.
- **`.btn` tiene `flex: 1`.** Cualquier botón de la fila de acciones que quiera
  otro ancho tiene que ganarle a eso explícitamente.

## Cómo verificar lo que traigas

```bash
for t in tests/*.test.js; do node "$t"; done   # 221 correctos, 0 fallidos
```

Y en el navegador, el barrido que usé: recorre todos los nodos de texto
visibles y mide contraste contra su fondo real, en los dos temas, con las
secciones ocultas forzadas a mostrarse y los botones de grado y vista forzados
a presionado. Hoy da **0 por debajo de 4.5:1** en claro y en oscuro. Un barrido
que sólo mire el estado en reposo se pierde la mitad de los problemas.

## Lo que el rediseño no puede cambiar

El texto del informe generado. Es un documento que se firma. Para comprobarlo,
cargar un estudio y comparar el texto contra estos hashes (suma simple
`h = h*31 + charCode`):

| salida | largo | hash |
|---|---|---|
| index, narrativo | 1523 | -859903573 |
| index, lista | 1538 | -475260435 |
| eco rápido | 1074 | -1312824926 |

Caso: varón 68a, 78kg/172cm, SIV/PP 13/12, DD 58, DS 42, FEy 38, LAVI 44,
E 92, A 55, e' sep 5, e' lat 7, TAPSE 15, motilidad alterada con los segmentos
1, 2, 7, 8 y 13 en hipoquinesia y 3 y 9 en aquinesia.
