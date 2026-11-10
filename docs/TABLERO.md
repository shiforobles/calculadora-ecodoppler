# Tablero — quién está tocando qué

Única fuente de verdad del estado del proyecto. Lo actualiza cada IA al tomar y
al terminar una tarea (ver `AGENTS.md`).

Última actualización: 10/11/2026 09:50 · Claude (chat 03 · Seguridad) ·
`main` publicado en https://shiforobles.github.io/calculadora-ecodoppler/

## Implementando ahora

Nadie. (Regla: un solo asistente implementando a la vez.)

## Trabajo existente fuera de `main` (sin terminar)

| Tarea | Responsable | Rama / PR | Estado | Pruebas | Próximo paso |
|---|---|---|---|---|---|
| Impresión PDF y ayudas visuales de carga | Codex | `codex/imprimir-pdf` · PR #1 (borrador) | 4 commits del 29–30/10, sobre una base vieja: 15 commits detrás de `main` y **con conflictos**. El PR dice "no hacer merge sin aprobación" | Según el PR: 186 + 9 + 15 en verde (sobre la base vieja) | 1) **Quitar nombre y matrícula escritos en el código**: deben salir de ⚙️ (regla desde 69970cd). 2) Rebasar sobre `main` y resolver conflictos. 3) Lucas aprueba. Ojo: el texto del PR #1 en GitHub muestra la matrícula |
| MCH simplificado | Claude (chat MCH) | `feat/mch` · **PR #7 (borrador)** · c66b5a1 | Terminado y ampliado 03/11 tras la prueba de Lucas: síntesis con gradientes y presiones, relación septo/PP con espesor máximo, patrón autocompletado, aviso de espesor (¿valoraste el TSVI?), lista de control, MCH conocida en Antecedentes, frase directa/compatible/sugestivo | 79/79 en verde; informes sin MCH idénticos | Lucas prueba la vista previa; revisión independiente con Claude Code (solo lectura); con su OK, merge. Sheets solo con estudio ficticio tras rotar Apps Script |
| Módulo MCH (versión amplia) | Codex | `codex/modulo-mch` · sin PR | Reemplazada por `feat/mch` (base de trabajo) | — | Borrar la rama cuando se mergee #7 |
| Refactor: extraer pericardio del informe | Claude (chat "Refactor") | sin rama: patch en ese chat | Hecho como patch sobre 69970cd, sin commit | 83 en verde según ese chat | Subir el patch a una rama (`refactor/pericardio`), rebasar sobre `main`, revisión de Lucas, merge |
| Panel con clave (dashboard online sin publicar la planilla) | Claude (chat 03 · Seguridad) | `feat/panel-con-clave` · **PR #15** | Terminado en la rama. El panel lee los estudios del Apps Script con una clave cargada en ⚙️ (`ecodoppler_panel_key`); el script solo responde con esa clave (`crearClavePanel`, `leerPanel_`). Si no hay clave, todo sigue como antes. No toca el guardado ni el informe. La pestaña Estrés sigue con su CSV | 63/63 en verde + navegador con script ficticio (clave buena, clave mala) | Lucas aprueba el merge; después pega el código nuevo en Apps Script, crea la clave y hace **nueva implementación** (sirve como rotación). Sin probar contra Apps Script real |
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
| 08/11 | Diástole según Figura 3 ASE 2025: ruta a parámetros adicionales, ≥1 positivo, grado III por E/A, PSAP ≥35, grado I con e′ bajo y presión normal, exclusiones → "No valorable" (MAC, IM severa, EM, selector nuevo) | #13 · 2cf2ca8 | Claude (chat Diástole) | Pages desplegó 2cf2ca8 (Actions: success). 67/67 diástole, 59/59 suite con navegador. Lucas lo prueba en uso. Pendiente: narrativo de grado II dice "relajación alterada" aunque e′ sea normal |
| 03/11 | Estética v18.7: paleta verde azulada más profunda, campos más altos, barra de 11 chips pegada arriba, botonera anclada abajo con BORRAR TODO en rojo (`.btn-dock-clear`) | #9 · 412a765 | Claude (Estética) | Publicado en Pages (build 412a765). Sólo visual: informe idéntico verificado por hash, 42/42 en verde, contraste 0 bajo 4.5:1 en claro y oscuro. El PR anota 5 decisiones conservadoras, el choque previsible con `codex/imprimir-pdf` y un bug previo en `ui-aorta-display.js` (`--color-danger` no existe) |
| 31/10 | Coherencia informe–datos: el informe no se copia ni se guarda con datos de otra revisión; diálogo de conflicto visible en claro y oscuro (rama `codex/coherencia-informe-ediciones`, ya borrada) | bd8d165 (d74f28c + b1e3200) | Codex + Claude | En `main` y publicado. 02/11: `report-browser`, `report-consistency`, `eco-rapido-editing` → 40/40 en verde |
| 31/10 | Retiro de datos personales y configuración en el navegador | 69970cd | — | Publicado |
| 02/11 | Borrar todo: sin preguntar, página como recién abierta, sube arriba, cierra IT/motilidad | #2, #3 · dee019b | Claude (Coordinación) | Publicado; `tests/reset-all.test.js` |
| 02/11 | Reglas comunes (`AGENTS.md`) y este tablero | #4 · e35a007 | Claude (Coordinación) | Publicado (e35a007 en Pages) |
| 02/11 | Reglas ampliadas (límites, borradores WIP, verificar despliegue) y estado real de las ramas | #5 | Claude (Coordinación) | ver PR |
