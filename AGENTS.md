# Reglas para cualquier IA que trabaje en este repo

Vale para Claude (chat o Claude Code), GPT Work, Gemini o la que sea. Lucas
alterna entre varias según el crédito disponible, así que **el trabajo tiene que
poder seguirlo otra IA sin leer tu chat**.

## 1. Antes de empezar

1. Partí de la última versión de GitHub: `git pull` (o clonar de cero). Nunca
   trabajes sobre una copia vieja ni sobre una carpeta de iCloud.
2. Leé `docs/TABLERO.md`. Si la sección que vas a tocar figura tomada, no la
   toques: avisá a Lucas.
3. Anotá en el tablero qué sección tomás, con tu nombre (ej. "GPT Work").

## 2. Mientras trabajás

- Una tarea = una rama (`fix/...`, `feat/...`, `estetica/...`).
- No cambies el texto del informe sin que sea el objetivo de la tarea.
- Ningún color escrito en el HTML: va en variables de `styles.css`
  (ver `GUIA-ESTILOS.md`).
- Si cambiás un `.js` o `.css`, subí su `?v=` en `index.html`.
- Nunca subas datos de pacientes, URLs de planillas, claves ni matrículas.
- Sin sistema de build ni frameworks nuevos.

## 3. Al terminar

1. Correr todas las pruebas: `node --test tests/*.test.js` (tienen que pasar todas).
2. Commit, push de la rama, PR.
3. Con todo en verde, **mergear vos el PR** (squash): Lucas lo pidió así.
   Esperar que GitHub Pages publique y avisarle que recargue con Cmd+Shift+R.
4. Actualizar `docs/TABLERO.md`: liberar la sección y anotar qué quedó hecho.

## 4. Si te quedás sin crédito a mitad de una tarea

No dejes nada solo en tu chat ni sin commit. Subí la rama tal como esté, con un
commit `wip: ...`, y anotá en el tablero, en esa fila: **qué falta y por dónde
seguir**. Así la próxima IA retoma desde GitHub.
