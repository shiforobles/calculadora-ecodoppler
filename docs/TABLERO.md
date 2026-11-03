# Tablero — quién está tocando qué

Única fuente de verdad del estado del proyecto. Lo actualiza cada IA al tomar y
al terminar una tarea (ver `AGENTS.md`).

Última actualización: 03/11/2026 00:05 · Claude (Estética v18.7) ·
`main` publicado en https://shiforobles.github.io/calculadora-ecodoppler/

## Implementando ahora

Nadie. (Regla: un solo asistente implementando a la vez.)

| Tarea | Responsable | Rama / PR | Estado |
|---|---|---|---|
| Estética v18.7 | Claude (Estética) | `estetica/v18.7` · **PR #9** | Terminado, esperando que Lucas lo pruebe. Sólo visual: informe idéntico verificado por hash, 42/42 en verde, contraste 0 bajo 4.5:1 en ambos temas. El PR anota 5 decisiones conservadoras y un bug previo en `ui-aorta-display.js` (`--color-danger` no existe) |

## Trabajo existente fuera de `main` (sin terminar)

| Tarea | Responsable | Rama / PR | Estado | Pruebas | Próximo paso |
|---|---|---|---|---|---|
| Impresión PDF y ayudas visuales de carga | Codex | `codex/imprimir-pdf` · PR #1 (borrador) | 4 commits del 29–30/10, sobre una base vieja: 15 commits detrás de `main` y **con conflictos**. El PR dice "no hacer merge sin aprobación" | Según el PR: 186 + 9 + 15 en verde (sobre la base vieja) | 1) **Quitar nombre y matrícula escritos en el código**: deben salir de ⚙️ (regla desde 69970cd). 2) Rebasar sobre `main` y resolver conflictos. 3) Lucas aprueba. Ojo: el texto del PR #1 en GitHub muestra la matrícula |
| MCH simplificado | Claude (chat MCH) | `feat/mch` · **PR #7 (borrador)** | Terminado: 9 campos, frase diagnóstica, presión de AI automática por mayoría, guardado en Sheets. Incluye `main` (Borrar todo/Deshacer) | 73/73 en verde; 6 informes sin MCH idénticos | **Lucas prueba la vista previa** (link en el PR) y da el OK; recién ahí merge. Probar Sheets solo con estudio ficticio tras rotar Apps Script |
| Módulo MCH (versión amplia) | Codex | `codex/modulo-mch` · sin PR | Reemplazada por `feat/mch` (base de trabajo) | — | Borrar la rama cuando se mergee #7 |
| Refactor: extraer pericardio del informe | Claude (chat "Refactor") | sin rama: patch en ese chat | Hecho como patch sobre 69970cd, sin commit | 83 en verde según ese chat | Subir el patch a una rama (`refactor/pericardio`), rebasar sobre `main`, revisión de Lucas, merge |
| Seguridad: planilla e historial Git | Lucas | — | Pendiente | — | Despublicar la planilla y rotar Apps Script (`docs/CONFIGURACION-PRIVADA.md`); después limpiar historial. Sin force-push sin OK de Lucas |

## Decisiones pendientes de Lucas

0. MCH: probar la vista previa de PR #7 y aprobar el merge.
1. ~~MCH: ¿seguir la rama de Codex o el plan de Claude?~~ Resuelto 02/11: rama de Codex recortada, especificación aprobada en el chat MCH.
2. Impresión PDF: ¿qué datos van en el membrete y de dónde salen? (hoy, escritos en el código).
3. AI (Lanús): entre 41 y 42 ml/m² la calculadora Lanús y el informe usan límites distintos para leve/moderada (lo detectó Codex). Es un criterio clínico: decide Lucas.

## Orden previsto del refactor

pericardio → septum → aurícula izquierda → cavidades derechas/IT → prótesis →
aórtica → mitral → VI/diástole (después de MCH).

## Hecho y publicado

| Fecha | Qué | Commit / PR | Quién | Verificado |
|---|---|---|---|---|
| 31/10 | Coherencia informe–datos: el informe no se copia ni se guarda con datos de otra revisión; diálogo de conflicto visible en claro y oscuro (rama `codex/coherencia-informe-ediciones`, ya borrada) | bd8d165 (d74f28c + b1e3200) | Codex + Claude | En `main` y publicado. 02/11: `report-browser`, `report-consistency`, `eco-rapido-editing` → 40/40 en verde |
| 31/10 | Retiro de datos personales y configuración en el navegador | 69970cd | — | Publicado |
| 02/11 | Borrar todo: sin preguntar, página como recién abierta, sube arriba, cierra IT/motilidad | #2, #3 · dee019b | Claude (Coordinación) | Publicado; `tests/reset-all.test.js` |
| 02/11 | Reglas comunes (`AGENTS.md`) y este tablero | #4 · e35a007 | Claude (Coordinación) | Publicado (e35a007 en Pages) |
| 02/11 | Reglas ampliadas (límites, borradores WIP, verificar despliegue) y estado real de las ramas | #5 | Claude (Coordinación) | ver PR |
